import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AdminUtilisateurService } from '../../../services/admin-utilisateur.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-utilisateur-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './utilisateur-detail.html',
  styleUrl: './utilisateur-detail.css'
})
export class UtilisateurDetailComponent implements OnInit {

  private route   = inject(ActivatedRoute);
  private router  = inject(Router);
  private service = inject(AdminUtilisateurService);

  utilisateur: any = null;
  loading = true;

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (id) {
      this.chargerUtilisateur(id);
    }
  }

  chargerUtilisateur(id: number) {
    this.loading = true;
    this.service.getById(id).subscribe({
      next: (data) => {
        this.utilisateur = data;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        Swal.fire('Erreur', 'Utilisateur introuvable.', 'error');
        this.retour();
      }
    });
  }

  retour() {
    this.router.navigate(['/admin/utilisateurs']);
  }

  getRoleBadge(role: string): string {
    const map: Record<string, string> = {
      'ADMIN':   'bg-purple-100 text-purple-700 border-purple-200',
      'AGENT':   'bg-blue-100 text-blue-700 border-blue-200',
      'CITOYEN': 'bg-green-100 text-green-700 border-green-200'
    };
    return map[role] ?? 'bg-gray-100 text-gray-700';
  }
}
