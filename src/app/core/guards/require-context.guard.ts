import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../auth/auth.service';
import { ActiveContextStateService } from '../context/active-context-state.service';
import { DefaultContext } from '../../shared/models/default-context.model';

export const RequireContextGuard: CanActivateFn = () => {
  const router = inject(Router);
  const authService = inject(AuthService);
  const activeContextState = inject(ActiveContextStateService);

  const current = activeContextState.getActiveContext();
  if (activeContextState.isComplete(current)) {
    return true;
  }

  const user = authService.getCurrentUser?.() ?? authService.getCurrentUser();
  const defaults: DefaultContext | undefined = user?.preferences?.defaultContext;
  if (defaults) {
    const normalized = {
      organizationId: defaults.organizationId ?? null,
      companyId: defaults.companyId ?? null,
      countryId: defaults.countryId ?? null,
      enterpriseId: defaults.enterpriseId ?? null,
      currencyId: defaults.currencyId ?? null,
    };
    if (activeContextState.isComplete(normalized)) {
      activeContextState.setActiveContext(normalized);
      return true;
    }
  }

  return router.createUrlTree(['/context/select']);
};
