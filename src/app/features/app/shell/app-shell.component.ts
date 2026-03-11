import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MegaMenu } from 'primeng/megamenu';
import { MegaMenuItem, MenuItem } from 'primeng/api';
import { take } from 'rxjs';

import { OrganizationsService } from '../../../core/api/organizations-api.service';
import { ActiveContextStateService } from '../../../core/context/active-context-state.service';
import { AuthService } from '../../../core/auth/auth.service';
import { OrganizationModuleOverviewItem } from '../../../shared/models/organization-modules.model';

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

  menuItems: MegaMenuItem[] = [];

  ngOnInit(): void {
    const context = this.activeContextState.getActiveContext();
    const user = this.authService.getCurrentUser();
    const organizationId =
      context.organizationId ?? user?.defaults?.organizationId ?? user?.defaultOrganizationId ?? null;

    if (!organizationId) {
      this.menuItems = this.buildMenu(false);
      return;
    }

    this.organizationsApi
      .getModulesOverview(organizationId)
      .pipe(take(1))
      .subscribe({
        next: (response) => {
          const modules = response.result?.modules ?? [];
          const priceListsEnabled = this.isModuleEnabled(modules, 'price-lists');
          this.menuItems = this.buildMenu(priceListsEnabled);
        },
        error: () => {
          this.menuItems = this.buildMenu(false);
        },
      });
  }

  private buildMenu(showPriceLists: boolean): MegaMenuItem[] {
    const catalogItems: MenuItem[] = [];
    if (showPriceLists) {
      catalogItems.push({
        label: 'Listas de precios',
        icon: 'pi pi-tag',
        routerLink: '/app/price-lists',
      });
    }

    const configGroups: MenuItem[] = [
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
}
