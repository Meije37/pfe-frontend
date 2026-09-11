import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import Swal from 'sweetalert2';

/**
 * 401 et 403 ne veulent PAS dire la même chose, et ne doivent pas être
 * traités pareil :
 *  - 401 : le token est absent/invalide/expiré → la session n'est plus
 *          valable du tout, il faut déconnecter et renvoyer au login.
 *  - 403 : le token est valide, l'utilisateur EST bien connecté, mais
 *          cette action précise lui est interdite (mauvais rôle, mauvaise
 *          ressource). Le déconnecter serait une sur-réaction : il perdrait
 *          sa session pour une erreur qui n'a rien à voir avec sa session.
 *
 * (Historique : ces deux cas étaient fusionnés, ce qui provoquait une
 * déconnexion complète d'un agent essayant simplement d'appeler une route
 * réservée à l'admin — cf. bug agent-profil.)
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        localStorage.clear();
        Swal.fire({
          title: 'Session expirée',
          text: 'Votre session a expiré. Veuillez vous reconnecter.',
          icon: 'warning',
          confirmButtonColor: '#1d4ed8'
        });
        router.navigate(['/login']);
      } else if (error.status === 403) {
        // Session conservée : c'est une action refusée, pas une session invalide.
        Swal.fire({
          title: 'Accès refusé',
          text: error.error?.message || "Vous n'avez pas les droits nécessaires pour cette action.",
          icon: 'error',
          confirmButtonColor: '#1d4ed8'
        });
      }

      // On renvoie l'erreur pour que le composant puisse aussi la gérer si besoin
      return throwError(() => error);
    })
  );
};
