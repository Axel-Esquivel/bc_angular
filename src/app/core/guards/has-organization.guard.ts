import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { SessionStateService } from '../services/session-state.service';

export const HasOrganizationGuard: CanActivateFn = (_route, state) => {
  const sessionState = inject(SessionStateService);
  const router = inject(Router);
  const redirect = (url: string) => {
    router.navigateByUrl(url, { replaceUrl: true });
    return false;
  };

  if (!sessionState.isAuthenticated()) {
    return redirect('/auth/login');
  }

  const pending = sessionState.getPendingOrgSetup();
  if (pending) {
    return redirect('/org/setup');
  }

  if (!sessionState.hasOrganizations()) {
    return redirect('/org/setup');
  }

  if (sessionState.hasDefaults()) {
    return redirect('/app/home');
  }

  return true;
};
