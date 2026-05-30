import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const adminGuard: CanActivateFn = () => {
  const router = inject(Router);
  const token = localStorage.getItem('token');
  const role  = localStorage.getItem('role');

  if (token && role === 'ADMIN') {
    return true;
  }

  router.navigate(['/login']);
  return false;
};
export const agentGuard: CanActivateFn = () => {
  const router = inject(Router);
  const token = localStorage.getItem('token');
  const role  = localStorage.getItem('role');

  if (token && role === 'AGENT') return true;
  router.navigate(['/login']);
  return false;
};
