import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AgentService {

  private http = inject(HttpClient);
  private readonly API = `${environment.apiUrl}/agent`;

  // GET /api/agent/stats
  getStats(): Observable<any> {
    return this.http.get<any>(`${this.API}/stats`);
  }

  // GET /api/agent/mes-reclamations
  getMesReclamations(): Observable<any[]> {
    return this.http.get<any[]>(`${this.API}/mes-reclamations`);
  }

  // GET /api/agent/mes-reclamations/{id}
  getById(id: number): Observable<any> {
    return this.http.get<any>(`${this.API}/mes-reclamations/${id}`);
  }

  // PUT /api/agent/mes-reclamations/{id}/statut
  changerStatut(id: number, nouveauStatut: string, commentaire: string): Observable<any> {
    return this.http.put<any>(`${this.API}/mes-reclamations/${id}/statut`, {
      nouveauStatut,
      commentaire
    });
  }
getMonProfil(): Observable<any> {
  return this.http.get<any>(`${this.API}/me`);
}
}
