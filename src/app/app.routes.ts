import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login';
import { RegisterComponent } from './components/register/register';
// Ajout de l'import pour l'agentGuard (ajustez le nom de l'export s'il diffère dans votre fichier)
import { adminGuard, agentGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: 'login',    component: LoginComponent },
  { path: 'register', component: RegisterComponent },

  // Espace Admin
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./admin/layout/admin-layout').then(m => m.AdminLayoutComponent),
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./admin/dashboard/dashboard').then(m => m.DashboardComponent)
      },
      {
        path: 'reclamations',
        loadComponent: () =>
          import('./admin/reclamations/reclamations-list/reclamations-list').then(m => m.ReclamationsListComponent)
      },
      {
        path: 'reclamations/:id',
        loadComponent: () =>
          import('./admin/reclamations/reclamation-detail/reclamation-detail').then(m => m.ReclamationDetailComponent)
      },
      {
        path: 'utilisateurs',
        loadComponent: () =>
          import('./admin/utilisateurs/utilisateurs-list/utilisateurs-list').then(m => m.UtilisateursListComponent)
      },
      {
        path: 'categories',
        loadComponent: () =>
          import('./admin/categories/categories-list/categories-list').then(m => m.CategoriesListComponent)
      },
      {
        path: 'utilisateurs/:id',
        loadComponent: () =>
          import('./admin/utilisateurs/utilisateur-detail/utilisateur-detail').then(m => m.UtilisateurDetailComponent)
      },
      {
        path: 'zones',
        loadComponent: () =>
          import('./admin/zones/zones-list/zones-list').then(m => m.ZonesListComponent)
      },
      {
        path: 'services',
        loadComponent: () =>
          import('./admin/services/services-list/services-list').then(m => m.ServicesListComponent)
      },
    {
            path: 'profil',
            loadComponent: () =>
              import('./admin/admin-profil/admin-profil').then(m => m.AdminProfilComponent)
          },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },

  // Espace Agent
  {
    path: 'agent',
    canActivate: [agentGuard],
    loadComponent: () =>
      import('./agent/layout/agent-layout/agent-layout').then(m => m.AgentLayoutComponent),
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./agent/dashboard/dashboard/dashboard').then(m => m.AgentDashboardComponent)
      },
      {
        path: 'mes-reclamations',
        loadComponent: () => import('./agent/mes-reclamations/mes-reclamations/mes-reclamations').then(m => m.MesReclamationsComponent)
      },
      {
        path: 'mes-reclamations/:id',
        loadComponent: () => import('./agent/reclamation-detail/reclamation-detail/reclamation-detail').then(m => m.AgentReclamationDetailComponent)
      },
    {
            path: 'profil',
            loadComponent: () => import('./agent/agent-profil/agent-profil').then(m => m.AgentProfilComponent)
          },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },

  { path: '', redirectTo: 'login', pathMatch: 'full' }
];
