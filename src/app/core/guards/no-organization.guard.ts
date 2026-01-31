import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { SessionStateService } from '../services/session-state.service';

export const NoOrganizationGuard: CanActivateFn = () => {
  const sessionState = inject(SessionStateService);
  const router = inject(Router);

  if (!sessionState.isAuthenticated()) {
    return router.parseUrl('/auth/login');
  }

  if (sessionState.hasOrganizations()) {
    return router.parseUrl(sessionState.hasDefaults() ? '/app' : '/context/select');
  }

  return true;
};
