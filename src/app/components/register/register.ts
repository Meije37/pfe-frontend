import { Component, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './register.html'
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  showPassword = false;
 togglePassword(): void {
     this.showPassword = !this.showPassword;
   }

registerForm = this.fb.group({
  nom: ['', Validators.required],
  prenom: ['', Validators.required], // AJOUTE CETTE LIGNE
  email: ['', [Validators.required, Validators.email]],
  telephone: ['', [Validators.required, Validators.pattern('^[234]\\d{7}$')]],
  motDePasse: ['', [Validators.required, Validators.minLength(6)]]
});



  onSubmit() {
    if (this.registerForm.valid) {
      this.authService.register(this.registerForm.value).subscribe({
        next: () => {
          Swal.fire({
            title: 'Félicitations !',
            text: 'Votre compte a été créé avec succès.',
            icon: 'success',
            confirmButtonText: 'Aller à la connexion',
            confirmButtonColor: '#1d4ed8', // Bleu assorti à ton bouton
          }).then((result) => {
            if (result.isConfirmed) {
              this.router.navigate(['/login']);
            }
          });
        },
        error: (err) => {
          Swal.fire({
            title: 'Erreur',
            text: err.error?.message || "Une erreur s'est produite lors de l'inscription.",
            icon: 'error',
            confirmButtonText: 'Réessayer'
          });
        }
      });
    }
  }
}
