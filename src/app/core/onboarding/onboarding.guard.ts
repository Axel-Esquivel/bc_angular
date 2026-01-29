import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, of, switchMap, take } from 'rxjs';

import { AuthService } from '../auth/auth.service';
import { OrganizationsService } from '../api/organizations-api.service';
import { ActiveContextStateService } from '../context/active-context-state.service';

export const OnboardingGuard: CanActivateFn = (_route, state) => {
  const authService = inject(AuthService);
  const organizationsApi = inject(OrganizationsService);
  const activeContextState = inject(ActiveContextStateService);
  const router = inject(Router);

  if (!authService.hasToken()) {
    return router.parseUrl('/login');
  }

  const currentUser = authService.getCurrentUser();
  const user$ = currentUser ? of(currentUser) : authService.loadMe().pipe(take(1));

  return user$.pipe(
    switchMap((user) => {
      if (!user) {
        return of(router.parseUrl('/login'));
      }

      return organizationsApi.listMemberships().pipe(
        switchMap((response) => {
          const memberships = response.result ?? [];
          const hasActive = memberships.some((membership) => membership.status === 'active');
          const hasPending = memberships.some((membership) => membership.status === 'pending');

          if (hasPending && !hasActive) {
            if (state.url.startsWith('/organizations/pending')) {
              return of(true);
            }
            return of(router.parseUrl('/organizations/pending'));
          }

          if (!hasActive) {
            if (state.url.startsWith('/organizations/entry')) {
              return of(true);
            }
            return of(router.parseUrl('/organizations/entry'));
          }

          const defaultOrganizationId = user.defaultOrganizationId ?? null;
          if (!defaultOrganizationId) {
            if (state.url.startsWith('/organizations/select')) {
              return of(true);
            }
            return of(router.parseUrl('/organizations/select'));
          }

          const activeContext = activeContextState.getActiveContext();
          const shouldRedirect =
            state.url.startsWith('/onboarding') ||
            state.url.startsWith('/organizations/entry') ||
            state.url.startsWith('/organizations/pending') ||
            state.url.startsWith('/organizations/select') ||
            state.url.startsWith('/organizations/setup') ||
            state.url.startsWith('/companies/select');

          if (activeContextState.isComplete(activeContext)) {
            if (shouldRedirect && activeContext.companyId) {
              return of(router.parseUrl(`/company/${activeContext.companyId}/dashboard`));
            }
            return of(true);
          }

          if (activeContext.organizationId || defaultOrganizationId) {
            if (!activeContext.companyId) {
              if (state.url.startsWith('/companies/select')) {
                return of(true);
              }
              return of(router.parseUrl('/companies/select'));
            }
            return of(router.parseUrl('/organizations/setup'));
          }

          return of(router.parseUrl('/organizations/select'));
        }),
        catchError(() => of(router.parseUrl('/organizations/entry'))),
      );
    }),
    catchError(() => of(router.parseUrl('/login'))),
  );
};
