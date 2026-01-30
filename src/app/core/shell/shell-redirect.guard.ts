import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';

import { AuthService } from '../auth/auth.service';
import { OrganizationsService } from '../api/organizations-api.service';
import { ActiveContextStateService } from '../context/active-context-state.service';

export const ShellRedirectGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const organizationsApi = inject(OrganizationsService);
  const activeContextState = inject(ActiveContextStateService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    return router.parseUrl('/auth/login');
  }

  return organizationsApi.listMemberships().pipe(
    map((response) => {
      const memberships = response.result ?? [];
      const hasActive = memberships.some((membership) => membership.status === 'active');
      if (!hasActive) {
        return router.parseUrl('/org/setup');
      }
      const context = activeContextState.getActiveContext();
      const hasDefaults = activeContextState.isComplete(context);
      return router.parseUrl(hasDefaults ? '/app' : '/context/select');
    }),
    catchError(() => of(router.parseUrl('/org/setup')))
  );
};
