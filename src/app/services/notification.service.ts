import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface NotificationDTO {
  id: number;
  titre: string;
  message: string;
  type: string;
  lu: boolean;
  dateEnvoi: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {

  private http = inject(HttpClient);
  private readonly API = `${environment.apiUrl}/notifications`;

  mesNotifications(): Observable<NotificationDTO[]> {
    return this.http.get<NotificationDTO[]>(this.API);
  }

  compterNonLues(): Observable<{ count: number }> {
    return this.http.get<{ count: number }>(`${this.API}/non-lues/count`);
  }

  marquerCommeLue(id: number): Observable<void> {
    return this.http.patch<void>(`${this.API}/${id}/lu`, {});
  }

  marquerToutesCommeLues(): Observable<void> {
    return this.http.patch<void>(`${this.API}/lu-toutes`, {});
  }
}
