import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ProfilDTO {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  actif: boolean;
  role: string;
  serviceId?: number;
  serviceNom?: string;
}

/**
 * Contrairement à AdminUtilisateurService (qui gère n'importe quel
 * utilisateur par ID, réservé au rôle ADMIN côté backend), ce service agit
 * toujours sur l'utilisateur CONNECTÉ — accessible aux 3 rôles.
 * Ne jamais utiliser AdminUtilisateurService pour qu'un agent ou un admin
 * modifie son propre profil : ça déclenche un 403 pour un agent.
 */
@Injectable({ providedIn: 'root' })
export class ProfilService {
  private http = inject(HttpClient);
  private readonly API = `${environment.apiUrl}/profil`;

  obtenir(): Observable<ProfilDTO> {
    return this.http.get<ProfilDTO>(this.API);
  }

  modifier(data: { nom: string; prenom: string; telephone: string }): Observable<ProfilDTO> {
    return this.http.put<ProfilDTO>(this.API, data);
  }

  changerMotDePasse(data: { ancienMotDePasse: string; nouveauMotDePasse: string }): Observable<void> {
    return this.http.put<void>(`${this.API}/mot-de-passe`, data);
  }
}
