import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter, Subject, takeUntil } from 'rxjs';
import { Button, ButtonModule } from 'primeng/button';
import { Menubar } from 'primeng/menubar';
import { MenuItem } from 'primeng/api';
import { Badge } from 'primeng/badge';
import { Ripple } from 'primeng/ripple';

import { AuthService } from '../../../../core/auth/auth.service';
import { ThemeService } from '../../../../core/theme/theme.service';
import { RealtimeSocketService } from '../../../../core/services/realtime-socket.service';
import { CompanyStateService } from '../../../../core/company/company-state.service';
import { WorkspaceModulesService } from '../../../../core/workspace/workspace-modules.service';

@Component({
  selector: 'app-workspace-shell',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterOutlet, ButtonModule, Menubar, Badge, Ripple],
  templateUrl: './workspace-shell.component.html',
  styleUrl: './workspace-shell.component.scss',
})
export class WorkspaceShellComponent implements OnInit, OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly theme = inject(ThemeService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly realtimeSocket = inject(RealtimeSocketService);
  private readonly companyState = inject(CompanyStateService);
  private readonly workspaceModules = inject(WorkspaceModulesService);
  private readonly destroy$ = new Subject<void>();

  workspaceId: string | null = null;
  userRole: string | null = null;
  items: MenuItem[] = [];
  enabledModuleKeys = new Set<string>();
  readonly theme$ = this.theme.theme$;
  readonly isAuthenticated$ = this.auth.isAuthenticated$;

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      const workspaceId = params.get('id') ?? params.get('workspaceId');
      this.workspaceId = workspaceId;
      if (workspaceId) {
        this.companyState.setActiveCompanyId(workspaceId);
        this.loadModules(workspaceId);
        this.realtimeSocket.connect();
      } else {
        this.userRole = null;
      }
      this.items = this.buildMenuItems();
    });

    this.workspaceModules.overview$.pipe(takeUntil(this.destroy$)).subscribe((overview) => {
      this.userRole = overview?.userRole ?? null;
      const enabled = overview?.enabledModules ?? [];
      this.enabledModuleKeys = new Set(
        enabled.filter((module) => module.enabled).map((module) => module.key)
      );
      this.items = this.buildMenuItems();
    });

    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.items = this.buildMenuItems();
      });
  }

  ngOnDestroy(): void {
    this.realtimeSocket.disconnect();
    this.destroy$.next();
    this.destroy$.complete();
  }

  goToWorkspaces(): void {
    this.router.navigate(['/companies/select']);
  }

  toggleTheme(): void {
    this.theme.toggleTheme();
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  canManageModules(): boolean {
    return this.userRole === 'owner';
  }

  private loadModules(workspaceId: string): void {
    this.workspaceModules.load(workspaceId).subscribe({
      next: () => {
        // state updated via service
      },
      error: (error) => {
        const status = error?.status;
        if (status === 403 || status === 404) {
          this.router.navigate(['/companies/select']);
          return;
        }
        this.router.navigate(['/companies/select']);
      },
    });
  }

  onMenuItemClick(item: MenuItem, event: Event): void {
    if (!item.routerLink) {
      return;
    }

    event.preventDefault();
    if (Array.isArray(item.routerLink)) {
      this.router.navigate(item.routerLink);
      return;
    }

    this.router.navigateByUrl(item.routerLink);
  }

  private buildMenuItems(): MenuItem[] {
    const isWorkspaceRoot = this.router.url.startsWith('/company/');
    if (isWorkspaceRoot && this.workspaceId) {
      const setupCompleted = this.companyState.getActiveCompanySetupCompleted() !== false;
      if (!setupCompleted) {
        return [
          { label: 'Configuracion', routerLink: ['/company', this.workspaceId, 'setup'] },
          { label: 'Organizaciones', routerLink: ['/companies/select'] },
        ];
      }

      const items: MenuItem[] = [{ label: 'Dashboard', routerLink: ['/company', this.workspaceId, 'dashboard'] }];
      const moduleMenus: Array<{ key: string; label: string; route: string[] }> = [
        { key: 'products', label: 'Products', route: ['/company', this.workspaceId, 'products'] },
        { key: 'inventory', label: 'Inventory', route: ['/company', this.workspaceId, 'inventory/stock'] },
        { key: 'pos', label: 'POS', route: ['/company', this.workspaceId, 'pos'] },
        { key: 'reports', label: 'Reports', route: ['/company', this.workspaceId, 'reports'] },
      ];

      moduleMenus.forEach((menu) => {
        if (this.enabledModuleKeys.has(menu.key)) {
          items.push({ label: menu.label, routerLink: menu.route });
        }
      });

      const settingsItems: MenuItem[] = [];
      moduleMenus.forEach((menu) => {
        if (this.enabledModuleKeys.has(menu.key)) {
          settingsItems.push({
            label: menu.label,
            routerLink: ['/company', this.workspaceId, 'settings', menu.key],
          });
        }
      });

      if (this.userRole === 'owner') {
        settingsItems.push({ label: 'Core Settings', routerLink: ['/company', this.workspaceId, 'settings/core'] });
        settingsItems.push({ label: 'Branches', routerLink: ['/company', this.workspaceId, 'settings/branches'] });
        settingsItems.push({ label: 'Warehouses', routerLink: ['/company', this.workspaceId, 'settings/warehouses'] });
        settingsItems.push({ label: 'Modules', routerLink: ['/company', this.workspaceId, 'settings/modules'] });
        settingsItems.push({ label: 'Roles', routerLink: ['/company', this.workspaceId, 'settings/roles'] });
      }

      if (settingsItems.length > 0) {
        items.push({ label: 'Settings', items: settingsItems });
      }

      return items;
    }

    return [{ label: 'Organizaciones', routerLink: ['/companies/select'] }];
  }
}
