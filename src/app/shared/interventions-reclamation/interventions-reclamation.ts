import { Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InterventionService, InterventionDTO, ServiceOptionDTO, AgentOptionDTO } from '../../services/intervention.service';
import Swal from 'sweetalert2';
import { Subscription, interval } from 'rxjs';
import { NotificationWebSocketService } from '../../services/notification-websocket.service';

/**
 * Historique + gestion des interventions terrain d'une réclamation.
 * S'utilise dans n'importe quelle page détail (admin ou agent) :
 *   <app-interventions-reclamation [reclamationId]="reclamation.id"></app-interventions-reclamation>
 *
 * Toute erreur 403 (ex: un agent qui essaie de clôturer l'intervention
 * d'un collègue) remonte via l'interceptor global, qui affiche maintenant
 * un message "Accès refusé" sans déconnecter — inutile de la gérer ici en double.
 */
@Component({
  selector: 'app-interventions-reclamation',
  standalone: true,
  host: { class: 'block' }, // sans ça, <app-...> est inline et space-y-6 du parent est ignoré
  imports: [CommonModule, FormsModule],
  template: `
    <div class="bg-white rounded-xl border border-gray-200 p-5">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-sm font-bold text-gray-800 flex items-center gap-2">
          <i class="fa-solid fa-toolbox text-gray-400"></i>
          Interventions
          <span class="text-xs font-normal text-gray-400">({{ interventions.length }})</span>
        </h3>
        <button
          *ngIf="!formOuvert && planificationPossible"
          (click)="ouvrirFormPlanification()"
          class="text-xs font-semibold text-brand-700 hover:text-brand-900">
          <i class="fa-solid fa-plus mr-1"></i>Planifier
        </button>
      </div>

      <!-- Formulaire de planification -->
      <div *ngIf="formOuvert && planificationPossible" class="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-2">
        <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide">Service responsable</label>
        <select [(ngModel)]="serviceSelectionne" (ngModelChange)="onServiceChange()"
                class="w-full text-sm border border-gray-300 rounded-lg px-2 py-1.5 bg-white">
          <option [ngValue]="null">-- Choisir un service --</option>
          <option *ngFor="let s of services" [ngValue]="s.id">{{ s.nom }}</option>
        </select>

        <ng-container *ngIf="serviceSelectionne">
          <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mt-2">Agent exécutant</label>
          <select [(ngModel)]="agentSelectionne"
                  class="w-full text-sm border border-gray-300 rounded-lg px-2 py-1.5 bg-white"
                  [disabled]="chargementAgents">
            <option [ngValue]="null">
              {{ chargementAgents ? 'Chargement...' : (agents.length === 0 ? 'Aucun agent actif dans ce service' : '⚙ Affectation automatique (recommandée)') }}
            </option>
            <option *ngFor="let a of agents" [ngValue]="a.id">{{ a.prenom }} {{ a.nom }}</option>
          </select>
          <p *ngIf="agentSelectionne === null && !chargementAgents && agents.length > 0" class="text-[11px] text-gray-500">
            Le système choisira l'agent actif le moins chargé du service, en privilégiant celui qui a déjà travaillé sur ce dossier.
          </p>
        </ng-container>

        <div class="flex justify-end gap-2 pt-1">
          <button (click)="formOuvert = false"
                  class="px-3 py-1.5 text-xs font-semibold rounded-lg text-gray-500 hover:bg-gray-100">
            Annuler
          </button>
          <button (click)="planifier()" [disabled]="!serviceSelectionne || chargementAgents || agents.length === 0 || envoiEnCours"
                  class="px-3 py-1.5 text-xs font-semibold rounded-lg bg-brand-600 text-white disabled:opacity-40">
            Planifier
          </button>
        </div>
      </div>

      <!-- Liste -->
      <div *ngIf="!chargement; else loadingTpl" class="space-y-4">

        <!-- À traiter : planifiées et en cours -->
        <div *ngIf="actives.length > 0" class="space-y-3">
          <ng-container *ngFor="let i of actives; trackBy: suivre">
            <ng-container *ngTemplateOutlet="carte; context: { $implicit: i }"></ng-container>
          </ng-container>
        </div>

        <p *ngIf="actives.length === 0 && historique.length > 0" class="text-sm text-gray-400">
          Aucune intervention à traiter.
        </p>

        <!-- Historique : terminées et annulées (toujours repliable, affiché par paquets) -->
        <div *ngIf="historique.length > 0">
          <button (click)="basculerHistorique()"
                  class="flex items-center gap-2 text-xs font-semibold text-gray-500 hover:text-gray-800 mb-2">
            <i class="fa-solid text-[10px]" [ngClass]="historiqueOuvert ? 'fa-chevron-down' : 'fa-chevron-right'"></i>
            Historique ({{ historique.length }})
          </button>
          <div *ngIf="historiqueOuvert" class="space-y-3">
            <ng-container *ngFor="let i of historiqueAffiche; trackBy: suivre">
              <ng-container *ngTemplateOutlet="carte; context: { $implicit: i }"></ng-container>
            </ng-container>
            <button *ngIf="historique.length > historiqueAffiche.length" (click)="voirPlusHistorique()"
                    class="w-full py-2 text-xs font-semibold text-brand-700 border border-dashed border-gray-300 rounded-lg hover:bg-gray-50">
              Voir plus ({{ historique.length - historiqueAffiche.length }} restantes)
            </button>
          </div>
        </div>

        <div *ngIf="interventions.length === 0" class="text-center py-6 text-gray-400">
          <i class="fa-solid fa-toolbox text-2xl mb-2 block"></i>
          <p class="text-sm">Aucune intervention planifiée.</p>
        </div>
      </div>

      <!-- Carte d'une intervention (réutilisée pour « à traiter » et « historique ») -->
      <ng-template #carte let-i>
        <div class="rounded-lg border border-gray-200 border-l-4 bg-white p-4" [ngClass]="bordureStatut(i.statut)">
          <div class="flex items-start justify-between gap-3">
            <p class="text-sm font-semibold text-gray-900">{{ i.serviceNom }}</p>
            <span class="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full flex-shrink-0"
                  [ngClass]="badgeClasse(i.statut)">
              {{ libelleStatut(i.statut) }}
            </span>
          </div>

          <dl class="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
            <div class="flex gap-1.5">
              <dt class="text-gray-400">Exécutant :</dt>
              <dd class="font-medium text-gray-700">{{ i.agentNom || '—' }}</dd>
              <span *ngIf="i.affectationAutomatique"
                    class="text-[10px] font-semibold text-brand-700 bg-brand-50 px-1.5 py-0.5 rounded"
                    title="Agent choisi automatiquement par le système">Auto</span>
            </div>
            <div *ngIf="i.planifieParNom" class="flex gap-1.5">
              <dt class="text-gray-400">Planifiée par :</dt>
              <dd class="font-medium text-gray-700">{{ i.planifieParNom }}</dd>
            </div>
            <div class="flex gap-1.5">
              <dt class="text-gray-400">Planifiée le :</dt>
              <dd class="font-medium text-gray-700">{{ i.dateDebut | date:'dd/MM/yyyy HH:mm' }}</dd>
            </div>
            <div *ngIf="i.dateDemarrage" class="flex gap-1.5">
              <dt class="text-gray-400">Démarrée le :</dt>
              <dd class="font-medium text-gray-700">{{ i.dateDemarrage | date:'dd/MM/yyyy HH:mm' }}</dd>
            </div>
            <div *ngIf="i.dateFin" class="flex gap-1.5">
              <dt class="text-gray-400">Terminée le :</dt>
              <dd class="font-medium text-gray-700">{{ i.dateFin | date:'dd/MM/yyyy HH:mm' }}</dd>
            </div>
          </dl>

          <!-- Résultat de l'intervention terminée -->
          <div *ngIf="i.statut === 'TERMINEE'" class="mt-3 rounded-md bg-gray-50 border border-gray-100 p-3">
            <p class="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1">Résultat</p>
            <p class="text-sm text-gray-700 whitespace-pre-wrap break-words">{{ i.resultat || '—' }}</p>
            <p *ngIf="i.coutEstime !== null && i.coutEstime !== undefined" class="mt-2 text-xs text-gray-500">
              Coût estimé :
              <span class="font-semibold text-gray-800">{{ formatMontant(i.coutEstime) }} MRU</span>
            </p>
            <p *ngIf="dureeIntervention(i) as duree" class="mt-1 text-xs text-gray-500">
              Durée de l'intervention : <span class="font-semibold text-gray-800">{{ duree }}</span>
            </p>
          </div>

          <!-- Actions selon statut et droits -->
          <div class="flex gap-2 mt-3"
               *ngIf="(i.statut === 'PLANIFIEE' || i.statut === 'EN_COURS') && (i.peutModifier !== false || i.peutAnnuler)">
            <button *ngIf="i.statut === 'PLANIFIEE' && i.peutModifier !== false"
                    (click)="changerStatut(i, 'EN_COURS')"
                    class="px-3 py-1 text-xs font-semibold rounded-md bg-brand-600 text-white hover:bg-brand-700">
              Démarrer
            </button>
            <button *ngIf="i.statut === 'EN_COURS' && i.peutModifier !== false"
                    (click)="ouvrirFormCloture(i)"
                    class="px-3 py-1 text-xs font-semibold rounded-md bg-green-600 text-white hover:bg-green-700">
              Terminer
            </button>
            <button *ngIf="i.peutTransferer" (click)="ouvrirTransfert(i)"
                    class="px-3 py-1 text-xs font-semibold rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50">
              Transférer
            </button>
            <button (click)="changerStatut(i, 'ANNULEE')"
                    class="px-3 py-1 text-xs font-semibold rounded-md border border-red-200 text-red-600 hover:bg-red-50">
              Annuler
            </button>
          </div>

          <!-- Formulaire de transfert -->
          <div *ngIf="interventionEnTransfert === i.id" class="mt-3 p-3 bg-gray-50 rounded-lg space-y-2">
            <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Transférer à (service {{ i.serviceNom }})
            </label>
            <select [(ngModel)]="agentTransfertSelectionne" [disabled]="chargementTransfert"
                    class="w-full text-sm border border-gray-300 rounded-lg px-2 py-1.5 bg-white">
              <option [ngValue]="null">
                {{ chargementTransfert ? 'Chargement...' : '⚙ Affectation automatique (recommandée)' }}
              </option>
              <option *ngFor="let a of agentsPourTransfert(i)" [ngValue]="a.id">{{ a.prenom }} {{ a.nom }}</option>
            </select>
            <div class="flex justify-end gap-2">
              <button (click)="interventionEnTransfert = null"
                      class="px-3 py-1 text-xs font-semibold rounded-lg text-gray-500">Annuler</button>
              <button (click)="confirmerTransfert(i)" [disabled]="envoiEnCours || chargementTransfert"
                      class="px-3 py-1 text-xs font-semibold rounded-lg bg-brand-600 text-white disabled:opacity-40">
                Transférer
              </button>
            </div>
          </div>

          <!-- Formulaire de clôture -->
          <div *ngIf="interventionEnCloture === i.id" class="mt-3 p-3 bg-gray-50 rounded-lg space-y-2">
            <textarea [(ngModel)]="resultatCloture" rows="2" maxlength="1000"
                      placeholder="Résultat de l'intervention (obligatoire)..."
                      class="w-full text-sm border border-gray-200 rounded-lg p-2 resize-none"></textarea>
            <p class="text-[10px] text-gray-400 text-right -mt-1">{{ resultatCloture.length }}/1000</p>
            <input type="number" min="0" [(ngModel)]="coutCloture" placeholder="Coût estimé (MRU, optionnel)"
                   class="w-full text-sm border border-gray-200 rounded-lg p-2">
            <p *ngIf="coutCloture !== null && coutCloture < 0" class="text-[10px] text-red-600">
              Le coût doit être positif ou nul.
            </p>
            <div class="flex justify-end gap-2">
              <button (click)="interventionEnCloture = null"
                      class="px-3 py-1 text-xs font-semibold rounded-lg text-gray-500">Annuler</button>
              <button (click)="confirmerCloture(i)"
                      [disabled]="envoiEnCours || !resultatCloture.trim() || (coutCloture !== null && coutCloture < 0)"
                      class="px-3 py-1 text-xs font-semibold rounded-lg bg-green-600 text-white disabled:opacity-40">
                Confirmer
              </button>
            </div>
          </div>
        </div>
      </ng-template>
      <ng-template #loadingTpl>
        <p class="text-sm text-gray-400 py-4 text-center">Chargement...</p>
      </ng-template>
    </div>
  `
})
export class InterventionsReclamationComponent implements OnInit, OnChanges, OnDestroy {

