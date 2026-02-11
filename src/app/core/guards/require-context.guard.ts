import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of, switchMap } from 'rxjs';

import { SessionStateService } from '../services/session-state.service';
import { UsersApiService } from '../api/users-api.service';
import { AuthService } from '../auth/auth.service';
import { ActiveContextStateService } from '../context/active-context-state.service';
import { CompanyStateService } from '../company/company-state.service';
import { OrganizationsService } from '../api/organizations-api.service';

export const RequireContextGuard: CanActivateFn = (_route, state) => {
  const sessionState = inject(SessionStateService);
  const usersApi = inject(UsersApiService);
  const authService = inject(AuthService);
  const activeContextState = inject(ActiveContextStateService);
  const companyState = inject(CompanyStateService);
  const organizationsApi = inject(OrganizationsService);
  const router = inject(Router);
  const redirect = (url: string) => {
    router.navigateByUrl(url, { replaceUrl: true });
    return false;
  };

  if (!sessionState.isAuthenticated()) {
    return redirect('/auth/login');
  }

  if (state.url.startsWith('/context')) {
    return true;
  }

  const pending = sessionState.getPendingOrgSetup();
  if (pending) {
    return redirect('/org/setup');
  }

  if (!sessionState.hasOrganizations()) {
    return redirect('/org/setup');
  }

  if (!sessionState.hasDefaults()) {
    return redirect('/context/select');
  }

  const user = authService.getCurrentUser();
  const defaultContext = user?.preferences?.defaultContext;
  if (!defaultContext) {
    return redirect('/context/select');
  }

  return usersApi.validateDefaultContext(defaultContext).pipe(
    switchMap((response) => {
      const result = response.result;
      if (!result?.isComplete || !result.isValid || !result.sanitizedContext) {
        return of(redirect('/context/select'));
      }
      const ctx = result.sanitizedContext;
      activeContextState.setActiveContext({
        organizationId: ctx.organizationId ?? null,
        companyId: ctx.companyId ?? null,
        countryId: ctx.countryId ?? null,
        enterpriseId: ctx.enterpriseId ?? null,
        currencyId: ctx.currencyId ?? null,
      });
      if (ctx.companyId) {
        companyState.setActiveCompanyId(ctx.companyId);
        companyState.setDefaultCompanyId(ctx.companyId);
      }
      if (!ctx.organizationId) {
        return of(redirect('/context/select'));
      }
      return organizationsApi.getById(ctx.organizationId).pipe(
        map((orgResponse) => {
          const organization = orgResponse.result;
          const userId = user?.id ?? null;
          const isOwner =
            Boolean(organization?.ownerUserId && organization.ownerUserId === userId) ||
            (organization?.members ?? []).some((member) => member.userId === userId && member.roleKey === 'owner');
          if (isOwner && organization?.setupStatus === 'pending') {
            return redirect('/setup/modules/store');
          }
          return true;
        }),
      );
    }),
    catchError(() => of(redirect('/context/select'))),
  );
};
