import { inject } from '@angular/core';
import { CanActivateFn, Router, Routes } from '@angular/router';
import { catchError, map, of } from 'rxjs';

import { PriceListsPageComponent } from './pages/price-lists-page/price-lists-page.component';
import { PriceListFormPageComponent } from './pages/price-list-form-page/price-list-form-page.component';
import { OrganizationsService } from '../../core/api/organizations-api.service';
import { ActiveContextStateService } from '../../core/context/active-context-state.service';
import { AuthService } from '../../core/auth/auth.service';

const priceListsGuard: CanActivateFn = () => {
  const organizationsApi = inject(OrganizationsService);
  const activeContext = inject(ActiveContextStateService);
  const authService = inject(AuthService);
  const router = inject(Router);

  const context = activeContext.getActiveContext();
  const user = authService.getCurrentUser();
  const organizationId =
    context.organizationId ?? user?.defaults?.organizationId ?? user?.defaultOrganizationId ?? null;

  if (!organizationId) {
    return router.parseUrl('/context/select');
  }

  return organizationsApi.getModulesOverview(organizationId).pipe(
    map((response) => {
      const modules = response.result?.modules ?? [];
      const enabled = modules.some(
        (module) => module.key === 'price-lists' && module.state?.status !== 'disabled' && !module.isSystem,
      );
      return enabled ? true : router.parseUrl('/app/modules/store');
    }),
    catchError(() => of(router.parseUrl('/app/modules/store'))),
  );
};

export const priceListsRoutes: Routes = [
  { path: '', component: PriceListsPageComponent, canActivate: [priceListsGuard] },
  { path: 'new', component: PriceListFormPageComponent, canActivate: [priceListsGuard] },
  { path: ':id/edit', component: PriceListFormPageComponent, canActivate: [priceListsGuard] },
];
