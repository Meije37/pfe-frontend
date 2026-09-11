import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AgentService } from '../../../services/agent.service';
import { PaginationComponent } from '../../../shared/pagination/pagination';
import { ListStateComponent } from '../../../shared/list-state/list-state';
import Swal from 'sweetalert2';



@Component({
  selector: 'app-mes-reclamations',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, PaginationComponent, ListStateComponent],
  templateUrl: './mes-reclamations.html',
  styleUrl: './mes-reclamations.css'
})
export class MesReclamationsComponent implements OnInit {

  private service = inject(AgentService);

  reclamations: any[] = [];
  loading             = true;
  erreur              = false;
  filtreStatut        = '';
  recherche    = '';
currentPage  = 1;
itemsPerPage = 10;
  ngOnInit() { this.charger(); }

  charger() {
    this.loading = true;
    this.erreur  = false;
    this.service.getMesReclamations().subscribe({
      next: (data: any[]) => {
        this.reclamations = data;
        this.currentPage = 1;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.erreur  = true;
        Swal.fire('Erreur', 'Impossible de charger vos réclamations.', 'error');
      }
    });
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
