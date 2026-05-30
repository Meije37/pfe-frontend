import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AdminUtilisateurService } from '../../services/admin-utilisateur.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-admin-profil',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './admin-profil.html',
  styleUrl: './admin-profil.css'
})
export class AdminProfilComponent implements OnInit {
  private service = inject(AdminUtilisateurService);
  private fb = inject(FormBuilder);

  profil: any = null;
  loading = true;
  isSubmitting = false;

  form = this.fb.group({
    nom: ['', Validators.required],
    prenom: ['', Validators.required],
    email: [{ value: '', disabled: true }, [Validators.required, Validators.email]],
    telephone: ['', [Validators.required, Validators.pattern('^[234]\\d{7}$')]],
    motDePasse: ['']
  });

  ngOnInit() {
    this.chargerProfil();
  }

  chargerProfil() {
    this.loading = true;
    this.service.getMonProfil().subscribe({
      next: (data: any) => { // 🔄 Type 'any' ajouté ici
        this.profil = data;
        this.form.patchValue({
          nom: data.nom,
          prenom: data.prenom,
          email: data.email,
          telephone: data.telephone,
          motDePasse: ''
        });
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        Swal.fire('Erreur', 'Impossible de charger vos informations.', 'error');
      }
    });
  }

  sauvegarder() {
    if (this.form.invalid || !this.profil) return;

    this.isSubmitting = true;
    const val = this.form.getRawValue();

    const body: any = {
      nom: val.nom,
      prenom: val.prenom,
      email: val.email,
      telephone: val.telephone,
      role: this.profil.role,
      actif: this.profil.actif
    };

    if (val.motDePasse && val.motDePasse.trim() !== '') {
      body.motDePasse = val.motDePasse;
    }

    this.service.update(this.profil.id, body).subscribe({
      next: () => {
        this.isSubmitting = false;
        Swal.fire({
          title: 'Succès !',
          text: 'Profil mis à jour.',
          icon: 'success',
          confirmButtonColor: '#1d4ed8'
        });
        this.chargerProfil();
      },
      error: (err: any) => { // 🔄 Type 'any' ajouté ici
        this.isSubmitting = false;
        Swal.fire('Erreur', err.error?.message || 'Erreur lors de la mise à jour.', 'error');
      }
    });
  }
}
