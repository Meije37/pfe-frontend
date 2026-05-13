import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule],
  templateUrl: './admin-layout.html',
  styleUrl: './admin-layout.css'
})
export class AdminLayoutComponent {

  email = localStorage.getItem('email') ?? 'admin@pfe.mr';
  sidebarOpen = true;
  today = new Date();

navItems = [
    { label: 'Tableau de bord', route: 'dashboard',    icon: 'fa-solid fa-chart-pie' },
    { label: 'Réclamations',    route: 'reclamations', icon: 'fa-solid fa-file-lines' },
    { label: 'Utilisateurs',    route: 'utilisateurs', icon: 'fa-solid fa-users' },
    { label: 'Zones',           route: 'zones',        icon: 'fa-solid fa-map-location-dot' },
    { label: 'Services',        route: 'services',     icon: 'fa-solid fa-building-columns' },
    { label: 'Catégories',      route: 'categories',   icon: 'fa-solid fa-tags' },
  ];

  constructor(private router: Router) {}

  toggleSidebar() {
    this.sidebarOpen = !this.sidebarOpen;
  }

  logout() {
    localStorage.clear();
    this.router.navigate(['/login']);
  }

  getInitiales(): string {
    return this.email.substring(0, 2).toUpperCase();
  }
}
