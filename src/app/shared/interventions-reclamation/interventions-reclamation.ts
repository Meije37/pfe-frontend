import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InterventionService, InterventionDTO, ServiceOptionDTO, AgentOptionDTO } from '../../services/intervention.service';
import Swal from 'sweetalert2';

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
          *ngIf="!formOuvert"
          (click)="ouvrirFormPlanification()"
          class="text-xs font-semibold text-blue-700 hover:text-blue-900">
          <i class="fa-solid fa-plus mr-1"></i>Planifier
        </button>
      </div>

      <!-- Formulaire de planification -->
      <div *ngIf="formOuvert" class="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-2">
        <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide">Service responsable</label>
        <select [(ngModel)]="serviceSelectionne" (ngModelChange)="onServiceChange()"
                class="w-full text-sm border border-gray-300 rounded-lg px-2 py-1.5 bg-white">
          <option [ngValue]="null">-- Choisir un service --</option>
          <option *ngFor="let s of services" [ngValue]="s.id">{{ s.nom }}</option>
        </select>

        <ng-container *ngIf="serviceSelectionne">
          <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mt-2">Agent responsable</label>
          <select [(ngModel)]="agentSelectionne"
                  class="w-full text-sm border border-gray-300 rounded-lg px-2 py-1.5 bg-white"
                  [disabled]="chargementAgents">
            <option [ngValue]="null">
              {{ chargementAgents ? 'Chargement...' : (agents.length === 0 ? 'Aucun agent dans ce service' : '-- Choisir un agent --') }}
            </option>
            <option *ngFor="let a of agents" [ngValue]="a.id">{{ a.prenom }} {{ a.nom }}</option>
          </select>
        </ng-container>

        <div class="flex justify-end gap-2 pt-1">
          <button (click)="formOuvert = false"
                  class="px-3 py-1.5 text-xs font-semibold rounded-lg text-gray-500 hover:bg-gray-100">
            Annuler
          </button>
          <button (click)="planifier()" [disabled]="!serviceSelectionne || !agentSelectionne || envoiEnCours"
                  class="px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 text-white disabled:opacity-40">
            Planifier
          </button>
        </div>
      </div>

      <!-- Liste -->
      <div *ngIf="!chargement; else loadingTpl" class="space-y-3">
        <div *ngFor="let i of interventions"
             class="p-3 rounded-lg border border-gray-200">
          <div class="flex items-center justify-between mb-1.5">
            <span class="text-xs font-semibold text-gray-700">{{ i.serviceNom }}</span>
            <span class="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full"
                  [ngClass]="badgeClasse(i.statut)">
              {{ libelleStatut(i.statut) }}
            </span>
          </div>
          <p class="text-[11px] text-gray-400">
            Agent : {{ i.agentNom || '—' }} · Début : {{ i.dateDebut | date:'dd/MM/yyyy HH:mm' }}
            <span *ngIf="i.dateFin"> · Fin : {{ i.dateFin | date:'dd/MM/yyyy HH:mm' }}</span>
          </p>
          <p *ngIf="i.resultat" class="text-xs text-gray-600 mt-1.5">{{ i.resultat }}</p>
          <p *ngIf="i.coutEstime" class="text-xs text-gray-500 mt-0.5">Coût estimé : {{ i.coutEstime }} MRU</p>

          <!-- Actions selon statut -->
          <div class="flex gap-2 mt-2" *ngIf="i.statut === 'PLANIFIEE' || i.statut === 'EN_COURS'">
            <button *ngIf="i.statut === 'PLANIFIEE'"
                    (click)="changerStatut(i, 'EN_COURS')"
                    class="text-[11px] font-semibold text-blue-700 hover:underline">
              Démarrer
            </button>
            <button *ngIf="i.statut === 'EN_COURS'"
                    (click)="ouvrirFormCloture(i)"
                    class="text-[11px] font-semibold text-green-700 hover:underline">
              Terminer
            </button>
            <button (click)="changerStatut(i, 'ANNULEE')"
                    class="text-[11px] font-semibold text-red-600 hover:underline">
              Annuler
            </button>
          </div>

          <!-- Formulaire de clôture -->
          <div *ngIf="interventionEnCloture === i.id" class="mt-2 p-2 bg-gray-50 rounded-lg space-y-2">
            <textarea [(ngModel)]="resultatCloture" rows="2" placeholder="Résultat de l'intervention..."
                      class="w-full text-xs border border-gray-200 rounded-lg p-2 resize-none"></textarea>
            <input type="number" [(ngModel)]="coutCloture" placeholder="Coût estimé (MRU, optionnel)"
                   class="w-full text-xs border border-gray-200 rounded-lg p-2">
            <div class="flex justify-end gap-2">
              <button (click)="interventionEnCloture = null"
                      class="px-3 py-1 text-[11px] font-semibold rounded-lg text-gray-500">Annuler</button>
              <button (click)="confirmerCloture(i)" [disabled]="envoiEnCours"
                      class="px-3 py-1 text-[11px] font-semibold rounded-lg bg-green-600 text-white disabled:opacity-40">
                Confirmer
              </button>
            </div>
          </div>
        </div>

        <p *ngIf="interventions.length === 0" class="text-sm text-gray-400 text-center py-4">
          Aucune intervention planifiée.
        </p>
      </div>
      <ng-template #loadingTpl>
        <p class="text-sm text-gray-400 py-4 text-center">Chargement...</p>
      </ng-template>
    </div>
  `
})
export class InterventionsReclamationComponent implements OnInit {

  @Input({ required: true }) reclamationId!: number;

  private interventionService = inject(InterventionService);

  interventions: InterventionDTO[] = [];
  services: ServiceOptionDTO[] = [];
  agents: AgentOptionDTO[] = [];
  chargement = true;
  chargementAgents = false;
  envoiEnCours = false;

  formOuvert = false;
  serviceSelectionne: number | null = null;
  agentSelectionne: number | null = null;

  interventionEnCloture: number | null = null;
  resultatCloture = '';
  coutCloture: number | null = null;

  ngOnInit() {
    this.charger();
  }

  charger() {
    this.chargement = true;
    this.interventionService.lister(this.reclamationId).subscribe({
      next: (data) => { this.interventions = data; this.chargement = false; },
      error: () => { this.chargement = false; }
    });
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
      next: (data) => this.services = data,
      error: () => {}
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
    if (!this.serviceSelectionne || !this.agentSelectionne) return;
    this.envoiEnCours = true;
    this.interventionService.planifier(this.reclamationId, this.serviceSelectionne, this.agentSelectionne).subscribe({
      next: (nouvelle) => {
        this.interventions = [nouvelle, ...this.interventions];
        this.formOuvert = false;
        this.serviceSelectionne = null;
        this.agentSelectionne = null;
        this.envoiEnCours = false;
      },
      error: (err) => {
        this.envoiEnCours = false;
        Swal.fire('Erreur', err.error?.message || 'Impossible de planifier cette intervention.', 'error');
      }
    });
  }

  changerStatut(i: InterventionDTO, statut: 'EN_COURS' | 'ANNULEE') {
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
    this.envoiEnCours = true;
    this.interventionService.changerStatut(
      i.id, 'TERMINEE', this.resultatCloture, this.coutCloture ?? undefined
    ).subscribe({
      next: (maj) => {
        this.remplacer(maj);
        this.interventionEnCloture = null;
        this.envoiEnCours = false;
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
