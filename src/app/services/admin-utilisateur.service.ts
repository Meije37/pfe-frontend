import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AdminUtilisateurService {

  private http = inject(HttpClient);
  private readonly API = 'http://localhost:8081/api/admin/utilisateurs';

  // GET /api/admin/utilisateurs
  getAll(): Observable<any[]> {
    return this.http.get<any[]>(this.API);
  }

  // GET /api/admin/utilisateurs/{id}
  getById(id: number): Observable<any> {
    return this.http.get<any>(`${this.API}/${id}`);
  }

  // POST /api/admin/utilisateurs
  // Body : { nom, prenom, email, telephone, motDePasse, role }
  create(data: any): Observable<any> {
    return this.http.post<any>(this.API, data);
  }

  // PUT /api/admin/utilisateurs/{id}
  // Body : { nom, prenom, email, telephone, role, actif }
  update(id: number, data: any): Observable<any> {
    return this.http.put<any>(`${this.API}/${id}`, data);
  }

  // PUT /api/admin/utilisateurs/{id}/activer
  activer(id: number): Observable<any> {
    return this.http.put<any>(`${this.API}/${id}/activer`, {});
  }

  // PUT /api/admin/utilisateurs/{id}/desactiver
  desactiver(id: number): Observable<any> {
    return this.http.put<any>(`${this.API}/${id}/desactiver`, {});
  }

  // DELETE /api/admin/utilisateurs/{id}
  delete(id: number): Observable<any> {
    return this.http.delete<any>(`${this.API}/${id}`);
  }


  // GET /api/admin/utilisateurs/agents
  getAllAgents(): Observable<any[]> {
    return this.http.get<any[]>(`${this.API}/agents`);
  }

  // PUT /api/admin/utilisateurs/{id}/affecter-service/{serviceId}
  affecterService(agentId: number, serviceId: number): Observable<any> {
    return this.http.put<any>(
      `${this.API}/${agentId}/affecter-service/${serviceId}`, {}
    );
  }

  // PUT /api/admin/utilisateurs/{id}/retirer-service
  retirerService(agentId: number): Observable<any> {
    return this.http.put<any>(`${this.API}/${agentId}/retirer-service`, {});
  }
// GET /api/admin/utilisateurs/me
  getMonProfil(): Observable<any> {
    return this.http.get<any>(`${this.API}/me`);
  }

}
