import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AgentService } from '../../../services/agent.service';
import { LocationMapComponent } from '../../../shared/location-map/location-map';
import Swal from 'sweetalert2';
import { CommentairesReclamationComponent } from '../../../shared/commentaires-reclamation/commentaires-reclamation';
import { InterventionsReclamationComponent } from '../../../shared/interventions-reclamation/interventions-reclamation';
@Component({
  selector: 'app-agent-reclamation-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, LocationMapComponent, CommentairesReclamationComponent,InterventionsReclamationComponent],
  templateUrl: './reclamation-detail.html',
  styleUrl: './reclamation-detail.css'
})
export class AgentReclamationDetailComponent implements OnInit {

  private route   = inject(ActivatedRoute);
  private router  = inject(Router);
  private service = inject(AgentService);

  reclamation: any = null;
  loading          = true;

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.charger(id);
  }

  charger(id: number) {
    this.service.getById(id).subscribe({
      next: (data: any) => {
        this.reclamation = data;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        Swal.fire('Erreur', 'Réclamation introuvable ou non assignée.', 'error');
        this.router.navigate(['/agent/mes-reclamations']);
      }
    });
  }

  changerStatut() {
    Swal.fire({
      title: 'Mettre à jour le statut',
      html: `
        <div style="text-align:left">
          <label style="font-size:13px;font-weight:600;color:#374151">Nouveau statut</label>
          <select id="swal-statut" class="swal2-input" style="margin-top:6px">
            <option value="EN_COURS">🔄 En cours</option>
            <option value="RESOLUE">✅ Résolue</option>
            <option value="REJETEE">❌ Rejetée</option>
          </select>
          <label style="font-size:13px;font-weight:600;color:#374151;margin-top:12px;display:block">
            Commentaire (optionnel)
          </label>
          <textarea id="swal-commentaire" class="swal2-textarea"
            placeholder="Décrivez l'action effectuée..."
            style="margin-top:6px;height:80px"></textarea>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Confirmer',
      cancelButtonText: 'Annuler',
      confirmButtonColor: '#16a34a',
      preConfirm: () => {
        const statut      = (document.getElementById('swal-statut') as HTMLSelectElement).value;
        const commentaire = (document.getElementById('swal-commentaire') as HTMLTextAreaElement).value;
        return { statut, commentaire };
      }
    }).then(result => {
      if (result.isConfirmed && result.value) {
        const { statut, commentaire } = result.value;
        this.service.changerStatut(this.reclamation.id, statut, commentaire).subscribe({
          next: () => {
            Swal.fire({
              title: 'Succès !',
              text: 'Statut mis à jour.',
              icon: 'success',
              confirmButtonColor: '#16a34a'
            });
            this.charger(this.reclamation.id);
          },
          error: (err: any) => Swal.fire('Erreur', err.error?.message || 'Erreur.', 'error')
        });
      }
    });
  }

  retour() { this.router.navigate(['/agent/mes-reclamations']); }

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
