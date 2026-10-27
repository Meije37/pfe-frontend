import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { PrioriteLibellePipe, StatutLibellePipe } from '../../../shared/pipes/libelles';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { AdminReclamationService } from '../../../services/admin-reclamation.service';
import Swal from 'sweetalert2';
import { PaginationComponent } from '../../../shared/pagination/pagination';
import { ListStateComponent } from '../../../shared/list-state/list-state';
import { Observable, Subscription, interval } from 'rxjs';
import { NotificationWebSocketService } from '../../../services/notification-websocket.service';
import { ColonneTri, SensTri, sensInitial, trierReclamations } from '../../../shared/tri-reclamations';

@Component({
  selector: 'app-reclamations-list',
  standalone: true,
 imports: [PrioriteLibellePipe, StatutLibellePipe, CommonModule, FormsModule, RouterModule,PaginationComponent, ListStateComponent],
  templateUrl: './reclamations-list.html',
  styleUrl: './reclamations-list.css'
})
export class ReclamationsListComponent implements OnInit, OnDestroy {
  private notificationWs = inject(NotificationWebSocketService);
  private wsSub?: Subscription;
  private sondage?: Subscription;
  private minuteur?: ReturnType<typeof setTimeout>;

  /** Réclamations apparues lors d'un rafraîchissement automatique : mises en évidence quelques secondes. */
  nouvelles = new Set<number>();


  private service = inject(AdminReclamationService);
  private route   = inject(ActivatedRoute);

  reclamations: any[] = [];
  loading = true;
  erreur = false;
  currentPage  = 1;
  itemsPerPage = 10;

  // Filtres
  filtreStatut   = '';
  filtrePriorite = '';
  triUrgence     = false;

  recherche = '';
  // Options filtres
  statuts   = ['', 'OUVERTE', 'EN_COURS', 'RESOLUE', 'REJETEE', 'ANNULEE'];
  priorites = ['', 'CRITIQUE', 'HAUTE', 'MOYENNE', 'BASSE'];

  ngOnInit() {
    // Arrivée depuis le widget "Réclamations urgentes" du dashboard
    if (this.route.snapshot.queryParamMap.get('tri') === 'urgence') {
      this.triColonne = 'score';
      this.triSens = 'desc';
      this.triUrgence = true;
    }
    this.charger();
    this.ecouterMisesAJour();
  }

  // Tri : par défaut, plus récentes d'abord. Chaque en-tête de colonne est cliquable.
  triColonne: ColonneTri = 'date';
  triSens: SensTri = 'desc';

  trier(colonne: ColonneTri) {
    if (this.triColonne === colonne) {
      this.triSens = this.triSens === 'asc' ? 'desc' : 'asc';
    } else {
      this.triColonne = colonne;
      this.triSens = sensInitial(colonne);
    }
    this.appliquerTri();
    this.currentPage = 1;
  }

  private appliquerTri() {
    this.reclamations = trierReclamations(this.reclamations, this.triColonne, this.triSens);
    // Le bouton « Urgence » correspond au tri par score décroissant.
    this.triUrgence = this.triColonne === 'score' && this.triSens === 'desc';
  }

  iconeTri(colonne: ColonneTri): string {
    if (this.triColonne !== colonne) return 'fa-sort text-gray-300';
    return this.triSens === 'asc' ? 'fa-arrow-up text-brand-600' : 'fa-arrow-down text-brand-600';
  }

  ariaTri(colonne: ColonneTri): string {
    if (this.triColonne !== colonne) return 'none';
    return this.triSens === 'asc' ? 'ascending' : 'descending';
  }

  toggleTriUrgence() {
    if (this.triUrgence) {
      this.triColonne = 'date';
      this.triSens = 'desc';
    } else {
      this.triColonne = 'score';
      this.triSens = 'desc';
    }
    this.appliquerTri();
    this.currentPage = 1;
  }

  // ---- Chargement selon filtres actifs ----
  /** Écoute les notifications (dépôt, assignation, changement de statut…) et recharge la liste. */
  private ecouterMisesAJour() {
    this.wsSub = this.notificationWs.notifications$.subscribe(notif => {
      if (notif.reclamationId) {
        clearTimeout(this.minuteur);
        // Léger délai : la notification part avant la fin de l'enregistrement côté serveur.
        this.minuteur = setTimeout(() => this.charger(true), 500);
      }
    });
    // Filet de sécurité si le WebSocket est coupé : rafraîchissement toutes les 20 s (onglet visible).
    this.sondage = interval(20000).subscribe(() => {
      if (!document.hidden) this.charger(true);
    });
  }

  ngOnDestroy() {
    this.wsSub?.unsubscribe();
    this.sondage?.unsubscribe();
    clearTimeout(this.minuteur);
  }

  suivre(_index: number, r: any): number {
    return r.id;
  }

  /** Met en évidence (8 s) les réclamations qui n'étaient pas dans la liste avant le rafraîchissement. */
  private signalerNouvelles(avant: Set<number>) {
    if (avant.size === 0) return;
    const ajoutees = this.reclamations.filter(r => !avant.has(r.id)).map(r => r.id);
    if (ajoutees.length === 0) return;
    ajoutees.forEach(id => this.nouvelles.add(id));
    setTimeout(() => ajoutees.forEach(id => this.nouvelles.delete(id)), 8000);
  }

