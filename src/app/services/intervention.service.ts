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
  /** Vrai si l'utilisateur connecté peut changer le statut (agent propriétaire ou admin). */
  peutModifier?: boolean;
  /** Vrai si l'utilisateur peut annuler (exécutant, admin, ou planificateur tant que planifiée). */
  peutAnnuler?: boolean;
  planifieParNom?: string | null;
  agentId?: number | null;
  serviceId?: number | null;
  /** Vrai si l'utilisateur peut transférer l'intervention (tant qu'elle est planifiée). */
  peutTransferer?: boolean;
  /** Vrai si l'exécutant a été choisi par le système. */
  affectationAutomatique?: boolean;
  /** Heure réelle de démarrage (clic sur « Démarrer »), absente avant ce champ. */
  dateDemarrage?: string | null;
}

export interface ServiceOptionDTO {
  id: number;
  nom: string;
}

export interface AffectationCouranteDTO {
  agentId: number;
  serviceId: number | null;
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

  /**
   * Agent et service actuellement affectés à la réclamation (204 -> null).
   * Sert à pré-remplir le formulaire de planification.
   */
  affectationCourante(reclamationId: number): Observable<AffectationCouranteDTO | null> {
    return this.http.get<AffectationCouranteDTO | null>(
      `${this.base}/reclamations/${reclamationId}/affectation-courante`
    );
  }

  /** Interventions confiées à l'agent connecté, sur toutes ses réclamations. */
  mesInterventions(): Observable<InterventionDTO[]> {
    return this.http.get<InterventionDTO[]>(`${this.base}/interventions/mes-interventions`);
  }

  lister(reclamationId: number): Observable<InterventionDTO[]> {
    return this.http.get<InterventionDTO[]>(`${this.base}/reclamations/${reclamationId}/interventions`);
  }

  /** agentId null = attribution automatique par le système. */
  planifier(reclamationId: number, serviceId: number, agentId: number | null, dateDebut?: string): Observable<InterventionDTO> {
    return this.http.post<InterventionDTO>(
      `${this.base}/reclamations/${reclamationId}/interventions`,
      { serviceId, agentId, dateDebut }
    );
  }

  /** Transfert d'une intervention planifiée. agentId null = choix automatique dans le même service. */
  transferer(interventionId: number, agentId: number | null): Observable<InterventionDTO> {
    return this.http.patch<InterventionDTO>(
      `${this.base}/interventions/${interventionId}/transfert`,
      { agentId }
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
