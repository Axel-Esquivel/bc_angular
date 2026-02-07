import { Injectable, inject } from '@angular/core';
import { Observable, catchError, combineLatest, map, of, shareReplay } from 'rxjs';
import { MenuItem } from 'primeng/api';

import { DashboardApiService } from '../api/dashboard-api.service';
import { CompanyStateService } from '../company/company-state.service';
import { OrganizationsService } from '../api/organizations-api.service';
import { AuthService } from '../auth/auth.service';
import { ActiveContextStateService } from '../context/active-context-state.service';
import { OrganizationModuleOverviewItem } from '../../shared/models/organization-modules.model';

@Injectable({ providedIn: 'root' })
export class ModuleMenuService {
  private readonly dashboardApi = inject(DashboardApiService);
  private readonly companyState = inject(CompanyStateService);
  private readonly organizationsApi = inject(OrganizationsService);
  private readonly authService = inject(AuthService);
  private readonly activeContextState = inject(ActiveContextStateService);

  private readonly moduleRouteMap: Record<string, string> = {
    dashboard: '/app',
    products: '/app/products',
    inventory: '/app/inventory',
    pos: '/app/pos',
  };

  getMenuItems(): Observable<MenuItem[]> {
    const companyId = this.companyState.getActiveCompanyId() ?? undefined;
    const overview$ = this.dashboardApi.getOverview({ companyId }).pipe(
      map((response) => response.result ?? null),
      catchError(() => of(null))
    );

    const user = this.authService.getCurrentUser();
    const organizationId =
      this.activeContextState.getActiveContext().organizationId ??
      user?.defaults?.organizationId ??
      user?.defaultOrganizationId ??
      null;
    if (!organizationId) {
      return overview$.pipe(
        map((overview) =>
          this.buildMenu([], overview?.currentOrgRoleKey === 'owner', overview?.currentOrgId ?? null, companyId)
        ),
        catchError(() => of(this.buildMenu([], false, null, companyId))),
        shareReplay(1)
      );
    }

    const modules$ = this.organizationsApi.getModules(organizationId).pipe(
      map((response) => response.result?.modules ?? []),
      catchError(() => of([] as OrganizationModuleOverviewItem[]))
    );

    return combineLatest([modules$, overview$]).pipe(
      map(([modules, overview]) => {
        const moduleItems = modules
          .filter((module) => module.state?.status !== 'disabled' && !module.isSystem)
          .map((module) => this.toMenuItem(module));
        return this.buildMenu(
          moduleItems,
          overview?.currentOrgRoleKey === 'owner',
          overview?.currentOrgId ?? null,
          companyId
        );
      }),
      catchError(() => of(this.buildMenu([], false, null, companyId))),
      shareReplay(1)
    );
  }

  private toMenuItem(module: OrganizationModuleOverviewItem): MenuItem {
    return {
      label: this.formatLabel(module.name || module.key),
      routerLink: this.moduleRouteMap[module.key] ?? `/app/${module.key}`,
    };
  }

  private buildMenu(
    moduleItems: MenuItem[],
    isOwner: boolean,
    organizationId: string | null,
    companyId?: string,
  ): MenuItem[] {
    const configItems: MenuItem[] = [];
    if (isOwner) {
      if (companyId) {
        configItems.push({
          label: 'Configuracion de modulos',
          routerLink: ['/companies', companyId, 'settings/modules'],
        });
      }
      configItems.push({
        label: 'Catalogos',
        items: [{ label: 'Paises', routerLink: '/settings/countries' }],
      });
    }

    return [
      { label: 'Dashboard', routerLink: '/app' },
      ...moduleItems,
      ...(configItems.length > 0 ? [{ label: 'Configuracion', items: configItems }] : []),
    ];
  }

  private formatLabel(name: string): string {
    if (!name) {
      return '';
    }

    return name.charAt(0).toUpperCase() + name.slice(1);
  }
}


