import { Component, inject, OnInit } from '@angular/core';
import { CommonModule, NgIf } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AgentService } from '../../services/agent.service';
import { ProfilService } from '../../services/profil.service';
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
  private profilService = inject(ProfilService);
  private fb = inject(FormBuilder);

  profil: any = null;
  stats: any = null;

  loading = true;
  isSubmittingInfos = false;
  isSubmittingPwd = false;

  formInfos = this.fb.group({
    nom: ['', Validators.required],
    prenom: ['', Validators.required],
    email: [{ value: '', disabled: true }, [Validators.required, Validators.email]],
    telephone: ['', [Validators.required, Validators.pattern('^[234]\\d{7}$')]],
  });

  // Séparé du formulaire d'infos : /api/profil/mot-de-passe exige l'ancien
  // mot de passe pour vérification côté serveur, ce n'est pas juste un
  // champ optionnel comme c'était le cas avec l'ancien endpoint admin.
  formPwd = this.fb.group({
    ancienMotDePasse: ['', Validators.required],
    nouveauMotDePasse: ['', [Validators.required, Validators.minLength(6)]],
    confirmation: ['', Validators.required],
  });

  ngOnInit() {
    this.chargerDonneesAgent();
  }

  chargerDonneesAgent() {
    this.loading = true;

    this.agentService.getMonProfil().subscribe({
      next: (profilData: any) => {
        this.profil = profilData;

        this.formInfos.patchValue({
          nom: profilData.nom,
          prenom: profilData.prenom,
          email: profilData.email,
          telephone: profilData.telephone,
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

  sauvegarderInfos() {
    if (this.formInfos.invalid) return;

    this.isSubmittingInfos = true;
    const val = this.formInfos.getRawValue();

    this.profilService.modifier({
      nom: val.nom!,
      prenom: val.prenom!,
      telephone: val.telephone!,
    }).subscribe({
      next: () => {
        this.isSubmittingInfos = false;
        Swal.fire({
          title: 'Succès !',
          text: 'Vos informations ont été mises à jour.',
          icon: 'success',
          confirmButtonColor: '#16a34a'
        });
        this.chargerDonneesAgent();
      },
      error: (err: any) => {
        this.isSubmittingInfos = false;
        Swal.fire('Erreur', err.error?.message || 'Erreur lors de la mise à jour.', 'error');
      }
    });
  }

  changerMotDePasse() {
    if (this.formPwd.invalid) return;

    const val = this.formPwd.getRawValue();
    if (val.nouveauMotDePasse !== val.confirmation) {
      Swal.fire('Erreur', 'Les mots de passe ne correspondent pas.', 'error');
      return;
    }

    this.isSubmittingPwd = true;

    this.profilService.changerMotDePasse({
      ancienMotDePasse: val.ancienMotDePasse!,
      nouveauMotDePasse: val.nouveauMotDePasse!,
    }).subscribe({
      next: () => {
        this.isSubmittingPwd = false;
        this.formPwd.reset();
        Swal.fire({
          title: 'Succès !',
          text: 'Votre mot de passe a été mis à jour.',
          icon: 'success',
          confirmButtonColor: '#16a34a'
        });
      },
      error: (err: any) => {
        this.isSubmittingPwd = false;
        Swal.fire('Erreur', err.error?.message || 'Ancien mot de passe incorrect.', 'error');
      }
    });
  }
}
