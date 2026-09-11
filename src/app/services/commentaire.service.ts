import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface CommentaireDTO {
  id: number;
  contenu: string;
  visibilite: string; // "PUBLIC" | "INTERNE"
  dateCommentaire: string;
  auteurNom: string;
  auteurRole: string;
  auteurId: number;
}

@Injectable({ providedIn: 'root' })
export class CommentaireService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  lister(reclamationId: number): Observable<CommentaireDTO[]> {
    return this.http.get<CommentaireDTO[]>(`${this.base}/reclamations/${reclamationId}/commentaires`);
  }

  ajouter(reclamationId: number, contenu: string, visibilite: 'PUBLIC' | 'INTERNE' = 'PUBLIC'): Observable<CommentaireDTO> {
    return this.http.post<CommentaireDTO>(
      `${this.base}/reclamations/${reclamationId}/commentaires`,
      { contenu, visibilite }
    );
  }
}
