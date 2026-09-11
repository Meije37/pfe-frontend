import {
  Component, inject, OnInit, AfterViewInit, OnDestroy,
  ViewChild, ElementRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AdminDashboardService } from '../../services/admin-dashboard.service';
import { AdminReclamationService } from '../../services/admin-reclamation.service';
import Swal from 'sweetalert2';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

type OngletRepartition = 'statut' | 'priorite' | 'categorie';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {

  private dashboardService   = inject(AdminDashboardService);
  private reclamationService = inject(AdminReclamationService);

  // ---- Stats dashboard ----
  stats: any = null;
  loading = true;

  // ---- Réclamations urgentes (IA) ----
  urgentes: any[] = [];
  loadingUrgentes = true;

  // ---- Graphiques ----
  chartsData: any = null;
  loadingCharts = true;
  ongletActif: OngletRepartition = 'statut';

  @ViewChild('evolutionCanvas')    evolutionCanvasRef?:    ElementRef<HTMLCanvasElement>;
  @ViewChild('repartitionCanvas')  repartitionCanvasRef?:  ElementRef<HTMLCanvasElement>;

  private evolutionChart?:   Chart;
  private repartitionChart?: Chart;

  private viewReady = false;

  // Couleurs cohérentes avec les badges déjà utilisés dans l'app
  private readonly COULEURS_STATUT: Record<string, string> = {
    'OUVERTE':  '#2563eb',
    'EN_COURS': '#f97316',
    'RESOLUE':  '#22c55e',
    'REJETEE':  '#dc2626',
    'ANNULEE':  '#9ca3af'
  };

  private readonly COULEURS_PRIORITE: Record<string, string> = {
    'CRITIQUE': '#dc2626',
    'HAUTE':    '#f97316',
    'MOYENNE':  '#eab308',
    'BASSE':    '#22c55e'
  };

  private readonly PALETTE_CATEGORIE = [
    '#2563eb', '#7c3aed', '#0891b2', '#059669',
    '#ca8a04', '#dc2626', '#db2777', '#4b5563'
  ];

  ngOnInit() {
    this.chargerStats();
    this.chargerUrgentes();
    this.chargerCharts();
  }

  ngAfterViewInit() {
    this.viewReady = true;
  }

  ngOnDestroy() {
    this.evolutionChart?.destroy();
    this.repartitionChart?.destroy();
  }

  chargerStats() {
    this.dashboardService.getStats().subscribe({
      next: (data) => {
        this.stats = data;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        Swal.fire('Erreur', 'Impossible de charger les statistiques.', 'error');
      }
    });
  }

  chargerUrgentes() {
    this.reclamationService.getUrgentes().subscribe({
      next: (data) => {
        this.urgentes = data.slice(0, 6);
        this.loadingUrgentes = false;
      },
      error: () => {
        this.loadingUrgentes = false;
      }
    });
  }

  chargerCharts() {
    this.dashboardService.getCharts().subscribe({
      next: (data) => {
        this.chartsData = data;
        this.loadingCharts = false;
        requestAnimationFrame(() => {
          requestAnimationFrame(() => this.initCharts());
        });
      },
      error: () => {
        this.loadingCharts = false;
      }
    });
  }

  changerOnglet(onglet: OngletRepartition) {
    this.ongletActif = onglet;
    // Laisse Angular basculer l'overlay "Total" (*ngIf) avant de redessiner
    requestAnimationFrame(() => this.dessinerRepartitionActive());
  }

  private initCharts() {
    if (!this.chartsData) return;

    this.initEvolutionChart();
    this.dessinerRepartitionActive();

    setTimeout(() => {
      this.evolutionChart?.resize();
      this.repartitionChart?.resize();
    }, 50);
  }

  private initEvolutionChart() {
    if (!this.evolutionCanvasRef) return;
    const points = this.chartsData.evolution14Jours ?? [];

    this.evolutionChart?.destroy();
    this.evolutionChart = new Chart(this.evolutionCanvasRef.nativeElement, {
      type: 'line',
      data: {
        labels: points.map((p: any) => p.date),
        datasets: [{
          label: 'Réclamations créées',
          data: points.map((p: any) => p.total),
          borderColor: '#1d4ed8',
          backgroundColor: 'rgba(29, 78, 216, 0.1)',
          tension: 0.3,
          fill: true,
          pointRadius: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { font: { size: 10 } } },
          y: { beginAtZero: true, ticks: { precision: 0, font: { size: 10 } } }
        }
      }
    });
  }

  /**
   * Redessine le graphique de répartition dans le canvas UNIQUE partagé,
   * selon l'onglet actuellement sélectionné (statut / priorité / catégorie).
   */
  private dessinerRepartitionActive() {
    if (!this.repartitionCanvasRef || !this.chartsData) return;

    this.repartitionChart?.destroy();

    if (this.ongletActif === 'statut') {
      const labels  = Object.keys(this.chartsData.parStatut ?? {});
      const valeurs = Object.values(this.chartsData.parStatut ?? {}) as number[];

      this.repartitionChart = new Chart(this.repartitionCanvasRef.nativeElement, {
        type: 'doughnut',
        data: {
          labels,
          datasets: [{
            data: valeurs,
            backgroundColor: labels.map(l => this.COULEURS_STATUT[l] ?? '#9ca3af'),
            borderWidth: 2,
            borderColor: '#ffffff'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '68%',
          plugins: {
            legend: { position: 'bottom', labels: { boxWidth: 10, padding: 12, font: { size: 12 } } }
          }
        }
      });

    } else if (this.ongletActif === 'priorite') {
      const labels  = Object.keys(this.chartsData.parPriorite ?? {});
      const valeurs = Object.values(this.chartsData.parPriorite ?? {}) as number[];

      this.repartitionChart = new Chart(this.repartitionCanvasRef.nativeElement, {
        type: 'bar',
        data: {
          labels,
          datasets: [{
            data: valeurs,
            backgroundColor: labels.map(l => this.COULEURS_PRIORITE[l] ?? '#9ca3af'),
            borderRadius: 6,
            maxBarThickness: 48
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          indexAxis: 'y',
          plugins: { legend: { display: false } },
          scales: {
            x: { beginAtZero: true, ticks: { precision: 0 } }
          }
        }
      });

    } else {
      const labels  = Object.keys(this.chartsData.parCategorie ?? {});
      const valeurs = Object.values(this.chartsData.parCategorie ?? {}) as number[];

      this.repartitionChart = new Chart(this.repartitionCanvasRef.nativeElement, {
        type: 'bar',
        data: {
          labels,
          datasets: [{
            data: valeurs,
            backgroundColor: labels.map((_, i) => this.PALETTE_CATEGORIE[i % this.PALETTE_CATEGORIE.length]),
            borderRadius: 6,
            maxBarThickness: 60
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { autoSkip: false, font: { size: 11 } } },
            y: { beginAtZero: true, ticks: { precision: 0 } }
          }
        }
      });
    }
  }

  // Badge couleur selon priorité
  getPrioriteBadge(priorite: string): string {
    const map: Record<string, string> = {
      'CRITIQUE': 'bg-red-100 text-red-700',
      'HAUTE':    'bg-orange-100 text-orange-700',
      'MOYENNE':  'bg-yellow-100 text-yellow-700',
      'BASSE':    'bg-green-100 text-green-700'
    };
    return map[priorite] ?? 'bg-gray-100 text-gray-600';
  }

  // Badge couleur selon statut
  getStatutBadge(statut: string): string {
    const map: Record<string, string> = {
      'OUVERTE':  'bg-blue-100 text-blue-700',
      'EN_COURS': 'bg-orange-100 text-orange-700',
      'RESOLUE':  'bg-green-100 text-green-700',
      'REJETEE':  'bg-red-100 text-red-700',
      'ANNULEE':  'bg-gray-100 text-gray-500'
    };
    return map[statut] ?? 'bg-gray-100 text-gray-600';
  }

  getScoreWidth(score: number): string {
    return `${Math.round(score * 100)}%`;
  }

  getScoreColor(score: number): string {
    if (score >= 0.8) return 'bg-red-500';
    if (score >= 0.5) return 'bg-orange-400';
    return 'bg-green-400';
  }

}
