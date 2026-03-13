import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MegaMenu } from 'primeng/megamenu';
import { MegaMenuItem, MenuItem } from 'primeng/api';
import { catchError, combineLatest, map, of, take } from 'rxjs';

import { OrganizationsService } from '../../../core/api/organizations-api.service';
import { ActiveContextStateService } from '../../../core/context/active-context-state.service';
import { AuthService } from '../../../core/auth/auth.service';
import { DashboardApiService } from '../../../core/api/dashboard-api.service';
import { OrganizationModuleOverviewItem } from '../../../shared/models/organization-modules.model';
import { DashboardOverview } from '../../../shared/models/dashboard.model';

@Component({
  selector: 'app-app-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, MegaMenu],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.scss',
})
export class AppShellComponent implements OnInit {
  private readonly organizationsApi = inject(OrganizationsService);
  private readonly activeContextState = inject(ActiveContextStateService);
  private readonly authService = inject(AuthService);
  private readonly dashboardApi = inject(DashboardApiService);

  menuItems: MegaMenuItem[] = [];

  ngOnInit(): void {
    const context = this.activeContextState.getActiveContext();
    const user = this.authService.getCurrentUser();
    const organizationId =
      context.organizationId ?? user?.defaults?.organizationId ?? user?.defaultOrganizationId ?? null;

    if (!organizationId) {
      this.menuItems = this.buildMenu(false, []);
      return;
    }

    const companyId = context.companyId ?? undefined;
    const modules$ = this.organizationsApi.getModulesOverview(organizationId).pipe(
      map((response) => response.result?.modules ?? []),
      catchError(() => of([] as OrganizationModuleOverviewItem[])),
    );
    const overview$ = this.dashboardApi.getOverview({ orgId: organizationId, companyId }).pipe(
      map((response) => response.result ?? null),
      catchError(() => of(null as DashboardOverview | null)),
    );

    combineLatest([modules$, overview$])
      .pipe(take(1))
      .subscribe({
        next: ([modules, overview]) => {
          const priceListsEnabled = this.isModuleEnabled(modules, 'price-lists');
          const permissions = overview?.permissions ?? [];
          this.menuItems = this.buildMenu(priceListsEnabled, permissions);
        },
        error: () => {
          this.menuItems = this.buildMenu(false, []);
        },
      });
  }

  private buildMenu(showPriceLists: boolean, permissions: string[]): MegaMenuItem[] {
    const catalogItems: MenuItem[] = [];
    if (showPriceLists) {
      catalogItems.push({
        label: 'Listas de precios',
        icon: 'pi pi-tag',
        routerLink: '/app/price-lists',
      });
    }

    const organizationItems: MenuItem[] = [];
    if (this.hasPermission(permissions, 'users.read') || this.hasPermission(permissions, 'users.write')) {
      organizationItems.push({
        label: 'Miembros de la organización',
        icon: 'pi pi-users',
        routerLink: '/app/settings/members',
      });
    }

    const posItems: MenuItem[] = [];
    if (this.hasPermission(permissions, 'pos.configure')) {
      posItems.push({
        label: 'Configuración POS',
        icon: 'pi pi-cog',
        routerLink: '/app/pos/configs',
      });
    }

    const configGroups: MenuItem[] = [
      ...(organizationItems.length > 0 ? [{ label: 'Organización', items: organizationItems }] : []),
      ...(posItems.length > 0 ? [{ label: 'POS', items: posItems }] : []),
      {
        label: 'Módulos',
        items: [
          {
            label: 'Ajustes',
            icon: 'pi pi-cog',
            routerLink: '/app/settings/modules',
          },
          {
            label: 'Empaques',
            icon: 'pi pi-box',
            routerLink: '/app/settings/packaging',
          },
          {
            label: 'Tienda de módulos',
            icon: 'pi pi-shopping-bag',
            routerLink: '/app/modules/store',
            queryParams: { returnUrl: '/app/home' },
          },
        ],
      },
    ];

    if (catalogItems.length > 0) {
      configGroups.push({
        label: 'Catálogos',
        items: catalogItems,
      });
    }

    const operationItems: MenuItem[][] = [
      [
        {
          label: 'Home',
          items: [{ label: 'Inicio', icon: 'pi pi-home', routerLink: '/app/home' }],
        },
        {
          label: 'Ventas',
          items: [{ label: 'POS', icon: 'pi pi-shopping-cart', routerLink: '/app/pos' }],
        },
        {
          label: 'Inventario',
          items: [{ label: 'Stock', icon: 'pi pi-box', routerLink: '/app/inventory' }],
        },
      ],
      [
        {
          label: 'Catálogo',
          items: [{ label: 'Productos', icon: 'pi pi-tags', routerLink: '/app/products' }],
        },
      ],
    ];

    return [
      {
        label: 'Operación',
        items: operationItems,
      },
      {
        label: 'Configuración',
        items: [configGroups],
      },
    ];
  }

  private isModuleEnabled(modules: OrganizationModuleOverviewItem[], key: string): boolean {
    const module = modules.find((item) => item.key === key);
    return Boolean(module && module.state?.status !== 'disabled' && !module.isSystem);
  }

  private hasPermission(permissions: string[], required: string): boolean {
    if (permissions.includes('*') || permissions.includes(required)) {
      return true;
    }
    return permissions.some((permission) => {
      if (!permission.endsWith('.*')) {
        return false;
      }
      const prefix = permission.slice(0, -1);
      return required.startsWith(prefix);
    });
  }
}
