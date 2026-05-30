import { Component, inject, OnInit } from '@angular/core';
import { CommonModule, NgIf } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AgentService } from '../../services/agent.service';
// ✅ Correction du chemin d'accès (2 niveaux au lieu de 3) :
import { AdminUtilisateurService } from '../../services/admin-utilisateur.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-agent-profil',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, NgIf],
  templateUrl: './agent-profil.html',
  styleUrl: './agent-profil.css'
})
export class AgentProfilComponent implements OnInit {
  private agentService = inject(AgentService);
  private userService = inject(AdminUtilisateurService);
  private fb = inject(FormBuilder);

  profil: any = null;
  stats: any = null;

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
    this.chargerDonneesAgent();
  }

  chargerDonneesAgent() {
    this.loading = true;

    this.agentService.getMonProfil().subscribe({
      next: (profilData: any) => {
        this.profil = profilData;

        this.form.patchValue({
          nom: profilData.nom,
          prenom: profilData.prenom,
          email: profilData.email,
          telephone: profilData.telephone,
          motDePasse: ''
        });

        this.agentService.getStats().subscribe({
          next: (statsData: any) => {
            this.stats = statsData;
            this.loading = false;
          },
          error: () => {
            this.loading = false;
          }
        });
      },
      error: () => {
        this.loading = false;
        Swal.fire('Erreur', 'Impossible de charger vos informations de profil.', 'error');
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

    this.userService.update(this.profil.id, body).subscribe({
      next: () => {
        this.isSubmitting = false;
        Swal.fire({
          title: 'Succès !',
          text: 'Votre profil a été mis à jour avec succès.',
          icon: 'success',
          confirmButtonColor: '#16a34a'
        });
        this.chargerDonneesAgent();
      },
      // ✅ Spécification explicite du type (err: any) pour supprimer l'erreur d'objet 'unknown'
      error: (err: any) => {
        this.isSubmitting = false;
        Swal.fire('Erreur', err.error?.message || 'Erreur lors de la mise à jour.', 'error');
      }
    });
  }
}
