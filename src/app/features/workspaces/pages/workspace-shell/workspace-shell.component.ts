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
import { WorkspaceStateService } from '../../../../core/workspace/workspace-state.service';
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
  private readonly workspaceState = inject(WorkspaceStateService);
  private readonly workspaceModules = inject(WorkspaceModulesService);
  private readonly destroy$ = new Subject<void>();

  workspaceId: string | null = null;
  userRole: 'admin' | 'member' | null = null;
  items: MenuItem[] = [];
  enabledModuleKeys = new Set<string>();
  readonly theme$ = this.theme.theme$;
  readonly isAuthenticated$ = this.auth.isAuthenticated$;

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      const workspaceId = params.get('id') ?? params.get('workspaceId');
      this.workspaceId = workspaceId;
      if (workspaceId) {
        this.workspaceState.setActiveWorkspaceId(workspaceId);
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
    this.router.navigate(['/workspaces/select']);
  }

  toggleTheme(): void {
    this.theme.toggleTheme();
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  canManageModules(): boolean {
    return this.userRole === 'admin';
  }

  private loadModules(workspaceId: string): void {
    this.workspaceModules.load(workspaceId).subscribe({
      next: () => {
        // state updated via service
      },
      error: (error) => {
        const status = error?.status;
        if (status === 403 || status === 404) {
          this.router.navigate(['/workspaces/select']);
          return;
        }
        this.router.navigate(['/workspaces/select']);
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
    const isWorkspaceRoot = this.router.url.startsWith('/workspace/');
    if (isWorkspaceRoot && this.workspaceId) {
      const setupCompleted = this.workspaceState.getActiveWorkspaceSetupCompleted() !== false;
      if (!setupCompleted) {
        return [
          { label: 'Setup', routerLink: ['/workspaces', this.workspaceId, 'setup'] },
          { label: 'Workspaces', routerLink: ['/workspaces/select'] },
        ];
      }

      const items: MenuItem[] = [{ label: 'Dashboard', routerLink: ['/workspace', this.workspaceId, 'dashboard'] }];
      const moduleMenus: Array<{ key: string; label: string; route: string[] }> = [
        { key: 'products', label: 'Products', route: ['/workspace', this.workspaceId, 'products'] },
        { key: 'inventory', label: 'Inventory', route: ['/workspace', this.workspaceId, 'inventory/stock'] },
        { key: 'pos', label: 'POS', route: ['/workspace', this.workspaceId, 'pos'] },
        { key: 'reports', label: 'Reports', route: ['/workspace', this.workspaceId, 'reports'] },
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
            routerLink: ['/workspace', this.workspaceId, 'settings', menu.key],
          });
        }
      });

      if (this.userRole === 'admin') {
        settingsItems.push({ label: 'Modules', routerLink: ['/workspace', this.workspaceId, 'settings/modules'] });
      }

      if (settingsItems.length > 0) {
        items.push({ label: 'Settings', items: settingsItems });
      }

      return items;
    }

    return [{ label: 'Workspaces', routerLink: ['/workspaces/select'] }];
  }
}
