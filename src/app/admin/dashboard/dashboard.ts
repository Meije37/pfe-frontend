import {
  Component, inject, OnInit, AfterViewInit, OnDestroy,
  ViewChild, ElementRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { PrioriteLibellePipe, StatutLibellePipe, libelleStatut, libellePriorite } from '../../shared/pipes/libelles';
import { RouterModule } from '@angular/router';
import { AdminDashboardService } from '../../services/admin-dashboard.service';
import { AdminReclamationService } from '../../services/admin-reclamation.service';
import Swal from 'sweetalert2';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

// Graphiques dans la typographie et les gris de la charte Chikayti.
Chart.defaults.font.family = '"IBM Plex Sans", ui-sans-serif, system-ui, sans-serif';
Chart.defaults.font.size = 12;
Chart.defaults.color = '#667085';
Chart.defaults.borderColor = '#eaecf0';

type OngletRepartition = 'statut' | 'priorite' | 'categorie';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [PrioriteLibellePipe, StatutLibellePipe, CommonModule, RouterModule],
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

  /** Légende détaillée du graphique « Par statut » (libellé, nombre, part). */
  legendeStatut: { code: string; libelle: string; nombre: number; pourcentage: number; couleur: string }[] = [];
  totalStatut = 0;

  /** Ordre logique du traitement, plutôt que l'ordre renvoyé par l'API. */
  private readonly ORDRE_STATUT = ['OUVERTE', 'EN_COURS', 'RESOLUE', 'REJETEE', 'ANNULEE', 'FERMEE'];

  @ViewChild('evolutionCanvas')    evolutionCanvasRef?:    ElementRef<HTMLCanvasElement>;
  @ViewChild('repartitionCanvas')  repartitionCanvasRef?:  ElementRef<HTMLCanvasElement>;

  private evolutionChart?:   Chart;
  private repartitionChart?: Chart<any, any, any>;

  private viewReady = false;

  // Couleurs cohérentes avec les badges déjà utilisés dans l'app
  private readonly COULEURS_STATUT: Record<string, string> = {
    'OUVERTE':  '#1d4ed8',
    'EN_COURS': '#dc6803',
    'RESOLUE':  '#067647',
    'REJETEE':  '#b42318',
    'ANNULEE':  '#98a2b3'
  };

  private readonly COULEURS_PRIORITE: Record<string, string> = {
    'CRITIQUE': '#b42318',
    'HAUTE':    '#dc6803',
    'MOYENNE':  '#eab308',
    'BASSE':    '#98a2b3'
  };

  private readonly PALETTE_CATEGORIE = [
    '#0e6b45', '#1d4ed8', '#0891b2', '#7c3aed',
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
        this.calculerLegendeStatut();
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

  private statutsOrdonnes(): string[] {
    const codes = Object.keys(this.chartsData?.parStatut ?? {});
    const rang = (c: string) => {
      const i = this.ORDRE_STATUT.indexOf(c);
      return i === -1 ? 99 : i;
    };
    return codes.sort((a, b) => rang(a) - rang(b));
  }

  private calculerLegendeStatut() {
    const parStatut = this.chartsData?.parStatut ?? {};
    const codes = this.statutsOrdonnes();
    this.totalStatut = codes.reduce((t, c) => t + (Number(parStatut[c]) || 0), 0);
    this.legendeStatut = codes.map(code => {
      const nombre = Number(parStatut[code]) || 0;
      return {
        code,
        libelle: libelleStatut(code),
        nombre,
        pourcentage: this.totalStatut ? Math.round((nombre / this.totalStatut) * 100) : 0,
        couleur: this.COULEURS_STATUT[code] ?? '#98a2b3'
      };
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
          borderColor: '#0e6b45',
          backgroundColor: 'rgba(14, 107, 69, 0.08)',
          tension: 0.3,
          cubicInterpolationMode: 'monotone',
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
      const labels  = this.statutsOrdonnes();
      const valeurs = labels.map(l => Number(this.chartsData.parStatut[l]) || 0);

      const total = valeurs.reduce((a, b) => a + b, 0);

      this.repartitionChart = new Chart<'doughnut', number[], string>(this.repartitionCanvasRef.nativeElement, {
        type: 'doughnut',
        // Total écrit au centre de l'anneau (calé sur la zone du graphique,
        // donc toujours centré quelle que soit la place prise par la légende).
        plugins: [{
          id: 'totalAuCentre',
          afterDraw: (chart) => {
            const { ctx, chartArea } = chart;
            const x = (chartArea.left + chartArea.right) / 2;
            const y = (chartArea.top + chartArea.bottom) / 2;
            ctx.save();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#101828';
            ctx.font = '700 30px "IBM Plex Sans", sans-serif';
            ctx.fillText(String(total), x, y - 8);
            ctx.fillStyle = '#667085';
            ctx.font = '400 12px "IBM Plex Sans", sans-serif';
            ctx.fillText('réclamations', x, y + 16);
            ctx.restore();
          }
        }],
        data: {
          labels: labels.map(l => libelleStatut(l)),
          datasets: [{
            data: valeurs,
            backgroundColor: labels.map(l => this.COULEURS_STATUT[l] ?? '#98a2b3'),
            borderWidth: 3,
            borderColor: '#ffffff',
            borderRadius: 4,
            hoverOffset: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '74%',
          layout: { padding: 8 },
          plugins: {
            // La légende est affichée à côté, en HTML (nombre + pourcentage).
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx) => {
                  const n = Number(ctx.raw) || 0;
                  const pct = total ? Math.round((n / total) * 100) : 0;
                  return ` ${n} réclamation${n > 1 ? 's' : ''} (${pct} %)`;
                }
              }
            }
          }
        }
      });

    } else if (this.ongletActif === 'priorite') {
      const labels  = Object.keys(this.chartsData.parPriorite ?? {});
      const valeurs = Object.values(this.chartsData.parPriorite ?? {}) as number[];

      this.repartitionChart = new Chart(this.repartitionCanvasRef.nativeElement, {
        type: 'bar',
        data: {
          labels: labels.map(l => libellePriorite(l)),
          datasets: [{
            data: valeurs,
            backgroundColor: labels.map(l => this.COULEURS_PRIORITE[l] ?? '#9ca3af'),
            borderRadius: 6,
            maxBarThickness: 28
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
            maxBarThickness: 28
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
