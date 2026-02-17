import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Card } from 'primeng/card';
import { Button } from 'primeng/button';
import { Skeleton } from 'primeng/skeleton';
import { Toast } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { OrganizationsService } from '../../../../core/api/organizations-api.service';
import { ActiveContextStateService } from '../../../../core/context/active-context-state.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { OrganizationModuleOverviewItem } from '../../../../shared/models/organization-modules.model';
import { ApiResponse } from '../../../../shared/models/api-response.model';
import { take } from 'rxjs';

interface HomeModuleCard {
  key: string;
  name: string;
  icon: string;
  route: string;
  description?: string;
  hasRoute: boolean;
}

const MODULE_META: Record<string, { icon: string; route: string; name?: string; description?: string }> = {
  accounting: {
    icon: 'pi pi-calculator',
    route: '/app/accounting',
    name: 'Contabilidad',
    description: 'Pólizas y cuentas.',
  },
  pos: {
    icon: 'pi pi-shopping-cart',
    route: '/app/pos',
    name: 'POS',
    description: 'Ventas en punto de venta.',
  },
  inventory: {
    icon: 'pi pi-box',
    route: '/app/inventory',
    name: 'Inventario',
    description: 'Stock y movimientos.',
  },
  purchases: {
    icon: 'pi pi-shopping-bag',
    route: '/app/purchases',
    name: 'Compras',
    description: 'Órdenes y recepción.',
  },
  products: {
    icon: 'pi pi-tags',
    route: '/app/products',
    name: 'Productos',
    description: 'Catálogo y variantes.',
  },
  catalogs: {
    icon: 'pi pi-tags',
    route: '/app/catalogs/products',
    name: 'Catálogos',
    description: 'Catálogo de productos.',
  },
  customers: {
    icon: 'pi pi-users',
    route: '/app/customers',
    name: 'Clientes',
  },
  providers: {
    icon: 'pi pi-truck',
    route: '/app/providers',
    name: 'Proveedores',
  },
  reports: {
    icon: 'pi pi-chart-bar',
    route: '/app/reports',
    name: 'Reportes',
  },
  companies: {
    icon: 'pi pi-building',
    route: '/app/companies',
    name: 'Empresas',
  },
  warehouses: {
    icon: 'pi pi-box',
    route: '/app/warehouses',
    name: 'Almacenes',
  },
  branches: {
    icon: 'pi pi-sitemap',
    route: '/app/branches',
    name: 'Sucursales',
  },
  settings: {
    icon: 'pi pi-cog',
    route: '/app/settings',
    name: 'Configuración',
  },
};

@Component({
  selector: 'app-app-dashboard-page',
  standalone: true,
  imports: [CommonModule, Card, Button, Skeleton, Toast],
  templateUrl: './dashboard-page.component.html',
  styleUrl: './dashboard-page.component.scss',
  providers: [MessageService],
})
export class AppDashboardPageComponent implements OnInit {
  private readonly organizationsApi = inject(OrganizationsService);
  private readonly activeContextState = inject(ActiveContextStateService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);

  modules: OrganizationModuleOverviewItem[] = [];
  loading = false;
  cards: HomeModuleCard[] = [];
  readonly skeletonCards = Array.from({ length: 8 }, (_, index) => index);

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    const organizationId =
      this.activeContextState.getActiveContext().organizationId ??
      user?.defaults?.organizationId ??
      user?.defaultOrganizationId ??
      null;
    if (!organizationId) {
      this.modules = [];
      this.cards = [];
      return;
    }

    this.loading = true;
    this.organizationsApi
      .getModulesOverview(organizationId)
      .pipe(take(1))
      .subscribe({
        next: (response: ApiResponse<{ modules: OrganizationModuleOverviewItem[] }>) => {
          if (response.status === 'error') {
            this.showError(response.message || 'No se pudieron cargar los módulos.');
            this.modules = [];
            this.cards = [];
            this.loading = false;
            return;
          }
          this.modules = response?.result?.modules ?? [];
          this.cards = this.mapToCards(this.enabledModules);
          this.loading = false;
        },
        error: (error: HttpErrorResponse) => {
          this.showError(this.extractErrorMessage(error));
          this.modules = [];
          this.cards = [];
          this.loading = false;
        },
      });
  }

  get enabledModules(): OrganizationModuleOverviewItem[] {
    return this.modules.filter((module) => module.state?.status !== 'disabled' && !module.isSystem);
  }

  onCardClick(card: HomeModuleCard): void {
    if (!card.hasRoute) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Módulo sin ruta',
        detail: 'Este módulo aún no tiene ruta configurada.',
      });
      return;
    }
    void this.router.navigateByUrl(card.route);
  }

  goToStore(): void {
    void this.router.navigateByUrl('/setup/modules/store');
  }

  trackByKey(_index: number, card: HomeModuleCard): string {
    return card.key;
  }

  private mapToCards(modules: OrganizationModuleOverviewItem[]): HomeModuleCard[] {
    return modules.map((module) => {
      const meta = MODULE_META[module.key] ?? {
        icon: 'pi pi-th-large',
        route: `/app/${module.key}`,
        name: module.name || module.key,
      };
      const route = meta.route?.trim() ?? '';
      const name = meta.name ?? module.name ?? module.key;
      return {
        key: module.key,
        name,
        icon: meta.icon,
        route,
        description: meta.description,
        hasRoute: Boolean(route),
      };
    });
  }

  private showError(message: string): void {
    this.messageService.add({
      severity: 'error',
      summary: 'Error',
      detail: message,
    });
  }

  private extractErrorMessage(error: HttpErrorResponse): string {
    const payload = error.error;
    if (payload && typeof payload === 'object' && 'message' in payload) {
      const message = (payload as { message?: string }).message;
      if (typeof message === 'string' && message.trim()) {
        return message;
      }
    }
    if (error.message?.trim()) {
      return error.message;
    }
    return 'No se pudieron cargar los módulos.';
  }
}
