import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, timeout } from 'rxjs/operators';

export interface AdresseResolue {
  adresse: string;
  quartier: string;
  ville: string;
}

/**
 * Convertit des coordonnées GPS en adresse lisible (rue, quartier, ville),
 * via l'API de géocodage inverse Nominatim (OpenStreetMap).
 *
 * Équivalent web du GeocodingService utilisé côté mobile Flutter.
 */
@Injectable({ providedIn: 'root' })
export class ReverseGeocodingService {

  private http = inject(HttpClient);

  private static readonly URL = 'https://nominatim.openstreetmap.org/reverse';

  resolve(latitude: number, longitude: number): Observable<AdresseResolue> {
    const params = new URLSearchParams({
      format: 'jsonv2',
      lat: String(latitude),
      lon: String(longitude),
      addressdetails: '1',
      'accept-language': 'fr'
    });

    return this.http.get<any>(`${ReverseGeocodingService.URL}?${params}`).pipe(
      timeout(8000),
      map(res => this.mapReponse(res, latitude, longitude)),
      catchError(() => of(this.fallback(latitude, longitude)))
    );
  }

  private mapReponse(res: any, lat: number, lng: number): AdresseResolue {
    const a = res?.address ?? {};

    const adresse = this.premierNonVide([
      a.road, a.pedestrian, a.residential, a.neighbourhood_name, a.name
    ]);

    const quartier = this.premierNonVide([
      a.suburb, a.neighbourhood, a.quarter, a.city_district
    ]);

    const ville = this.premierNonVide([
      a.city, a.town, a.village, a.municipality, a.county, a.state
    ]) || 'Nouakchott';

    // OpenStreetMap n'a pas toujours de données détaillées pour Nouakchott
    // (contrairement au géocodeur natif utilisé côté mobile). Si rien
    // d'exploitable n'est trouvé, on affiche les coordonnées plutôt qu'un
    // champ vide — même logique de repli que côté Flutter.
    if (!adresse && !quartier) {
      return { ...this.fallback(lat, lng), ville };
    }

    return { adresse, quartier, ville };
  }

  private premierNonVide(candidats: (string | undefined)[]): string {
    for (const c of candidats) {
      if (c && c.trim().length > 0) return c.trim();
    }
    return '';
  }

  private fallback(lat: number, lng: number): AdresseResolue {
    const latStr = Math.abs(lat).toFixed(4) + (lat >= 0 ? '°N' : '°S');
    const lngStr = Math.abs(lng).toFixed(4) + (lng >= 0 ? '°E' : '°O');
    return { adresse: `${latStr}, ${lngStr}`, quartier: '', ville: 'Nouakchott' };
  }
}
