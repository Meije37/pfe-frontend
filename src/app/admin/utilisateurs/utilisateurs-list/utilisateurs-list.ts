import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AdminUtilisateurService } from '../../../services/admin-utilisateur.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-utilisateurs-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule,RouterModule],
  templateUrl: './utilisateurs-list.html',
  styleUrl: './utilisateurs-list.css'
})
export class UtilisateursListComponent implements OnInit {

  private service = inject(AdminUtilisateurService);
  private fb      = inject(FormBuilder);

  utilisateurs: any[] = [];
  loading = true;

  // Contrôle modal
  showModal  = false;
  editMode   = false;
  editId: number | null = null;

  // Filtre rôle
  filtreRole = '';
  roles = ['', 'ADMIN', 'AGENT', 'CITOYEN'];

  // Formulaire création / modification
  // Champs exacts du UtilisateurCreateDTO et UtilisateurUpdateDTO
  form = this.fb.group({
    nom:        ['', Validators.required],
    prenom:     ['', Validators.required],
    email:      ['', [Validators.required, Validators.email]],
    telephone:  ['', [Validators.required, Validators.pattern('^[234]\\d{7}$')]],
    motDePasse: ['', Validators.required],
    role:       ['CITOYEN', Validators.required]
  });

  ngOnInit() {
    this.charger();
  }

  // ---- Charger tous les utilisateurs ----
  charger() {
    this.loading = true;
    this.service.getAll().subscribe({
      next: (data: any[]) => {
        this.utilisateurs = data;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        Swal.fire('Erreur', 'Impossible de charger les utilisateurs.', 'error');
      }
    });
  }

  // ---- Filtrer par rôle (côté client) ----
  get utilisateursFiltres(): any[] {
    if (!this.filtreRole) return this.utilisateurs;
    return this.utilisateurs.filter(u => u.role === this.filtreRole);
  }

  // ---- Ouvrir modal création ----
  ouvrirCreation() {
    this.editMode = false;
    this.editId   = null;
    this.form.reset({ role: 'CITOYEN' });
    // motDePasse obligatoire en création
    this.form.get('motDePasse')?.setValidators(Validators.required);
    this.form.get('motDePasse')?.updateValueAndValidity();
    this.showModal = true;
  }

  // ---- Ouvrir modal édition ----
  ouvrirEdition(u: any) {
    this.editMode = true;
    this.editId   = u.id;
    this.form.patchValue({
      nom:       u.nom,
      prenom:    u.prenom,
      email:     u.email,
      telephone: u.telephone,
      role:      u.role,
      motDePasse: ''
    });
    // motDePasse optionnel en édition
    this.form.get('motDePasse')?.clearValidators();
    this.form.get('motDePasse')?.updateValueAndValidity();
    this.showModal = true;
  }

  fermerModal() {
    this.showModal = false;
    this.form.reset({ role: 'CITOYEN' });
  }

  // ---- Soumettre formulaire (créer ou modifier) ----
  soumettre() {
    if (this.form.invalid) return;

    const data = this.form.value;

    if (this.editMode && this.editId) {
      // Supprimer motDePasse si vide en édition
      if (!data.motDePasse) delete (data as any).motDePasse;

      this.service.update(this.editId, data).subscribe({
        next: () => {
          Swal.fire({ title: 'Succès !', text: 'Utilisateur modifié.', icon: 'success', confirmButtonColor: '#1d4ed8' });
          this.fermerModal();
          this.charger();
        },
        error: (err: any) => {
          Swal.fire('Erreur', err.error?.message || 'Erreur lors de la modification.', 'error');
        }
      });
    } else {
      this.service.create(data).subscribe({
        next: () => {
          Swal.fire({ title: 'Succès !', text: 'Utilisateur créé avec succès.', icon: 'success', confirmButtonColor: '#1d4ed8' });
          this.fermerModal();
          this.charger();
        },
        error: (err: any) => {
          Swal.fire('Erreur', err.error?.message || 'Erreur lors de la création.', 'error');
        }
      });
    }
  }

  // ---- Activer / Désactiver ----
  toggleActif(u: any) {
    const action  = u.actif ? 'désactiver' : 'activer';
    const libelle = u.actif ? 'Désactiver' : 'Activer';

    Swal.fire({
      title: `${libelle} ce compte ?`,
      text: `${u.prenom} ${u.nom} — ${u.email}`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: libelle,
      cancelButtonText: 'Annuler',
      confirmButtonColor: u.actif ? '#dc2626' : '#1d4ed8'
    }).then(result => {
      if (result.isConfirmed) {
        const obs = u.actif
          ? this.service.desactiver(u.id)
          : this.service.activer(u.id);

        obs.subscribe({
          next: () => {
            Swal.fire({
              title: 'Succès !',
              text: `Compte ${action === 'activer' ? 'activé' : 'désactivé'}.`,
              icon: 'success',
              confirmButtonColor: '#1d4ed8'
            });
            this.charger();
          },
          error: (err: any) => {
            Swal.fire('Erreur', err.error?.message || 'Erreur.', 'error');
          }
        });
      }
    });
  }

  // ---- Supprimer ----
  supprimer(u: any) {
    Swal.fire({
      title: 'Supprimer ce compte ?',
      text: `Cette action est irréversible. ${u.prenom} ${u.nom} sera supprimé définitivement.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Supprimer',
      cancelButtonText: 'Annuler',
      confirmButtonColor: '#dc2626'
    }).then(result => {
      if (result.isConfirmed) {
        this.service.delete(u.id).subscribe({
          next: () => {
            Swal.fire({ title: 'Supprimé !', text: 'Utilisateur supprimé.', icon: 'success', confirmButtonColor: '#1d4ed8' });
            this.charger();
          },
          error: (err: any) => {
            Swal.fire('Erreur', err.error?.message || 'Erreur lors de la suppression.', 'error');
          }
        });
      }
    });
  }

  // ---- Badge rôle ----
  getRoleBadge(role: string): string {
    const map: Record<string, string> = {
      'ADMIN':   'bg-purple-100 text-purple-700 border border-purple-200',
      'AGENT':   'bg-blue-100 text-blue-700 border border-blue-200',
      'CITOYEN': 'bg-gray-100 text-gray-600 border border-gray-200'
    };
    return map[role] ?? 'bg-gray-100 text-gray-600';
  }
}
