import { Component, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth';
import { Router, RouterModule } from '@angular/router';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterModule],
  templateUrl: './login.html'
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  showPassword = false;

    togglePassword(): void {
        this.showPassword = !this.showPassword;
}
  loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    motDePasse: ['', Validators.required]
  });

  onLogin() {
    if (this.loginForm.valid) {
      this.authService.login(this.loginForm.value).subscribe({
      next: (response: any) => {
        // Stocker token + role + email
        localStorage.setItem('token', response.token);
        localStorage.setItem('role',  response.role);
        localStorage.setItem('email', response.email);

        // Redirection selon le rôle
        if (response.role === 'ADMIN') {
          this.router.navigate(['/admin/dashboard']);
        }else if (response.role === 'AGENT') {
           this.router.navigate(['/agent/dashboard']);}
      else {
           this.router.navigate(['/dashboard']);
//           this.router.navigate(['/login']); // citoyen à faire plus tard
        }
      },
        error: () => alert('Identifiants invalides')
      });
    }
  }
}
