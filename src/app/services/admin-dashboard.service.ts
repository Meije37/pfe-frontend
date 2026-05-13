import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AdminDashboardService {

  private http = inject(HttpClient);
  private readonly API = 'http://localhost:8081/api/admin';

  // GET /api/admin/dashboard/stats
  getStats(): Observable<any> {
    return this.http.get<any>(`${this.API}/dashboard/stats`);
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
