import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { isTokenExpired } from '../shared/utils/jwt.util';
import { AuthService } from '../services/auth';
import Swal from 'sweetalert2';

function sessionExpiree(router: Router, authService: AuthService) {
  authService.viderSession();
  Swal.fire({
    title: 'Session expirée',
    text: 'Votre session a expiré. Veuillez vous reconnecter.',
    icon: 'warning',
    confirmButtonColor: '#1d4ed8'
  });
  router.navigate(['/login']);
  return of(false);
}

function verifierAcces(roleAttendu: 'ADMIN' | 'AGENT'): CanActivateFn {
  return () => {
    const router = inject(Router);
    const authService = inject(AuthService);

    const token = authService.getToken();
    const role  = localStorage.getItem('role');

    // Token absent ou d'un autre rôle -> refus immédiat, pas la peine de tenter un refresh
    if (!token || role !== roleAttendu) {
      router.navigate(['/login']);
      return of(false);
    }

    // Token encore valide -> accès direct
    if (!isTokenExpired(token)) {
      return of(true);
    }

    // Token expiré : on tente un renouvellement silencieux avant d'abandonner
    if (!authService.getRefreshToken()) {
      return sessionExpiree(router, authService);
    }

    return authService.refreshToken().pipe(
      map(() => true),
      catchError(() => sessionExpiree(router, authService))
    );
  };
}

export const adminGuard: CanActivateFn = verifierAcces('ADMIN');
export const agentGuard: CanActivateFn = verifierAcces('AGENT');
