import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AdminDashboardService } from '../../services/admin-dashboard.service';
import { AdminReclamationService } from '../../services/admin-reclamation.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class DashboardComponent implements OnInit {

  private dashboardService   = inject(AdminDashboardService);
  private reclamationService = inject(AdminReclamationService);

  // ---- Stats dashboard ----
  stats: any = null;
  loading = true;

  // ---- Réclamations urgentes (IA) ----
  urgentes: any[] = [];
  loadingUrgentes = true;

  ngOnInit() {
    this.chargerStats();
    this.chargerUrgentes();
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
        this.urgentes = data.slice(0, 6); // top 6 uniquement
        this.loadingUrgentes = false;
      },
      error: () => {
        this.loadingUrgentes = false;
      }
    });
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

  // Score IA → largeur barre de progression
  getScoreWidth(score: number): string {
    return `${Math.round(score * 100)}%`;
  }

  // Score IA → couleur barre
  getScoreColor(score: number): string {
    if (score >= 0.8) return 'bg-red-500';
    if (score >= 0.5) return 'bg-orange-400';
    return 'bg-green-400';
  }

}
