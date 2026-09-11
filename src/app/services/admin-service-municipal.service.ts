import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AdminServiceMunicipalService {

  private http = inject(HttpClient);
  private readonly API = `${environment.apiUrl}/admin/services`;

  getAll(): Observable<any[]> {
    return this.http.get<any[]>(this.API);
  }

  getById(id: number): Observable<any> {
    return this.http.get<any>(`${this.API}/${id}`);
  }

  create(data: any): Observable<any> {
    return this.http.post<any>(this.API, data);
  }

  update(id: number, data: any): Observable<any> {
    return this.http.put<any>(`${this.API}/${id}`, data);
  }

  delete(id: number): Observable<any> {
    return this.http.delete<any>(`${this.API}/${id}`);
  }
}