  /** @param silencieux true = rafraîchissement automatique : pas d'écran de chargement ni de pop-up d'erreur. */
  charger(silencieux = false) {
    if (!silencieux) {
      this.loading = true;
      this.erreur = false;
    }

    let obs;
    if (this.filtreStatut) {
      obs = this.service.getParStatut(this.filtreStatut);
    } else if (this.filtrePriorite) {
      obs = this.service.getParPriorite(this.filtrePriorite);
    } else {
      obs = this.service.getAll();
    }

    obs.subscribe({
      next: (data) => {
        const avant = new Set<number>(this.reclamations.map(r => r.id));
        this.reclamations = data;
        this.appliquerTri();
        this.loading = false;
        if (silencieux) this.signalerNouvelles(avant);
      },
      error: () => {
        this.loading = false;
        if (silencieux) return; // pas de pop-up toutes les 20 s si le réseau coupe
        this.erreur = true;
        Swal.fire('Erreur', 'Impossible de charger les réclamations.', 'error');
      }
    });
  }

  // ---- Réinitialiser les filtres ----
  reinitialiser() {
    this.filtreStatut   = '';
    this.filtrePriorite = '';
    this.charger();
  }

  // ---- Changer le statut d'une réclamation ----
  changerStatut(rec: any) {
    if (rec.statut === 'RESOLUE') {
      return; // Sécurité supplémentaire : le bouton est déjà désactivé dans le template
    }
    Swal.fire({
      title: 'Changer le statut',
      html: `<p class="text-sm text-gray-500 mb-2">Réclamation : <strong>${rec.reference}</strong></p>`,
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
            if (r2.isConfirmed && r2.value) this.envoyerChangementStatut(rec.id, 'REJETEE', r2.value.trim());
          });
        } else {
          this.envoyerChangementStatut(rec.id, result.value);
        }
      });
    }

    private envoyerChangementStatut(id: number, statut: string, commentaire?: string) {
      this.service.changerStatut(id, statut, commentaire).subscribe({
        next: () => {
          Swal.fire({
            title: 'Succès !',
            text: 'Statut mis à jour avec succès.',
            icon: 'success',
            confirmButtonColor: '#0e6b45'
          });
          this.charger();
        },
        error: (err) => {
          Swal.fire('Erreur', err.error?.message || 'Erreur lors de la mise à jour.', 'error');
        }
      });
    }

  // ---- Badges couleur priorité ----
  getPrioriteBadge(priorite: string): string {
    const map: Record<string, string> = {
      'CRITIQUE': 'bg-red-100 text-red-700 border border-red-200',
      'HAUTE':    'bg-orange-100 text-orange-700 border border-orange-200',
      'MOYENNE':  'bg-yellow-100 text-yellow-700 border border-yellow-200',
      'BASSE':    'bg-green-100 text-green-700 border border-green-200'
    };
    return map[priorite] ?? 'bg-gray-100 text-gray-600';
  }

  // ---- Badges couleur statut ----
  getStatutBadge(statut: string): string {
    const map: Record<string, string> = {
      'OUVERTE':  'bg-blue-100 text-blue-700 border border-blue-200',
      'EN_COURS': 'bg-orange-100 text-orange-700 border border-orange-200',
      'RESOLUE':  'bg-green-100 text-green-700 border border-green-200',
      'REJETEE':  'bg-red-100 text-red-700 border border-red-200',
      'ANNULEE':  'bg-gray-100 text-gray-500 border border-gray-200'
    };
    return map[statut] ?? 'bg-gray-100 text-gray-600';
  }

  // ---- Score IA → couleur barre ----
  getScoreColor(score: number): string {
    if (score >= 0.8) return 'bg-red-500';
    if (score >= 0.5) return 'bg-orange-400';
    return 'bg-green-400';
  }

  getScoreWidth(score: number): string {
    return `${Math.round(score * 100)}%`;
  }

get reclamationsPaginees(): any[] {
  const debut = (this.currentPage - 1) * this.itemsPerPage;
  const fin   = debut + this.itemsPerPage;
  return this.reclamationsFiltrees.slice(debut, fin);
}
filtrer() {
  this.currentPage = 1;
}

onPageChange(page: number) {
  this.currentPage = page;
  // Remonter en haut du tableau
  window.scrollTo({ top: 0, behavior: 'smooth' });
}


// Ajouter ce getter
get reclamationsFiltrees(): any[] {
  let liste = this.reclamations;

  if (this.recherche.trim()) {
    const terme = this.recherche.toLowerCase().trim();
    liste = liste.filter(r =>
      r.reference?.toLowerCase().includes(terme)      ||
      r.titre?.toLowerCase().includes(terme)           ||
      r.description?.toLowerCase().includes(terme)     ||
      r.citoyen?.nom?.toLowerCase().includes(terme)    ||
      r.citoyen?.prenom?.toLowerCase().includes(terme) ||
      r.citoyen?.email?.toLowerCase().includes(terme)  ||
      r.categorie?.nom?.toLowerCase().includes(terme)  ||
      r.localisation?.ville?.toLowerCase().includes(terme) ||
      r.localisation?.quartier?.toLowerCase().includes(terme)
    );
  }

  return liste;
}
resetRecherche() {
  this.recherche = '';
  this.currentPage = 1;
}

}
