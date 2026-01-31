import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { SessionStateService } from '../services/session-state.service';

export const RootRedirectGuard: CanActivateFn = () => {
  const sessionState = inject(SessionStateService);
  const router = inject(Router);

  if (!sessionState.isAuthenticated()) {
    return router.parseUrl('/auth/login');
  }

  if (!sessionState.hasOrganizations()) {
    return router.parseUrl('/org/setup');
  }

  if (!sessionState.hasDefaults()) {
    return router.parseUrl('/context/select');
  }

  return router.parseUrl('/app');
};
