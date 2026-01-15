import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from './auth.service';

export const AuthGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // eslint-disable-next-line no-console
  console.log('[auth-guard]', state.url, authService.hasToken());

  if (!authService.hasToken()) {
    return router.createUrlTree(['/auth/login']);
  }

  return true;
};
