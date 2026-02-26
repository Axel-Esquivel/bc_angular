import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { SessionStateService } from '../services/session-state.service';

export const NoOrganizationGuard: CanActivateFn = (_route, state) => {
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
    if (state.url.startsWith('/setup/create')) {
      return history.state?.continueSetup ? true : redirect('/setup');
    }
    return true;
  }

  if (sessionState.hasOrganizations()) {
    return redirect(sessionState.hasDefaults() ? '/app' : '/context/select');
  }

  return true;
};
