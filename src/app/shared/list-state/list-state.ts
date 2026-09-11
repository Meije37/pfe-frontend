import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * État "vide" ou "erreur réseau" centralisé, à utiliser sur toutes les listes
 * admin/agent (zones, services, catégories, utilisateurs, réclamations...).
 *
 * Avant ce composant, chaque liste gérait ses erreurs au cas par cas via un
 * simple SweetAlert (un toast qui disparaît), puis retombait sur son bloc
 * "vide" habituel — ce qui donnait l'impression trompeuse qu'il n'y avait
 * juste aucune donnée, alors qu'en réalité l'appel réseau avait échoué.
 *
 * Usage typique dans un composant de liste :
 *   erreur = false;
 *   charger() {
 *     this.loading = true;
 *     this.erreur = false;
 *     this.service.getAll().subscribe({
 *       next: (data) => { this.items = data; this.loading = false; },
 *       error: () => {
 *         this.loading = false;
 *         this.erreur = true;
 *         Swal.fire('Erreur', '...', 'error'); // toast, en plus de l'état persistant
 *       }
 *     });
 *   }
 *
 * Puis dans le template, à la place du bloc "vide" fait à la main :
 *   <app-list-state
 *     *ngIf="!loading && (erreur || items.length === 0)"
 *     [mode]="erreur ? 'error' : 'empty'"
 *     [title]="erreur ? 'Impossible de charger les données' : 'Aucun élément trouvé'"
 *     [subtitle]="erreur ? 'Vérifiez votre connexion et réessayez.' : undefined"
 *     (retry)="charger()">
 *   </app-list-state>
 */
@Component({
  selector: 'app-list-state',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './list-state.html'
})
export class ListStateComponent {
  /** 'empty' : aucune donnée (recherche/filtre sans résultat, liste vide).
   *  'error' : l'appel réseau a échoué — distinct visuellement de 'empty'. */
  @Input() mode: 'empty' | 'error' = 'empty';

  /** Classe FontAwesome de l'icône. Un défaut cohérent est déjà choisi
   *  selon le mode si non fourni. */
  @Input() icon?: string;

  @Input() title = '';
  @Input() subtitle?: string;

  /** Bouton "Réessayer", pertinent seulement en mode erreur. */
  @Input() showRetry = true;
  @Input() retryLabel = 'Réessayer';

  @Output() retry = new EventEmitter<void>();

  get iconeEffective(): string {
    if (this.icon) return this.icon;
    return this.mode === 'error' ? 'fa-solid fa-triangle-exclamation' : 'fa-solid fa-inbox';
  }
}
