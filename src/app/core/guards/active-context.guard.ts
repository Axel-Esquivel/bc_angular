import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { ActiveContextStateService } from '../context/active-context-state.service';

export const ActiveContextGuard: CanActivateFn = () => {
  const router = inject(Router);
  const activeContextState = inject(ActiveContextStateService);

  const current = activeContextState.loadFromStorage();
  if (activeContextState.hasMinimumContext(current)) {
    return true;
  }

  return router.createUrlTree(['/context/select']);
};
