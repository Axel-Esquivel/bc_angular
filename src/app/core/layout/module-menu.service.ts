import { Injectable, inject } from '@angular/core';
import { Observable, catchError, combineLatest, map, of, shareReplay } from 'rxjs';
import { MenuItem } from 'primeng/api';

import { ModulesApiService } from '../api/modules-api.service';
import { DashboardApiService } from '../api/dashboard-api.service';
import { CompanyStateService } from '../company/company-state.service';
import { ModuleInfo } from '../../shared/models/module.model';

@Injectable({ providedIn: 'root' })
export class ModuleMenuService {
  private readonly modulesApi = inject(ModulesApiService);
  private readonly dashboardApi = inject(DashboardApiService);
  private readonly companyState = inject(CompanyStateService);

  private readonly moduleRouteMap: Record<string, string> = {
    dashboard: '/dashboard',
    products: '/products',
    inventory: '/inventory/stock',
    pos: '/pos',
  };

  getMenuItems(): Observable<MenuItem[]> {
    const companyId = this.companyState.getActiveCompanyId() ?? undefined;
    const overview$ = this.dashboardApi.getOverview({ companyId }).pipe(
      map((response) => response.result ?? null),
      catchError(() => of(null))
    );

    return combineLatest([this.modulesApi.getModules(), overview$]).pipe(
      map(([response, overview]) => {
        const modules = response.result ?? [];
        const moduleItems = modules.filter((module) => module.enabled).map((module) => this.toMenuItem(module));
        return this.buildMenu(moduleItems, overview?.currentOrgRoleKey === 'owner', overview?.currentOrgId ?? null, companyId);
      }),
      catchError(() => of(this.buildMenu([], false, null, companyId))),
      shareReplay(1)
    );
  }

  private toMenuItem(module: ModuleInfo): MenuItem {
    return {
      label: this.formatLabel(module.name),
      routerLink: this.moduleRouteMap[module.name] ?? `/${module.name}`,
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
      configItems.push({ label: 'Setup organizacion', routerLink: '/organizations/setup' });
      configItems.push({ label: 'Organizacion', routerLink: '/organizations' });
      const setupItem: MenuItem = { label: 'Instalacion de modulos', routerLink: '/setup/modules' };
      if (organizationId) {
        setupItem.queryParams = companyId ? { orgId: organizationId, companyId } : { orgId: organizationId };
      }
      configItems.push(setupItem);
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
      { label: 'Dashboard', routerLink: '/dashboard' },
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


