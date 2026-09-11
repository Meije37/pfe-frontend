import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { jwtInterceptor } from './interceptors/jwt-interceptor';
import { errorInterceptor } from './interceptors/error.interceptor'; // N'oublie pas l'import
import { refreshInterceptor } from './interceptors/refresh-interceptor';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),

    // On regroupe tous les intercepteurs ici
    provideHttpClient(
      withInterceptors([
        jwtInterceptor,      // 1. Ajoute le token
        errorInterceptor,    // 2. Filet de sécurité final (401/403 non récupérés)
        refreshInterceptor   // 3. Tente un renouvellement silencieux avant d'abandonner
      ])
    )
  ]
};
