import { Component, inject, OnInit } from '@angular/core';
import { PrioriteLibellePipe, StatutLibellePipe } from '../../../shared/pipes/libelles';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AdminReclamationService } from '../../../services/admin-reclamation.service';
import { LocationMapComponent } from '../../../shared/location-map/location-map';
import { CommentairesReclamationComponent } from '../../../shared/commentaires-reclamation/commentaires-reclamation';
import { InterventionsReclamationComponent } from '../../../shared/interventions-reclamation/interventions-reclamation';
import Swal from 'sweetalert2';
import { estMessageSysteme as estSysteme } from '../../../shared/historique.util';

@Component({
  selector: 'app-reclamation-detail',
  standalone: true,
  imports: [PrioriteLibellePipe, StatutLibellePipe, CommonModule, RouterModule, FormsModule, LocationMapComponent, CommentairesReclamationComponent, InterventionsReclamationComponent],
  templateUrl: './reclamation-detail.html',
  styleUrl: './reclamation-detail.css'
})
export class ReclamationDetailComponent implements OnInit {

  private route   = inject(ActivatedRoute);
  private router  = inject(Router);
  private service = inject(AdminReclamationService);

  reclamation: any = null;
  historique: any[] = [];
  agents: any[] = [];
  agentAssigne: any = null;
  loading = true;
  agentSelectionne: number | null = null;

  ngOnInit() {
    // On suit le paramètre d'URL : cliquer sur une notification d'une AUTRE réclamation
    // depuis cette même page doit recharger le dossier (le composant est réutilisé).
    this.route.paramMap.subscribe(params => {
      const id = Number(params.get('id'));
      this.loading = true;
      this.chargerReclamation(id);
      this.chargerHistorique(id);
      this.chargerAgents();
      this.chargerAgentAssigne(id);
    });
  }

  chargerReclamation(id: number) {
    this.service.getById(id).subscribe({
      next: (data: any) => {
        this.reclamation = data;
        this.loading = false;
         this.chargerAgentAssigne(id);
      },
      error: () => {
        this.loading = false;
        Swal.fire('Erreur', 'Réclamation introuvable.', 'error');
        this.router.navigate(['/admin/reclamations']);
      }
    });
  }

  chargerHistorique(id: number) {
    this.service.getHistorique(id).subscribe({
      next: (data: any[]) => this.historique = data,
      error: () => {}
    });
  }

chargerAgents() {
  this.service.getAgents().subscribe({
    next: (data: any[]) => {
      this.agents = data;
    },
    error: (err: any) => {
      console.error('Erreur chargement agents :', err);
      Swal.fire('Erreur', 'Impossible de charger les agents.', 'error');
    }
  });

}

  /** Vrai pour un texte écrit par le système (le mot « Motif » ne s'applique qu'aux textes saisis). */
  estMessageSysteme(texte: string): boolean {
    return estSysteme(texte);
  }

  /** Un dossier est clos quand il est résolu, rejeté, annulé ou fermé. */
  get dossierClos(): boolean {
    return ['RESOLUE', 'REJETEE', 'ANNULEE', 'FERMEE'].includes(this.reclamation?.statut);
  }

  /**
   * Appelée quand la dernière intervention active est terminée.
   * On PROPOSE de résoudre la réclamation (pas de changement automatique :
   * il peut falloir une nouvelle intervention).
   */
  proposerResolution() {
    if (this.reclamation?.statut !== 'EN_COURS') return;

    Swal.fire({
      title: 'Intervention terminée',
      text: 'Il ne reste plus d\'intervention en cours. Marquer la réclamation comme résolue ?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Oui, marquer comme résolue',
      cancelButtonText: 'Pas maintenant',
      confirmButtonColor: '#0e6b45'
    }).then(result => {
      if (!result.isConfirmed) return;
      this.service.changerStatut(
        this.reclamation.id, 'RESOLUE', 'Résolue à la fin des interventions.'
      ).subscribe({
        next: () => {
          Swal.fire({ title: 'Réclamation résolue', icon: 'success', confirmButtonColor: '#0e6b45' });
          this.chargerReclamation(this.reclamation.id);
          this.chargerHistorique(this.reclamation.id);
        },
        error: (err: any) => Swal.fire('Erreur', err.error?.message || 'Impossible de résoudre la réclamation.', 'error')
      });
    });
  }

