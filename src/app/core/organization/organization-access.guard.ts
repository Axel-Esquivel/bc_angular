import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';

import { OrganizationsService } from '../api/organizations-api.service';

export const OrganizationAccessGuard: CanActivateFn = () => {
  const organizationsApi = inject(OrganizationsService);
  const router = inject(Router);

  return organizationsApi.listMemberships().pipe(
    map((response) => {
      const memberships = response.result ?? [];
      const hasActive = memberships.some((membership) => membership.status === 'active');
      if (hasActive) {
        return true;
      }
      return router.parseUrl('/onboarding');
    }),
    catchError(() => of(router.parseUrl('/onboarding')))
  );
};
