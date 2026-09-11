import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CommentaireService, CommentaireDTO } from '../../services/commentaire.service';
import Swal from 'sweetalert2';

/**
 * Fil de discussion d'une réclamation. S'utilise dans n'importe quelle page
 * détail (admin ou agent) :
 *   <app-commentaires-reclamation [reclamationId]="reclamation.id"></app-commentaires-reclamation>
 *
 * L'option "Note interne" n'est utile qu'entre agents/admin (le backend
 * force PUBLIC pour un citoyen de toute façon) — on l'affiche donc toujours
 * ici puisque ce composant n'est monté que côté admin/agent.
 */
@Component({
  selector: 'app-commentaires-reclamation',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="bg-white rounded-xl border border-gray-200 p-5">
      <h3 class="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
        <i class="fa-solid fa-comments text-gray-400"></i>
        Commentaires
        <span class="text-xs font-normal text-gray-400">({{ commentaires.length }})</span>
      </h3>

      <div class="space-y-3 max-h-96 overflow-y-auto mb-4" *ngIf="!chargement; else loadingTpl">
        <div *ngFor="let c of commentaires"
             class="p-3 rounded-lg border"
             [ngClass]="c.visibilite === 'INTERNE'
                ? 'bg-amber-50 border-amber-200'
                : (c.auteurRole === 'CITOYEN' ? 'bg-gray-50 border-gray-200' : 'bg-blue-50 border-blue-100')">
          <div class="flex items-center justify-between mb-1">
            <span class="text-xs font-semibold text-gray-700">
              {{ c.auteurNom }}
              <span class="ml-1 text-[10px] font-normal text-gray-400">({{ c.auteurRole }})</span>
            </span>
            <span *ngIf="c.visibilite === 'INTERNE'"
                  class="text-[10px] font-bold uppercase tracking-wide text-amber-600">
              Interne
            </span>
          </div>
          <p class="text-sm text-gray-700 whitespace-pre-wrap">{{ c.contenu }}</p>
          <p class="text-[11px] text-gray-400 mt-1">{{ c.dateCommentaire | date:'dd/MM/yyyy HH:mm' }}</p>
        </div>

        <p *ngIf="commentaires.length === 0" class="text-sm text-gray-400 text-center py-4">
          Aucun commentaire pour l'instant.
        </p>
      </div>
      <ng-template #loadingTpl>
        <p class="text-sm text-gray-400 py-4 text-center">Chargement...</p>
      </ng-template>

      <div class="border-t border-gray-100 pt-3">
        <textarea
          [(ngModel)]="nouveauContenu"
          rows="2"
          placeholder="Écrire un commentaire..."
          class="w-full text-sm border border-gray-200 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-100 resize-none">
        </textarea>
        <div class="flex items-center justify-between mt-2">
          <label class="flex items-center gap-2 text-xs text-gray-500 cursor-pointer">
            <input type="checkbox" [(ngModel)]="interneCoche" class="rounded" />
            Note interne (invisible pour le citoyen)
          </label>
          <button
            (click)="envoyer()"
            [disabled]="!nouveauContenu.trim() || envoiEnCours"
            class="px-4 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-blue-700 transition">
            Envoyer
          </button>
        </div>
      </div>
    </div>
  `
})
export class CommentairesReclamationComponent implements OnInit {

  @Input({ required: true }) reclamationId!: number;

  private commentaireService = inject(CommentaireService);

  commentaires: CommentaireDTO[] = [];
  chargement = true;
  nouveauContenu = '';
  interneCoche = false;
  envoiEnCours = false;

  ngOnInit() {
    this.charger();
  }

  charger() {
    this.chargement = true;
    this.commentaireService.lister(this.reclamationId).subscribe({
      next: (data) => { this.commentaires = data; this.chargement = false; },
      error: () => { this.chargement = false; }
    });
  }

  envoyer() {
    const contenu = this.nouveauContenu.trim();
    if (!contenu) return;

    this.envoiEnCours = true;
    const visibilite = this.interneCoche ? 'INTERNE' : 'PUBLIC';

    this.commentaireService.ajouter(this.reclamationId, contenu, visibilite).subscribe({
      next: (nouveau) => {
        this.commentaires = [...this.commentaires, nouveau];
        this.nouveauContenu = '';
        this.interneCoche = false;
        this.envoiEnCours = false;
      },
      error: (err) => {
        this.envoiEnCours = false;
        Swal.fire('Erreur', err.error?.message || "Impossible d'envoyer le commentaire.", 'error');
      }
    });
  }
}
