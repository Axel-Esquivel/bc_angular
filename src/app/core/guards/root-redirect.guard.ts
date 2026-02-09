import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';

import { SessionStateService } from '../services/session-state.service';
import { UsersApiService } from '../api/users-api.service';
import { AuthService } from '../auth/auth.service';
import { ActiveContextStateService } from '../context/active-context-state.service';
import { CompanyStateService } from '../company/company-state.service';

export const RootRedirectGuard: CanActivateFn = () => {
  const sessionState = inject(SessionStateService);
  const usersApi = inject(UsersApiService);
  const authService = inject(AuthService);
  const activeContextState = inject(ActiveContextStateService);
  const companyState = inject(CompanyStateService);
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

  const user = authService.getCurrentUser();
  const defaultContext = user?.preferences?.defaultContext;
  if (!defaultContext) {
    return redirect('/context/select');
  }

  return usersApi.validateDefaultContext(defaultContext).pipe(
    map((response) => {
      const result = response.result;
      if (result?.isComplete && result.isValid && result.sanitizedContext) {
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
        return redirect('/dashboard');
      }
      return redirect('/context/select');
    }),
    catchError(() => of(redirect('/context/select'))),
  );
};
