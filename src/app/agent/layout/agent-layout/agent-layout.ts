import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../services/auth';
import { NotificationBellComponent } from '../../../shared/notification-bell/notification-bell';
import { NotificationWebSocketService } from '../../../services/notification-websocket.service';
@Component({
  selector: 'app-agent-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule, NotificationBellComponent],
  templateUrl: './agent-layout.html',
  styleUrl: './agent-layout.css'
})
export class AgentLayoutComponent {

  email       = localStorage.getItem('email') ?? 'agent@pfe.mr';
  sidebarOpen = true;
  today       = new Date();

  navItems = [
    { label: 'Mon tableau de bord', route: 'dashboard',        icon: 'fa-solid fa-chart-pie' },
    { label: 'Mes réclamations',    route: 'mes-reclamations', icon: 'fa-solid fa-file-lines' },
  ];

  constructor(
    private router: Router,
    private authService: AuthService,
    private notificationWs: NotificationWebSocketService
  ) {}

  toggleSidebar() { this.sidebarOpen = !this.sidebarOpen; }

  logout() {
    this.notificationWs.deconnecter();
    this.authService.logout().subscribe({
      next:  () => this.router.navigate(['/login']),
      error: () => this.router.navigate(['/login'])
    });
  }

  getInitiales(): string {
    return this.email.substring(0, 2).toUpperCase();
  }
}
