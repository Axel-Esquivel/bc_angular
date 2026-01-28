import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of, switchMap, take } from 'rxjs';

import { AuthService } from '../auth/auth.service';
import { OrganizationsService } from '../api/organizations-api.service';
import { WorkspacesApiService } from '../api/workspaces-api.service';
import { Workspace } from '../../shared/models/workspace.model';

const getCompanyId = (company: Workspace | null | undefined): string | null =>
  company?.id ?? company?._id ?? null;

export const OnboardingGuard: CanActivateFn = (_route, state) => {
  const authService = inject(AuthService);
  const organizationsApi = inject(OrganizationsService);
  const workspacesApi = inject(WorkspacesApiService);
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

          if (
            state.url.startsWith('/onboarding') ||
            state.url.startsWith('/organizations/entry') ||
            state.url.startsWith('/organizations/pending')
          ) {
            return workspacesApi.listMine().pipe(
              map((res) => {
                const companies = res.result?.workspaces ?? [];
                const defaultId = res.result?.defaultWorkspaceId ?? user.defaultWorkspaceId ?? null;
                const resolvedDefault =
                  defaultId && companies.some((company) => getCompanyId(company) === defaultId)
                    ? defaultId
                    : null;
                return resolvedDefault
                  ? router.parseUrl(`/company/${resolvedDefault}/dashboard`)
                  : router.parseUrl('/organizations/setup');
              }),
              catchError(() => of(router.parseUrl('/organizations/setup'))),
            );
          }

          return of(true);
        }),
        catchError(() => of(router.parseUrl('/organizations/entry'))),
      );
    }),
    catchError(() => of(router.parseUrl('/login'))),
  );
};
