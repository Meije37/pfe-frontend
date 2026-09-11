import { HttpInterceptorFn, HttpErrorResponse, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth';
import { BehaviorSubject, catchError, filter, switchMap, take, throwError } from 'rxjs';

// État partagé entre toutes les requêtes (un seul refresh à la fois, même si
// plusieurs appels API échouent en même temps avec un token expiré).
let refreshEnCours = false;
const nouveauTokenSubject = new BehaviorSubject<string | null>(null);

function cloneAvecToken(req: HttpRequest<any>, token: string) {
  return req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
}

export const refreshInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Les appels d'authentification eux-mêmes ne doivent jamais être rejoués
  const estAppelAuth = req.url.includes('/auth/login')
    || req.url.includes('/auth/register')
    || req.url.includes('/auth/refresh');

  if (estAppelAuth) {
    return next(req);
  }

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status !== 401) {
        return throwError(() => error);
      }

      if (!authService.getRefreshToken()) {
        return throwError(() => error); // laisse errorInterceptor faire le nettoyage/redirection
      }

      if (!refreshEnCours) {
        refreshEnCours = true;
        nouveauTokenSubject.next(null);

        return authService.refreshToken().pipe(
          switchMap(res => {
            refreshEnCours = false;
            nouveauTokenSubject.next(res.token);
            return next(cloneAvecToken(req, res.token));
          }),
          catchError(refreshErr => {
            refreshEnCours = false;
            authService.viderSession();
            router.navigate(['/login']);
            return throwError(() => refreshErr);
          })
        );
      }

      // Un rafraîchissement est déjà en cours pour une autre requête :
      // on attend le nouveau token puis on rejoue celle-ci avec.
      return nouveauTokenSubject.pipe(
        filter((token): token is string => token !== null),
        take(1),
        switchMap(token => next(cloneAvecToken(req, token)))
      );
    })
  );
};
