import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-not-found',
  standalone: true,
  templateUrl: './not-found.html',
  styleUrl: './not-found.css'
})
export class NotFoundComponent {

  constructor(private router: Router) {}

  retourAccueil() {
    // Redirige vers le bon espace selon le rôle stocké, sinon vers le login
    const role = localStorage.getItem('role');

    if (role === 'ADMIN') {
      this.router.navigate(['/admin/dashboard']);
    } else if (role === 'AGENT') {
      this.router.navigate(['/agent/dashboard']);
    } else {
      this.router.navigate(['/login']);
    }
  }
}
