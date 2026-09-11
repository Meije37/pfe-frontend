import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { AdminReclamationService } from '../../../services/admin-reclamation.service';
import Swal from 'sweetalert2';
import { PaginationComponent } from '../../../shared/pagination/pagination';
import { ListStateComponent } from '../../../shared/list-state/list-state';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-reclamations-list',
  standalone: true,
 imports: [CommonModule, FormsModule, RouterModule,PaginationComponent, ListStateComponent],
  templateUrl: './reclamations-list.html',
  styleUrl: './reclamations-list.css'
})
export class ReclamationsListComponent implements OnInit {

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
      this.triUrgence = true;
    }
    this.charger();
  }

  toggleTriUrgence() {
    this.triUrgence = !this.triUrgence;
    this.currentPage = 1;
  }

  // ---- Chargement selon filtres actifs ----
  charger() {
    this.loading = true;
    this.erreur = false;

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
        this.reclamations = data;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
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
      confirmButtonColor: '#1d4ed8',
      inputValidator: (value) => {
        if (!value) return 'Veuillez choisir un statut';
        return null;
      }
    }).then(result => {
      if (result.isConfirmed && result.value) {
        this.service.changerStatut(rec.id, result.value).subscribe({
          next: () => {
            Swal.fire({
              title: 'Succès !',
              text: 'Statut mis à jour avec succès.',
              icon: 'success',
              confirmButtonColor: '#1d4ed8'
            });
            this.charger();
          },
          error: (err) => {
            Swal.fire('Erreur', err.error?.message || 'Erreur lors de la mise à jour.', 'error');
          }
        });
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

  if (this.triUrgence) {
    liste = [...liste].sort((a, b) => (b.scoreUrgence ?? 0) - (a.scoreUrgence ?? 0));
  }

  return liste;
}
resetRecherche() {
  this.recherche = '';
  this.currentPage = 1;
}

}
