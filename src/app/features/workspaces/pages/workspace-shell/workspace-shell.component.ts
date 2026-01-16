import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter, Subject, takeUntil } from 'rxjs';
import { Button } from 'primeng/button';
import { MegaMenu } from 'primeng/megamenu';
import { MegaMenuItem } from 'primeng/api';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faMoon, faRightFromBracket } from '@fortawesome/free-solid-svg-icons';

import { AuthService } from '../../../../core/auth/auth.service';
import { ThemeService } from '../../../../core/theme/theme.service';
import { WorkspaceStateService } from '../../../../core/workspace/workspace-state.service';
import { WorkspaceModulesService } from '../../../../core/workspace/workspace-modules.service';

@Component({
  selector: 'app-workspace-shell',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterOutlet, Button, MegaMenu, FontAwesomeModule],
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
  menuItems: MegaMenuItem[] = [];
  readonly theme$ = this.theme.theme$;
  readonly isAuthenticated$ = this.auth.isAuthenticated$;
  readonly faMoon = faMoon;
  readonly faLogout = faRightFromBracket;

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
      this.menuItems = this.buildMenuItems();
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
        this.menuItems = this.buildMenuItems();
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

  private buildMenuItems(): MegaMenuItem[] {
    const isWorkspaceRoot = this.router.url.startsWith('/workspace/');
    if (isWorkspaceRoot && this.workspaceId) {
      return [
        {
          label: 'Dashboard',
          command: () => this.router.navigate(['/workspace', this.workspaceId, 'dashboard']),
        },
        {
          label: 'Products',
          command: () => this.router.navigate(['/workspace', this.workspaceId, 'products']),
        },
        {
          label: 'POS',
          command: () => this.router.navigate(['/workspace', this.workspaceId, 'pos']),
        },
        {
          label: 'Reports',
          command: () => this.router.navigate(['/workspace', this.workspaceId, 'reports']),
        },
      ];
    }

    return [
      {
        label: 'Workspaces',
        items: [
          [
            {
              items: [
                { label: 'Onboarding', command: () => this.router.navigate(['/workspaces/onboarding']) },
                { label: 'Select', command: () => this.router.navigate(['/workspaces/select']) },
              ],
            },
          ],
        ],
      },
    ];
  }
}
