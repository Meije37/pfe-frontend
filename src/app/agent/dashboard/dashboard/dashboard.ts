import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AgentService } from '../../../services/agent.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-agent-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class AgentDashboardComponent implements OnInit {

  private service = inject(AgentService);

  stats: any        = null;
  reclamations: any[] = [];
  loading           = true;
  loadingRec        = true;

  ngOnInit() {
    this.chargerStats();
    this.chargerReclamations();
  }

  chargerStats() {
    this.service.getStats().subscribe({
      next: (data: any) => { this.stats = data; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  chargerReclamations() {
    this.service.getMesReclamations().subscribe({
      next: (data: any[]) => {
        // Afficher seulement les 5 plus récentes EN_COURS
        this.reclamations = data
          .filter(r => r.statut === 'EN_COURS')
          .slice(0, 5);
        this.loadingRec = false;
      },
      error: () => { this.loadingRec = false; }
    });
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
}
