import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import Swal from 'sweetalert2';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Si l'erreur est 401 (Token expiré ou absent) ou 403 (Rôle insuffisant)
      if (error.status === 401 || error.status === 403) {

        // On nettoie le stockage pour éviter les conflits
        localStorage.clear();

        // On affiche un message sympa à l'utilisateur (Mauritanie context)
        Swal.fire({
          title: 'Session expirée',
          text: 'Votre session a expiré ou vous n\'avez pas les droits nécessaires. Veuillez vous reconnecter.',
          icon: 'warning',
          confirmButtonColor: '#1d4ed8'
        });

        // Redirection vers le login
        router.navigate(['/login']);
      }

      // On renvoie l'erreur pour que le composant puisse aussi la gérer si besoin
      return throwError(() => error);
    })
  );
};
