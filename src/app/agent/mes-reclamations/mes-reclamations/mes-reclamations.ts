import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AgentService } from '../../../services/agent.service';
import { PaginationComponent } from '../../../shared/pagination/pagination';



@Component({
  selector: 'app-mes-reclamations',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './mes-reclamations.html',
  styleUrl: './mes-reclamations.css'
})
export class MesReclamationsComponent implements OnInit {

  private service = inject(AgentService);

  reclamations: any[] = [];
  loading             = true;
  filtreStatut        = '';
currentPage  = 1;
itemsPerPage = 10;
  ngOnInit() { this.charger(); }

  charger() {
    this.loading = true;
    this.service.getMesReclamations().subscribe({
      next: (data: any[]) => { this.reclamations = data; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  get reclamationsFiltrees(): any[] {
    if (!this.filtreStatut) return this.reclamations;
    return this.reclamations.filter(r => r.statut === this.filtreStatut);
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
