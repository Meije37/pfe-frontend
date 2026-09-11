import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';

export interface AuthResponse {
  token: string;
  refreshToken: string;
  email: string;
  role: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private readonly API_URL = `${environment.apiUrl}/auth`;

  register(user: any): Observable<any> {
    return this.http.post(`${this.API_URL}/register`, user);
  }

  forgotPassword(email: string): Observable<any> {
    return this.http.post(`${this.API_URL}/forgot-password`, { email });
  }

  resetPassword(email: string, code: string, nouveauMotDePasse: string): Observable<any> {
    return this.http.post(`${this.API_URL}/reset-password`, { email, code, nouveauMotDePasse });
  }

  login(credentials: any): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API_URL}/login`, credentials).pipe(
      tap(res => this.stockerSession(res))
    );
  }

  /**
   * Renouvelle le token d'accès à partir du refresh token stocké.
   * Le backend fait une rotation : un nouveau refresh token est renvoyé et
   * remplace l'ancien à chaque appel.
   */
  refreshToken(): Observable<AuthResponse> {
    const refreshToken = this.getRefreshToken();
    return this.http.post<AuthResponse>(`${this.API_URL}/refresh`, { refreshToken }).pipe(
      tap(res => this.stockerSession(res))
    );
  }

  /**
   * Déconnexion : révoque le refresh token côté serveur puis nettoie le
   * stockage local. Le backend étant informé, le refresh token ne pourra
   * plus être réutilisé même s'il fuitait.
   */
  logout(): Observable<any> {
    const refreshToken = this.getRefreshToken();
    return this.http.post(`${this.API_URL}/logout`, { refreshToken }).pipe(
      tap(() => this.viderSession())
    );
  }

  stockerSession(res: AuthResponse) {
    localStorage.setItem('token', res.token);
    localStorage.setItem('refreshToken', res.refreshToken);
    localStorage.setItem('role', res.role);
    localStorage.setItem('email', res.email);
  }

  viderSession() {
    localStorage.clear();
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  getRefreshToken(): string | null {
    return localStorage.getItem('refreshToken');
  }
}
