import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AdminReclamationService {

  private http = inject(HttpClient);
  private readonly API = `${environment.apiUrl}/admin/reclamations`;

  getAll(): Observable<any[]> {
    return this.http.get<any[]>(this.API);
  }

  // Détail par ID
  getById(id: number): Observable<any> {
    return this.http.get<any>(`${this.API}/${id}`);
  }

  getUrgentes(): Observable<any[]> {
    return this.http.get<any[]>(`${this.API}/urgentes`);
  }

  getParStatut(statut: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.API}/par-statut?statut=${statut}`);
  }

  getParPriorite(priorite: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.API}/par-priorite?priorite=${priorite}`);
  }

  //  Historique des statuts
  getHistorique(id: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.API}/${id}/historique`);
  }

  // Liste des agents disponibles
  getAgents(): Observable<any[]> {
    return this.http.get<any[]>(`${this.API}/agents`);
  }
//
//   changerStatut(id: number, statut: string, commentaire?: string): Observable<any> {
//     return this.http.put(`${this.API}/statut/${id}`, {
//       nouveauStatut: statut,
//       commentaire: commentaire ?? ''
//     });
//   }
changerStatut(id: number, statut: string, commentaire?: string): Observable<any> {
  return this.http.put(`${this.API}/statut/${id}`, { statut, commentaire });
}

  assignerAgent(reclamationId: number, agentId: number): Observable<any> {
    return this.http.post(`${this.API}/assigner/${reclamationId}/agent/${agentId}`, {});
  }
getAgentAssigne(reclamationId: number): Observable<any> {
  return this.http.get<any>(`${this.API}/${reclamationId}/agent-assigne`);
}
}
