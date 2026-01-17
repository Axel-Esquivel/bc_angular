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
  private readonly workspaceState = inject(WorkspaceStateService);
  private readonly workspaceModules = inject(WorkspaceModulesService);
  private readonly destroy$ = new Subject<void>();

  workspaceId: string | null = null;
  userRole: 'admin' | 'member' | null = null;
  items: MenuItem[] = [];
  readonly theme$ = this.theme.theme$;
  readonly isAuthenticated$ = this.auth.isAuthenticated$;

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      const workspaceId = params.get('id') ?? params.get('workspaceId');
      this.workspaceId = workspaceId;
      if (workspaceId) {
        this.workspaceState.setActiveWorkspaceId(workspaceId);
        this.loadModules(workspaceId);
      } else {
        this.userRole = null;
      }
      this.items = this.buildMenuItems();
    });

    this.workspaceModules.overview$.pipe(takeUntil(this.destroy$)).subscribe((overview) => {
      this.userRole = overview?.userRole ?? null;
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
      return [
        { label: 'Dashboard', routerLink: ['/workspace', this.workspaceId, 'dashboard'] },
        { label: 'Products', routerLink: ['/workspace', this.workspaceId, 'products'] },
        { label: 'POS', routerLink: ['/workspace', this.workspaceId, 'pos'] },
        { label: 'Reports', routerLink: ['/workspace', this.workspaceId, 'reports'] },
        { label: 'Settings', items: [{ label: 'Modules', routerLink: ['/workspace', this.workspaceId, 'settings/modules'] }] },
      ];
    }

    return [{ label: 'Workspaces', routerLink: ['/workspaces/select'] }];
  }
}
