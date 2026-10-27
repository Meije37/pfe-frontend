import { Component, ElementRef, Input, OnChanges, OnDestroy, OnInit, SimpleChanges, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CommentaireService, CommentaireDTO } from '../../services/commentaire.service';
import Swal from 'sweetalert2';
import { Subscription, interval } from 'rxjs';
import { NotificationWebSocketService } from '../../services/notification-websocket.service';

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
  host: { class: 'block' }, // sans ça, <app-...> est inline et space-y-6 du parent est ignoré
  imports: [CommonModule, FormsModule],
  template: `
    <div class="bg-white rounded-xl border border-gray-200 p-5">
      <h3 class="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
        <i class="fa-solid fa-comments text-gray-400"></i>
        Discussion
        <span class="text-xs font-normal text-gray-400">({{ commentaires.length }})</span>
      </h3>

      <button *ngIf="nbAnciens > 0" (click)="basculerAnciens()"
              class="flex items-center gap-2 text-xs font-semibold text-gray-500 hover:text-gray-800 mb-2">
        <i class="fa-solid text-[10px]" [ngClass]="anciensOuverts ? 'fa-chevron-down' : 'fa-chevron-right'"></i>
        Messages précédents ({{ nbAnciens }})
      </button>

      <div #liste class="space-y-4 max-h-96 overflow-y-auto pr-1 mb-4" *ngIf="!chargement; else loadingTpl">
        <div *ngFor="let c of affiches; trackBy: suivre" class="flex gap-3">
          <div class="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0"
               [ngClass]="avatarClasse(c.auteurRole)">
            {{ initiales(c.auteurNom) }}
          </div>
          <div class="flex-1 min-w-0 rounded-lg border px-3 py-2"
               [ngClass]="c.visibilite === 'INTERNE' ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-200'">
            <div class="flex items-center justify-between gap-2 mb-1">
              <div class="flex items-center gap-2 min-w-0 flex-wrap">
                <span class="text-sm font-semibold text-gray-800">{{ c.auteurNom }}</span>
                <span class="text-[10px] font-semibold px-1.5 py-0.5 rounded" [ngClass]="roleClasse(c.auteurRole)">
                  {{ libelleRole(c.auteurRole) }}
                </span>
                <span *ngIf="c.visibilite === 'INTERNE'"
                      class="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                  <i class="fa-solid fa-lock text-[9px]"></i> Note interne
                </span>
              </div>
              <span class="text-[11px] text-gray-400 flex-shrink-0">
                {{ c.dateCommentaire | date:'dd/MM/yyyy HH:mm' }}
              </span>
            </div>
            <p class="text-sm text-gray-700 whitespace-pre-wrap break-words">{{ c.contenu }}</p>
          </div>
        </div>

        <div *ngIf="commentaires.length === 0" class="text-center py-6 text-gray-400">
          <i class="fa-regular fa-comments text-2xl mb-2 block"></i>
          <p class="text-sm">Aucun message pour l'instant.</p>
        </div>
      </div>
      <ng-template #loadingTpl>
        <p class="text-sm text-gray-400 py-4 text-center">Chargement...</p>
      </ng-template>

      <div *ngIf="lectureSeule" class="border-t border-gray-100 pt-3 flex items-center gap-2 text-xs text-gray-500">
        <i class="fa-solid fa-lock text-[10px]"></i>
        Discussion en lecture seule : aucun nouveau message ne peut être ajouté.
      </div>

      <div *ngIf="!lectureSeule" class="border-t border-gray-100 pt-3">
        <textarea
          [(ngModel)]="nouveauContenu"
          rows="2"
          (keydown.control.enter)="envoyer()"
          placeholder="Écrire un message... (Ctrl + Entrée pour envoyer)"
          class="w-full text-sm border border-gray-200 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-brand-100 resize-none">
        </textarea>
        <div class="flex items-center justify-between mt-2">
          <label class="flex items-center gap-2 text-xs text-gray-500 cursor-pointer">
            <input type="checkbox" [(ngModel)]="interneCoche" class="rounded" />
            Note interne (invisible pour le citoyen)
          </label>
          <button
            (click)="envoyer()"
            [disabled]="!nouveauContenu.trim() || envoiEnCours"
            class="px-4 py-1.5 text-xs font-semibold rounded-lg bg-brand-600 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-brand-700 transition">
            Envoyer
          </button>
        </div>
      </div>
    </div>
  `
})
export class CommentairesReclamationComponent implements OnInit, OnChanges, OnDestroy {

  @Input({ required: true }) reclamationId!: number;

  /** Vrai (ex. réclamation rejetée) : on garde l'historique visible mais on ne peut plus écrire. */
  @Input() lectureSeule = false;

  private commentaireService = inject(CommentaireService);
  private notificationWs = inject(NotificationWebSocketService);
  private wsSub?: Subscription;
  private sondage?: Subscription;
  private minuteur?: ReturnType<typeof setTimeout>;

