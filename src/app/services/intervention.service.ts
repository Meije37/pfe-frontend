import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface InterventionDTO {
  id: number;
  dateDebut: string;
  dateFin: string | null;
  statut: string; // PLANIFIEE | EN_COURS | TERMINEE | ANNULEE
  resultat: string | null;
  coutEstime: number | null;
  serviceNom: string;
  agentNom: string;
}

export interface ServiceOptionDTO {
  id: number;
  nom: string;
}

export interface AgentOptionDTO {
  id: number;
  nom: string;
  prenom: string;
}

@Injectable({ providedIn: 'root' })
export class InterventionService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  /**
   * Volontairement PAS /admin/services (réservé ADMIN) : cet endpoint
   * dédié est accessible aux agents aussi, pour peupler le menu de
   * planification d'intervention.
   */
  servicesDisponibles(): Observable<ServiceOptionDTO[]> {
    return this.http.get<ServiceOptionDTO[]>(`${this.base}/interventions/services-disponibles`);
  }

  /** Agents actifs appartenant à ce service — pour désigner un vrai exécutant. */
  agentsDisponibles(serviceId: number): Observable<AgentOptionDTO[]> {
    return this.http.get<AgentOptionDTO[]>(`${this.base}/interventions/agents-disponibles`, {
      params: { serviceId }
    });
  }

  /** Interventions confiées à l'agent connecté, sur toutes ses réclamations. */
  mesInterventions(): Observable<InterventionDTO[]> {
    return this.http.get<InterventionDTO[]>(`${this.base}/interventions/mes-interventions`);
  }

  lister(reclamationId: number): Observable<InterventionDTO[]> {
    return this.http.get<InterventionDTO[]>(`${this.base}/reclamations/${reclamationId}/interventions`);
  }

  planifier(reclamationId: number, serviceId: number, agentId: number, dateDebut?: string): Observable<InterventionDTO> {
    return this.http.post<InterventionDTO>(
      `${this.base}/reclamations/${reclamationId}/interventions`,
      { serviceId, agentId, dateDebut }
    );
  }

  changerStatut(
    interventionId: number,
    statut: 'PLANIFIEE' | 'EN_COURS' | 'TERMINEE' | 'ANNULEE',
    resultat?: string,
    coutEstime?: number
  ): Observable<InterventionDTO> {
    return this.http.patch<InterventionDTO>(
      `${this.base}/interventions/${interventionId}/statut`,
      { statut, resultat, coutEstime }
    );
  }
}