  @Input({ required: true }) reclamationId!: number;

  /**
   * Émis quand une intervention vient d'être terminée ET qu'il ne reste plus
   * aucune intervention active (planifiée / en cours) sur la réclamation.
   * La page parente décide alors de proposer de résoudre la réclamation.
   */
  @Output() interventionsTerminees = new EventEmitter<void>();

  /** Faux quand la réclamation est annulée, rejetée ou fermée : on ne planifie plus. */
  @Input() planificationPossible = true;

  private interventionService = inject(InterventionService);
  private notificationWs = inject(NotificationWebSocketService);
  private wsSub?: Subscription;
  private sondage?: Subscription;
  private minuteur?: ReturnType<typeof setTimeout>;

  interventions: InterventionDTO[] = [];
  services: ServiceOptionDTO[] = [];
  agents: AgentOptionDTO[] = [];
  chargement = true;
  chargementAgents = false;
  envoiEnCours = false;

  formOuvert = false;
  historiqueOuvert = false;
  /** Taille d'un « paquet » d'historique affiché. */
  private readonly taillePaquet = 5;
  nbHistoriqueAffiche = 5;

  // Transfert d'une intervention planifiée
  interventionEnTransfert: number | null = null;
  agentsTransfert: AgentOptionDTO[] = [];
  agentTransfertSelectionne: number | null = null;
  chargementTransfert = false;
  serviceSelectionne: number | null = null;
  agentSelectionne: number | null = null;