  @ViewChild('liste') liste?: ElementRef<HTMLElement>;

  commentaires: CommentaireDTO[] = [];
  chargement = true;
  nouveauContenu = '';
  /** Seuls les derniers messages sont visibles ; les plus anciens se déplient à la demande. */
  readonly nbRecents = 3;
  anciensOuverts = false;
  interneCoche = false;
  envoiEnCours = false;

  ngOnInit() {
    this.charger();

    // Temps réel : une notification qui concerne CE dossier (nouveau commentaire d'un
    // collègue ou du citoyen) rafraîchit la liste sans recharger la page.
    this.wsSub = this.notificationWs.notifications$.subscribe(notif => {
      if (notif.reclamationId === this.reclamationId) {
        clearTimeout(this.minuteur);
        this.minuteur = setTimeout(() => this.charger(true), 500);
      }
    });

    // Filet de sécurité : si le WebSocket est coupé, la liste se met quand même à jour
    // toutes les 20 s tant que l'onglet est visible.
    this.sondage = interval(20000).subscribe(() => {
      if (!document.hidden) this.charger(true);
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    // La page parente est réutilisée quand on passe d'une réclamation à une autre.
    if (changes['reclamationId'] && !changes['reclamationId'].firstChange) {
      this.charger();
    }
  }

  ngOnDestroy() {
    this.wsSub?.unsubscribe();
    this.sondage?.unsubscribe();
    clearTimeout(this.minuteur);
  }

  /** @param silencieux true = rafraîchissement en arrière-plan, sans afficher « Chargement… » */
  charger(silencieux = false) {
    if (!silencieux) this.chargement = true;
    this.commentaireService.lister(this.reclamationId).subscribe({
      next: (data) => {
        // On ne ramène en bas que s'il y a du nouveau (ou au premier chargement) :
        // un rafraîchissement silencieux ne doit pas faire sauter la lecture en cours.
        const aDuNouveau = data.length > this.commentaires.length;
        this.commentaires = data;
        this.chargement = false;
        if (aDuNouveau) this.defilerVersLeBas();
      },
      error: () => { this.chargement = false; }
    });
  }

  /** Les messages récents sont en bas : on y amène la liste. */
  private defilerVersLeBas() {
    setTimeout(() => {
      const el = this.liste?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }

  /** Messages affichés : les plus récents, ou tous si l'utilisateur a déplié les précédents. */
  get affiches(): CommentaireDTO[] {
    return this.anciensOuverts ? this.commentaires : this.commentaires.slice(-this.nbRecents);
  }

  get nbAnciens(): number {
    return Math.max(0, this.commentaires.length - this.nbRecents);
  }

  basculerAnciens() {
    this.anciensOuverts = !this.anciensOuverts;
    if (!this.anciensOuverts) this.defilerVersLeBas();
  }

  suivre(_index: number, c: CommentaireDTO): number {
    return c.id;
  }

  initiales(nom: string): string {
    return (nom || '?').split(/\s+/).filter(Boolean).slice(0, 2)
      .map(m => m.charAt(0).toUpperCase()).join('');
  }

  libelleRole(role: string): string {
    const map: Record<string, string> = { AGENT: 'Agent', ADMIN: 'Administrateur', CITOYEN: 'Citoyen' };
    return map[role] ?? role;
  }

  avatarClasse(role: string): string {
    const map: Record<string, string> = {
      AGENT: 'bg-brand-100 text-brand-700',
      ADMIN: 'bg-purple-100 text-purple-700',
      CITOYEN: 'bg-gray-200 text-gray-600',
    };
    return map[role] ?? 'bg-gray-200 text-gray-600';
  }

  roleClasse(role: string): string {
    const map: Record<string, string> = {
      AGENT: 'bg-brand-50 text-brand-700',
      ADMIN: 'bg-purple-50 text-purple-700',
      CITOYEN: 'bg-gray-100 text-gray-600',
    };
    return map[role] ?? 'bg-gray-100 text-gray-600';
  }

  envoyer() {
    const contenu = this.nouveauContenu.trim();
    if (!contenu || this.envoiEnCours || this.lectureSeule) return;

    this.envoiEnCours = true;
    const visibilite = this.interneCoche ? 'INTERNE' : 'PUBLIC';

    this.commentaireService.ajouter(this.reclamationId, contenu, visibilite).subscribe({
      next: (nouveau) => {
        this.commentaires = [...this.commentaires, nouveau];
        this.defilerVersLeBas();
        this.nouveauContenu = '';
        this.interneCoche = false;
        this.envoiEnCours = false;
      },
      error: (err) => {
        this.envoiEnCours = false;
        Swal.fire('Erreur', err.error?.message || "Impossible d'envoyer le message.", 'error');
      }
    });
  }
}
