import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';

import { SessionStateService } from '../services/session-state.service';
import { ActiveContextStateService } from '../context/active-context-state.service';
import { OrganizationsService } from '../api/organizations-api.service';
import { AuthService } from '../auth/auth.service';

export const SetupModulesGuard: CanActivateFn = () => {
  const sessionState = inject(SessionStateService);
  const activeContextState = inject(ActiveContextStateService);
  const organizationsApi = inject(OrganizationsService);
  const authService = inject(AuthService);
  const router = inject(Router);
  const redirect = (url: string) => {
    router.navigateByUrl(url, { replaceUrl: true });
    return false;
  };

  if (!sessionState.isAuthenticated()) {
    return redirect('/auth/login');
  }

  const organizationId = activeContextState.getActiveContext().organizationId;
  if (!organizationId) {
    return redirect('/context/select');
  }

  return organizationsApi.getById(organizationId).pipe(
    map((response) => {
      const organization = response.result;
      const userId = authService.getCurrentUser()?.id ?? null;
      const isOwner =
        Boolean(organization?.ownerUserId && organization.ownerUserId === userId) ||
        (organization?.members ?? []).some((member) => member.userId === userId && member.roleKey === 'owner');
      if (isOwner) {
        return true;
      }
      return redirect('/app');
    }),
    catchError(() => of(redirect('/app'))),
  );
};