  interventionEnCloture: number | null = null;
  resultatCloture = '';
  coutCloture: number | null = null;

  ngOnInit() {
    this.charger();

    // Temps réel : toute notification qui concerne CE dossier (nouvelle intervention
    // confiée, intervention terminée ou annulée par un collègue…) rafraîchit la liste,
    // sans recharger la page. Léger délai : la notification part avant la fin de la
    // transaction côté serveur, on laisse le temps à l'enregistrement d'être validé.
    this.wsSub = this.notificationWs.notifications$.subscribe(notif => {
      if (notif.reclamationId === this.reclamationId) {
        clearTimeout(this.minuteur);
        this.minuteur = setTimeout(() => this.charger(true), 500);
      }
    });

    // Filet de sécurité : si le WebSocket est coupé (redémarrage du serveur, jeton expiré,
    // réseau), la liste se met quand même à jour toutes les 20 s tant que l'onglet est
    // visible. On saute le cycle si un formulaire est ouvert, pour ne pas gêner la saisie.
    this.sondage = interval(20000).subscribe(() => {
      if (!document.hidden && !this.formOuvert && this.interventionEnCloture === null
          && this.interventionEnTransfert === null) {
        this.charger(true);
      }
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    // La page parente est réutilisée quand on passe d'une réclamation à une autre.
    if (changes['reclamationId'] && !changes['reclamationId'].firstChange) {
      this.formOuvert = false;
      this.interventionEnCloture = null;
      this.interventionEnTransfert = null;
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
    this.interventionService.lister(this.reclamationId).subscribe({
      next: (data) => { this.interventions = data; this.chargement = false; },
      error: () => { this.chargement = false; }
    });
  }

  /** À traiter : planifiées et en cours. */
  get actives(): InterventionDTO[] {
    return this.interventions.filter(x => x.statut === 'PLANIFIEE' || x.statut === 'EN_COURS');
  }

  /** Historique : terminées et annulées. */
  get historique(): InterventionDTO[] {
    return this.interventions.filter(x => x.statut === 'TERMINEE' || x.statut === 'ANNULEE');
  }

  /** Identité stable des cartes : un rafraîchissement ne recrée pas le DOM (garde focus et formulaires). */
  suivre(_index: number, i: InterventionDTO): number {
    return i.id;
  }

  /** Historique tronqué au nombre déjà dévoilé (par paquets de 5). */
  get historiqueAffiche(): InterventionDTO[] {
    return this.historique.slice(0, this.nbHistoriqueAffiche);
  }

  basculerHistorique() {
    this.historiqueOuvert = !this.historiqueOuvert;
    if (!this.historiqueOuvert) this.nbHistoriqueAffiche = this.taillePaquet;
  }

  voirPlusHistorique() {
    this.nbHistoriqueAffiche += this.taillePaquet;
  }

  /** Durée réelle (démarrage → fin). Null si l'intervention n'a pas de heure de démarrage enregistrée. */
  dureeIntervention(i: InterventionDTO): string | null {
    if (!i.dateDemarrage || !i.dateFin) return null;
    const minutes = Math.max(0, Math.round(
      (new Date(i.dateFin).getTime() - new Date(i.dateDemarrage).getTime()) / 60000));
    if (minutes < 1) return "moins d'une minute";
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m} min`;
    return m === 0 ? `${h} h` : `${h} h ${m} min`;
  }

  formatMontant(n: number | null | undefined): string {
    if (n === null || n === undefined) return '';
    return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(n);
  }

  bordureStatut(s: string): string {
    const map: Record<string, string> = {
      PLANIFIEE: 'border-l-blue-400',
      EN_COURS: 'border-l-orange-400',
      TERMINEE: 'border-l-green-500',
      ANNULEE: 'border-l-gray-300',
    };
    return map[s] ?? 'border-l-gray-300';
  }

  ouvrirFormPlanification() {
    this.formOuvert = true;
    // Repart toujours de zéro : sans ça, un ancien choix resté en mémoire
    // (id d'un service depuis désactivé/supprimé) peut être envoyé au clic
    // sur "Planifier" même s'il n'apparaît plus dans le menu affiché.
    this.serviceSelectionne = null;
    this.agentSelectionne = null;
    this.agents = [];
    this.interventionService.servicesDisponibles().subscribe({
      next: (data) => {
        this.services = data;
        this.preRemplirDepuisAffectation();
      },
      error: () => {}
    });
  }

  /**
   * Pré-sélectionne le service et l'agent déjà affectés à la réclamation,
   * pour éviter de les ressaisir. L'utilisateur peut toujours les changer.
   * On ne pré-remplit que si le service est encore dans le menu (actif) et
   * si l'agent fait toujours partie de ses agents actifs.
   */
  private preRemplirDepuisAffectation() {
    this.interventionService.affectationCourante(this.reclamationId).subscribe({
      next: (aff) => {
        if (!aff || !aff.serviceId || !this.services.some(s => s.id === aff.serviceId)) return;
        this.serviceSelectionne = aff.serviceId;
        this.chargementAgents = true;
        this.interventionService.agentsDisponibles(aff.serviceId).subscribe({
          next: (agents) => {
            this.agents = agents;
            this.chargementAgents = false;
            if (agents.some(a => a.id === aff.agentId)) {
              this.agentSelectionne = aff.agentId;
            }
          },
          error: () => { this.chargementAgents = false; }
        });
      },
      error: () => {} // pas d'affectation ou erreur : le formulaire reste vide
    });
  }

  onServiceChange() {
    this.agentSelectionne = null;
    this.agents = [];
    if (!this.serviceSelectionne) return;

    this.chargementAgents = true;
    this.interventionService.agentsDisponibles(this.serviceSelectionne).subscribe({
      next: (data) => { this.agents = data; this.chargementAgents = false; },
      error: () => { this.chargementAgents = false; }
    });
  }

  planifier() {
    if (!this.serviceSelectionne) return;
    this.envoiEnCours = true;
    // agentSelectionne null = attribution automatique par le système
    this.interventionService.planifier(this.reclamationId, this.serviceSelectionne, this.agentSelectionne).subscribe({
      next: (nouvelle) => {
        this.interventions = [nouvelle, ...this.interventions];
        this.formOuvert = false;
        this.serviceSelectionne = null;
        this.agentSelectionne = null;
        this.envoiEnCours = false;
        if (nouvelle.affectationAutomatique) {
          Swal.fire({
            icon: 'success',
            title: 'Intervention planifiée',
            text: `Confiée à ${nouvelle.agentNom} (choisi automatiquement).`,
            timer: 2500,
            showConfirmButton: false
          });
        }
      },
      error: (err) => {
        this.envoiEnCours = false;
        Swal.fire('Erreur', err.error?.message || 'Impossible de planifier cette intervention.', 'error');
      }
    });
  }

  // ---- Transfert ----

  ouvrirTransfert(i: InterventionDTO) {
    this.interventionEnTransfert = i.id;
    this.agentTransfertSelectionne = null; // null = automatique
    this.agentsTransfert = [];
    if (!i.serviceId) return;
    this.chargementTransfert = true;
    this.interventionService.agentsDisponibles(i.serviceId).subscribe({
      next: (agents) => { this.agentsTransfert = agents; this.chargementTransfert = false; },
      error: () => { this.chargementTransfert = false; }
    });
  }

  /** Agents du service, sans l'exécutant actuel. */
  agentsPourTransfert(i: InterventionDTO): AgentOptionDTO[] {
    return this.agentsTransfert.filter(a => a.id !== i.agentId);
  }

  confirmerTransfert(i: InterventionDTO) {
    this.envoiEnCours = true;
    this.interventionService.transferer(i.id, this.agentTransfertSelectionne).subscribe({
      next: (maj) => {
        this.remplacer(maj);
        this.interventionEnTransfert = null;
        this.envoiEnCours = false;
        Swal.fire({
          icon: 'success',
          title: 'Intervention transférée',
          text: `Confiée à ${maj.agentNom}${maj.affectationAutomatique ? ' (choisi automatiquement)' : ''}.`,
          timer: 2500,
          showConfirmButton: false
        });
      },
      error: (err) => {
        this.envoiEnCours = false;
        Swal.fire('Erreur', err.error?.message || 'Impossible de transférer cette intervention.', 'error');
      }
    });
  }

  changerStatut(i: InterventionDTO, statut: 'EN_COURS' | 'ANNULEE') {
    // L'annulation est définitive : on demande confirmation.
    if (statut === 'ANNULEE') {
      Swal.fire({
        title: 'Annuler cette intervention ?',
        text: 'Cette action est définitive.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Oui, annuler',
        cancelButtonText: 'Non, la garder',
        confirmButtonColor: '#dc2626'
      }).then(result => {
        if (result.isConfirmed) this.envoyerChangement(i, statut);
      });
      return;
    }
    this.envoyerChangement(i, statut);
  }

  private envoyerChangement(i: InterventionDTO, statut: 'EN_COURS' | 'ANNULEE') {
    this.interventionService.changerStatut(i.id, statut).subscribe({
      next: (maj) => this.remplacer(maj),
      error: (err) => {
        // Un 403 est déjà signalé par l'intercepteur global (message
        // "Accès refusé" précis) — afficher un second popup ici ferait
        // doublon et l'écraserait avant que l'utilisateur puisse le lire.
        if (err.status !== 403) {
          Swal.fire('Erreur', err.error?.message || 'Action impossible.', 'error');
        }
      }
    });
  }

  ouvrirFormCloture(i: InterventionDTO) {
    this.interventionEnCloture = i.id;
    this.resultatCloture = '';
    this.coutCloture = null;
  }

  confirmerCloture(i: InterventionDTO) {
    const resultat = this.resultatCloture.trim();
    if (!resultat || (this.coutCloture !== null && this.coutCloture < 0)) return;
    this.envoiEnCours = true;
    this.interventionService.changerStatut(
      i.id, 'TERMINEE', resultat, this.coutCloture ?? undefined
    ).subscribe({
      next: (maj) => {
        this.remplacer(maj);
        this.interventionEnCloture = null;
        this.envoiEnCours = false;
        const resteActive = this.interventions.some(
          x => x.statut === 'PLANIFIEE' || x.statut === 'EN_COURS'
        );
        if (!resteActive) {
          this.interventionsTerminees.emit();
        }
      },
      error: (err) => {
        this.envoiEnCours = false;
        Swal.fire('Erreur', err.error?.message || 'Impossible de clôturer.', 'error');
      }
    });
  }

  private remplacer(maj: InterventionDTO) {
    this.interventions = this.interventions.map(x => x.id === maj.id ? maj : x);
  }

  libelleStatut(s: string): string {
    const map: Record<string, string> = {
      PLANIFIEE: 'Planifiée', EN_COURS: 'En cours',
      TERMINEE: 'Terminée', ANNULEE: 'Annulée'
    };
    return map[s] ?? s;
  }

  badgeClasse(s: string): string {
    const map: Record<string, string> = {
      PLANIFIEE: 'bg-blue-100 text-blue-700',
      EN_COURS: 'bg-orange-100 text-orange-700',
      TERMINEE: 'bg-green-100 text-green-700',
      ANNULEE: 'bg-gray-100 text-gray-500',
    };
    return map[s] ?? 'bg-gray-100 text-gray-500';
  }
}
