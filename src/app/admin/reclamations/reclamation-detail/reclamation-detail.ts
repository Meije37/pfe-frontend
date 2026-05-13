import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AdminReclamationService } from '../../../services/admin-reclamation.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-reclamation-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
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
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.chargerReclamation(id);
    this.chargerHistorique(id);
    this.chargerAgents();
     this.chargerAgentAssigne(id);
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
      confirmButtonColor: '#1d4ed8',
      inputValidator: (value) => {
        if (!value) return 'Veuillez choisir un statut';
        return null;
      }
    }).then(result => {
      if (result.isConfirmed && result.value) {
        this.service.changerStatut(this.reclamation.id, result.value).subscribe({
          next: () => {
            Swal.fire({ title: 'Succès !', text: 'Statut mis à jour.', icon: 'success', confirmButtonColor: '#1d4ed8' });
            this.chargerReclamation(this.reclamation.id);
            this.chargerHistorique(this.reclamation.id);
          },
          error: (err: any) => Swal.fire('Erreur', err.error?.message || 'Erreur.', 'error')
        });
      }
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
      confirmButtonColor: '#1d4ed8'
    }).then(result => {
      if (result.isConfirmed) {
        this.service.assignerAgent(this.reclamation.id, Number(this.agentSelectionne)).subscribe({
          next: () => {
            Swal.fire({ title: 'Succès !', text: 'Agent assigné. Réclamation passée EN_COURS.', icon: 'success', confirmButtonColor: '#1d4ed8' });
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