  // ---- Changer le statut ----
  changerStatut() {
    Swal.fire({
      title: 'Changer le statut',
      input: 'select',
      inputOptions: {
        'EN_COURS': '🔄 En cours',
        'RESOLUE':  '✅ Résolue',
        'REJETEE':  '❌ Rejetée'
      },
      inputPlaceholder: 'Choisir un nouveau statut',
      showCancelButton: true,
      confirmButtonText: 'Confirmer',
      cancelButtonText: 'Annuler',
      confirmButtonColor: '#0e6b45',
      inputValidator: (value) => {
        if (!value) return 'Veuillez choisir un statut';
        return null;
      }
    }).then(result => {
      if (!result.isConfirmed || !result.value) return;

      // Un rejet doit toujours être expliqué au citoyen : on demande le motif.
      if (result.value === 'REJETEE') {
        Swal.fire({
          title: 'Motif du rejet',
          input: 'textarea',
          inputPlaceholder: 'Expliquez au citoyen pourquoi sa réclamation est rejetée...',
          showCancelButton: true,
          confirmButtonText: 'Rejeter',
          cancelButtonText: 'Annuler',
          confirmButtonColor: '#dc2626',
          inputValidator: (motif) => (!motif || !motif.trim()) ? 'Le motif est obligatoire' : null
        }).then(r2 => {
          if (r2.isConfirmed && r2.value) this.envoyerChangementStatut('REJETEE', r2.value.trim());
        });
      } else {
        this.envoyerChangementStatut(result.value);
      }
    });
  }

  private envoyerChangementStatut(statut: string, commentaire?: string) {
    this.service.changerStatut(this.reclamation.id, statut, commentaire).subscribe({
      next: () => {
        Swal.fire({ title: 'Succès !', text: 'Statut mis à jour.', icon: 'success', confirmButtonColor: '#0e6b45' });
        this.chargerReclamation(this.reclamation.id);
        this.chargerHistorique(this.reclamation.id);
      },
      error: (err: any) => Swal.fire('Erreur', err.error?.message || 'Erreur.', 'error')
    });
  }

  // ---- Assigner un agent ----
  assignerAgent() {
    if (!this.agentSelectionne) {
      Swal.fire('Attention', 'Veuillez sélectionner un agent.', 'warning');
      return;
    }
    const agent = this.agents.find(a => a.id === Number(this.agentSelectionne));
    Swal.fire({
      title: 'Assigner cet agent ?',
      text: `${agent?.prenom} ${agent?.nom} sera assigné à cette réclamation.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Assigner',
      cancelButtonText: 'Annuler',
      confirmButtonColor: '#0e6b45'
    }).then(result => {
      if (result.isConfirmed) {
        this.service.assignerAgent(this.reclamation.id, Number(this.agentSelectionne)).subscribe({
          next: () => {
            Swal.fire({ title: 'Succès !', text: 'Agent assigné. Réclamation passée EN_COURS.', icon: 'success', confirmButtonColor: '#0e6b45' });
            this.chargerReclamation(this.reclamation.id);
            this.chargerHistorique(this.reclamation.id);
            this.agentSelectionne = null;
          },
          error: (err: any) => Swal.fire('Erreur', err.error?.message || 'Erreur lors de l\'assignation.', 'error')
        });
      }
    });
  }
chargerAgentAssigne(id: number) {
  this.service.getAgentAssigne(id).subscribe({
    next: (data: any) => {
      this.agentAssigne = data;
      // Pré-sélectionner l'agent dans le select s'il existe
      if (data?.id) {
        this.agentSelectionne = data.id;
      }
    },
    error: () => {}
  });
}

  retour() {
    this.router.navigate(['/admin/reclamations']);
  }

  // ---- Badges ----
  getPrioriteBadge(p: string): string {
    const map: Record<string, string> = {
      'CRITIQUE': 'bg-red-100 text-red-700 border border-red-200',
      'HAUTE':    'bg-orange-100 text-orange-700 border border-orange-200',
      'MOYENNE':  'bg-yellow-100 text-yellow-700 border border-yellow-200',
      'BASSE':    'bg-green-100 text-green-700 border border-green-200'
    };
    return map[p] ?? 'bg-gray-100 text-gray-600';
  }

  getStatutBadge(s: string): string {
    const map: Record<string, string> = {
      'OUVERTE':  'bg-blue-100 text-blue-700 border border-blue-200',
      'EN_COURS': 'bg-orange-100 text-orange-700 border border-orange-200',
      'RESOLUE':  'bg-green-100 text-green-700 border border-green-200',
      'REJETEE':  'bg-red-100 text-red-700 border border-red-200',
      'ANNULEE':  'bg-gray-100 text-gray-500 border border-gray-200'
    };
    return map[s] ?? 'bg-gray-100 text-gray-600';
  }

  getScoreColor(score: number): string {
    if (score >= 0.8) return 'bg-red-500';
    if (score >= 0.5) return 'bg-orange-400';
    return 'bg-green-400';
  }
ouvrirImage(url: string) {
  Swal.fire({
    imageUrl: url,
    imageAlt: 'Photo de la réclamation',
    imageWidth: '100%',
    showConfirmButton: false,
    showCloseButton: true,
    width: '80%',
    padding: '1rem'
  });
}
}
