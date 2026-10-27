import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { PrioriteLibellePipe, StatutLibellePipe } from '../../../shared/pipes/libelles';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AgentService } from '../../../services/agent.service';
import { PaginationComponent } from '../../../shared/pagination/pagination';
import { ListStateComponent } from '../../../shared/list-state/list-state';
import Swal from 'sweetalert2';
import { ColonneTri, SensTri, sensInitial, trierReclamations } from '../../../shared/tri-reclamations';
import { Subscription, interval } from 'rxjs';
import { NotificationWebSocketService } from '../../../services/notification-websocket.service';



@Component({
  selector: 'app-mes-reclamations',
  standalone: true,
  imports: [PrioriteLibellePipe, StatutLibellePipe, CommonModule, RouterModule, FormsModule, PaginationComponent, ListStateComponent],
  templateUrl: './mes-reclamations.html',
  styleUrl: './mes-reclamations.css'
})
export class MesReclamationsComponent implements OnInit, OnDestroy {
  private notificationWs = inject(NotificationWebSocketService);
  private wsSub?: Subscription;
  private sondage?: Subscription;
  private minuteur?: ReturnType<typeof setTimeout>;

  /** Réclamations apparues lors d'un rafraîchissement automatique : mises en évidence quelques secondes. */
  nouvelles = new Set<number>();


  private service = inject(AgentService);

  reclamations: any[] = [];
  loading             = true;
  erreur              = false;
  filtreStatut        = '';
  recherche    = '';
  // Tri : par défaut, plus récentes d'abord. Chaque en-tête de colonne est cliquable.
  triColonne: ColonneTri = 'date';
  triSens: SensTri = 'desc';
currentPage  = 1;
itemsPerPage = 10;
  ngOnInit() {
    this.charger();
    this.ecouterMisesAJour();
  }

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

  /** @param silencieux true = rafraîchissement automatique : pas d'écran de chargement, de retour page 1 ni de pop-up d'erreur. */
  charger(silencieux = false) {
    if (!silencieux) {
      this.loading = true;
      this.erreur  = false;
    }
    this.service.getMesReclamations().subscribe({
      next: (data: any[]) => {
        const avant = new Set<number>(this.reclamations.map(r => r.id));
        this.reclamations = data;
        this.appliquerTri();
        if (!silencieux) this.currentPage = 1; // un rafraîchissement automatique garde la page courante
        this.loading = false;
        if (silencieux) this.signalerNouvelles(avant);
      },
      error: () => {
        this.loading = false;
        if (silencieux) return; // pas de pop-up toutes les 20 s si le réseau coupe
        this.erreur  = true;
        Swal.fire('Erreur', 'Impossible de charger vos réclamations.', 'error');
      }
    });
  }

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
  }

  iconeTri(colonne: ColonneTri): string {
    if (this.triColonne !== colonne) return 'fa-sort text-gray-300';
    return this.triSens === 'asc' ? 'fa-arrow-up text-green-600' : 'fa-arrow-down text-green-600';
  }

  ariaTri(colonne: ColonneTri): string {
    if (this.triColonne !== colonne) return 'none';
    return this.triSens === 'asc' ? 'ascending' : 'descending';
  }

  onFiltreChange() {
    this.currentPage = 1;
  }

  resetRecherche() {
    this.recherche = '';
    this.currentPage = 1;
  }

  get reclamationsFiltrees(): any[] {
    let liste = this.reclamations;

    if (this.filtreStatut) {
      liste = liste.filter(r => r.statut === this.filtreStatut);
    }

    if (this.recherche.trim()) {
      const terme = this.recherche.toLowerCase().trim();
      liste = liste.filter((r: any) =>
        r.reference?.toLowerCase().includes(terme)          ||
        r.titre?.toLowerCase().includes(terme)               ||
        r.description?.toLowerCase().includes(terme)         ||
        r.categorie?.nom?.toLowerCase().includes(terme)      ||
        r.localisation?.ville?.toLowerCase().includes(terme) ||
        r.localisation?.quartier?.toLowerCase().includes(terme)
      );
    }

    return liste;
  }

  getStatutBadge(s: string): string {
    const map: Record<string, string> = {
      'EN_COURS': 'bg-orange-100 text-orange-700 border border-orange-200',
      'RESOLUE':  'bg-green-100 text-green-700 border border-green-200',
      'REJETEE':  'bg-red-100 text-red-700 border border-red-200',
      'OUVERTE':  'bg-blue-100 text-blue-700 border border-blue-200'
    };
    return map[s] ?? 'bg-gray-100 text-gray-600';
  }

  getPrioriteBadge(p: string): string {
    const map: Record<string, string> = {
      'CRITIQUE': 'bg-red-100 text-red-700 border border-red-200',
      'HAUTE':    'bg-orange-100 text-orange-700 border border-orange-200',
      'MOYENNE':  'bg-yellow-100 text-yellow-700 border border-yellow-200',
      'BASSE':    'bg-green-100 text-green-700 border border-green-200'
    };
    return map[p] ?? 'bg-gray-100 text-gray-600';
  }

  getModeBadge(mode: string): string {
    return mode === 'AUTOMATIQUE'
      ? 'bg-purple-100 text-purple-700 border border-purple-200'
      : 'bg-gray-100 text-gray-600 border border-gray-200';
  }
get reclamationsPaginees(): any[] {
  const debut = (this.currentPage - 1) * this.itemsPerPage;
  return this.reclamationsFiltrees.slice(debut, debut + this.itemsPerPage);
}

onPageChange(page: number) {
  this.currentPage = page;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
}
