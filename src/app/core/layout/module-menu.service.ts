import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of, shareReplay } from 'rxjs';
import { MenuItem } from 'primeng/api';

import { ModulesApiService } from '../api/modules-api.service';
import { ModuleInfo } from '../../shared/models/module.model';

@Injectable({ providedIn: 'root' })
export class ModuleMenuService {
  private readonly modulesApi = inject(ModulesApiService);

  private readonly moduleRouteMap: Record<string, string> = {
    dashboard: '/dashboard',
    products: '/products',
    inventory: '/inventory/stock',
    pos: '/pos',
  };

  getMenuItems(): Observable<MenuItem[]> {
    return this.modulesApi.getModules().pipe(
      map((response) => {
        const modules = response.result ?? [];
        const moduleItems = modules.filter((module) => module.enabled).map((module) => this.toMenuItem(module));
        return this.buildMenu(moduleItems);
      }),
      catchError(() => of(this.buildMenu([]))),
      shareReplay(1)
    );
  }

  private toMenuItem(module: ModuleInfo): MenuItem {
    return {
      label: this.formatLabel(module.name),
      routerLink: this.moduleRouteMap[module.name] ?? `/${module.name}`,
    };
  }

  private buildMenu(moduleItems: MenuItem[]): MenuItem[] {
    return [
      { label: 'Dashboard', routerLink: '/dashboard' },
      ...moduleItems,
      { label: 'Configuración', items: [{ label: 'Módulos', routerLink: '/settings/modules' }] },
    ];
  }

  private formatLabel(name: string): string {
    if (!name) {
      return '';
    }

    return name.charAt(0).toUpperCase() + name.slice(1);
  }
}
