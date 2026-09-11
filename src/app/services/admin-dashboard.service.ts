import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AdminDashboardService {

  private http = inject(HttpClient);
  private readonly API = `${environment.apiUrl}/admin`;

  // GET /api/admin/dashboard/stats
  getStats(): Observable<any> {
    return this.http.get<any>(`${this.API}/dashboard/stats`);
  }

  // GET /api/admin/dashboard/charts
  getCharts(): Observable<any> {
    return this.http.get<any>(`${this.API}/dashboard/charts`);
  }

  // GET /api/admin/utilisateurs
  getUtilisateurs(): Observable<any[]> {
    return this.http.get<any[]>(`${this.API}/utilisateurs`);
  }

  // GET /api/admin/utilisateurs  filtré role=AGENT
  getAgents(): Observable<any[]> {
    return this.http.get<any[]>(`${this.API}/utilisateurs`);
  }
}
