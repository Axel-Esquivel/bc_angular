import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';

import { OrganizationsService } from '../api/organizations-api.service';

export const OrganizationBootstrapGuard: CanActivateFn = () => {
  const organizationsApi = inject(OrganizationsService);
  const router = inject(Router);

  return organizationsApi.listMemberships().pipe(
    map((response) => {
      const memberships = response.result ?? [];
      const hasActive = memberships.some((membership) => membership.status === 'active');
      const hasPending = memberships.some((membership) => membership.status === 'pending');

      if (hasPending && !hasActive) {
        return router.parseUrl('/organizations/pending');
      }
      if (!hasActive) {
        return router.parseUrl('/organizations/entry');
      }
      return true;
    }),
    catchError(() => of(router.parseUrl('/organizations/entry')))
  );
};
