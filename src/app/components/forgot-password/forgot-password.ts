import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth';
import Swal from 'sweetalert2';

type Etape = 'email' | 'code' | 'nouveauMotDePasse';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './forgot-password.html'
})
export class ForgotPasswordComponent {

  private fb          = inject(FormBuilder);
  private authService  = inject(AuthService);
  private router       = inject(Router);

  etape: Etape = 'email';
  chargement = false;
  emailSaisi = '';

  // Étape 1 : email
  emailForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]]
  });

  // Étape 2 : code OTP (6 chiffres)
  codeForm = this.fb.group({
    code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]]
  });

  // Étape 3 : nouveau mot de passe
  motDePasseForm = this.fb.group({
    nouveauMotDePasse: ['', [Validators.required, Validators.minLength(6)]],
    confirmation:      ['', Validators.required]
  });

  showPassword = false;
  togglePassword() { this.showPassword = !this.showPassword; }

  // ---- Étape 1 : demander le code ----
  onDemanderCode() {
    if (this.emailForm.invalid) return;

    this.chargement = true;
    this.emailSaisi = this.emailForm.value.email!;

    this.authService.forgotPassword(this.emailSaisi).subscribe({
      next: (res) => {
        this.chargement = false;
        this.etape = 'code';
        Swal.fire({
          title: 'Code envoyé',
          text: res?.message ?? 'Vérifiez votre boîte email.',
          icon: 'success',
          confirmButtonColor: '#1d4ed8'
        });
      },
      error: () => {
        this.chargement = false;
        // On ne dévoile jamais si l'email existe : message générique même en cas d'erreur réseau
        Swal.fire('Erreur', 'Une erreur est survenue, veuillez réessayer.', 'error');
      }
    });
  }

  // ---- Étape 2 : vérifier le code (passe juste à l'étape suivante, la vraie vérification se fait à l'étape 3) ----
  onValiderCode() {
    if (this.codeForm.invalid) return;
    this.etape = 'nouveauMotDePasse';
  }

  // ---- Étape 3 : définir le nouveau mot de passe ----
  onReinitialiser() {
    if (this.motDePasseForm.invalid) return;

    const { nouveauMotDePasse, confirmation } = this.motDePasseForm.value;

    if (nouveauMotDePasse !== confirmation) {
      Swal.fire('Erreur', 'Les deux mots de passe ne correspondent pas.', 'warning');
      return;
    }

    this.chargement = true;
    const code = this.codeForm.value.code!;

    this.authService.resetPassword(this.emailSaisi, code, nouveauMotDePasse!).subscribe({
      next: () => {
        this.chargement = false;
        Swal.fire({
          title: 'Mot de passe mis à jour !',
          text: 'Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.',
          icon: 'success',
          confirmButtonColor: '#1d4ed8'
        }).then(() => this.router.navigate(['/login']));
      },
      error: (err) => {
        this.chargement = false;
        Swal.fire('Erreur', err.error?.message ?? 'Code invalide ou expiré.', 'error');
      }
    });
  }

  renvoyerCode() {
    this.onDemanderCode();
  }

  retourEtapeEmail() {
    this.etape = 'email';
  }
}
