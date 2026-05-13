import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { jwtInterceptor } from './interceptors/jwt-interceptor';
import { errorInterceptor } from './interceptors/error.interceptor'; // N'oublie pas l'import

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),

    // On regroupe tous les intercepteurs ici
    provideHttpClient(
      withInterceptors([
        jwtInterceptor,   // 1. Ajoute le token
        errorInterceptor  // 2. Surveille les erreurs
      ])
    )
  ]
};
