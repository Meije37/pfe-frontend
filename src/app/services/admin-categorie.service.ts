import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AdminCategorieService {

  private http = inject(HttpClient);
  private readonly API = `${environment.apiUrl}/admin/categories`;

  // GET /api/admin/categories
  getAll(): Observable<any[]> {
    return this.http.get<any[]>(this.API);
  }

  // POST /api/admin/categories
  create(data: any): Observable<any> {
    return this.http.post<any>(this.API, data);
  }

  // PUT /api/admin/categories/{id}
  update(id: number, data: any): Observable<any> {
    return this.http.put<any>(`${this.API}/${id}`, data);
  }

  // DELETE /api/admin/categories/{id}
  delete(id: number): Observable<any> {
    return this.http.delete<any>(`${this.API}/${id}`);
  }
}
