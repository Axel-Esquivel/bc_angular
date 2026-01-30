import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from './auth.service';

export const AuthGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const hasToken = authService.hasToken();
  if (!hasToken) {
    console.warn('[AUTH_GUARD_BLOCK]', { url: state.url, reason: 'missing_token' });
    const redirect = router.createUrlTree(['/auth/login']);
    console.log('[GUARD AuthGuard]', { url: state.url, ok: false, token: hasToken, redirect: redirect.toString() });
    return redirect;
  }

  console.log('[GUARD AuthGuard]', { url: state.url, ok: true, token: hasToken });
  return true;
};
