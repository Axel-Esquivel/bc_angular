import { APP_INITIALIZER, ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import Aura from '@primeuix/themes/aura';
import { providePrimeNG } from 'primeng/config';
import { MessageService } from 'primeng/api';
import { catchError, firstValueFrom, of } from 'rxjs';

import { APP_CONFIG, APP_CONFIG_TOKEN } from './core/config/app-config';
import { routes } from './app.routes';
import { AuthInterceptor } from './core/auth/auth.interceptor';
import { AuthService } from './core/auth/auth.service';

const authInitializer = (authService: AuthService) => () => {
  if (!authService.hasToken()) {
    return Promise.resolve();
  }

  return firstValueFrom(
    authService.loadMe().pipe(
      catchError((error) => {
        const status = error?.status ?? error?.error?.status;
        if (status === 401 || status === 419) {
          authService.logout();
        }
        return of(null);
      })
    )
  ).then(() => undefined);
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withInterceptorsFromDi()),
    provideAnimationsAsync(),
    providePrimeNG({
      theme: {
        preset: Aura,
        // PrimeNG dark mode toggles when .bc-dark exists on <html>.
        options: { darkModeSelector: '.bc-dark' },
      },
    }),
    { provide: APP_CONFIG_TOKEN, useValue: APP_CONFIG },
    { provide: APP_INITIALIZER, useFactory: authInitializer, deps: [AuthService], multi: true },
    MessageService,
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
  ],
};
