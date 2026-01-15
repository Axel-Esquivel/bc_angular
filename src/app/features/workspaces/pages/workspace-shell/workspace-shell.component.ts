import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink, RouterOutlet } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { Button } from 'primeng/button';
import { Tag } from 'primeng/tag';

import { WorkspaceStateService } from '../../../../core/workspace/workspace-state.service';
import { WorkspaceModulesService } from '../../../../core/workspace/workspace-modules.service';

@Component({
  selector: 'app-workspace-shell',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterOutlet, Button, Tag],
  templateUrl: './workspace-shell.component.html',
  styleUrl: './workspace-shell.component.scss',
})
export class WorkspaceShellComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly workspaceState = inject(WorkspaceStateService);
  private readonly workspaceModules = inject(WorkspaceModulesService);
  private readonly destroy$ = new Subject<void>();

  workspaceId: string | null = null;
  userRole: 'admin' | 'member' | null = null;

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      const workspaceId = params.get('workspaceId');
      if (!workspaceId) {
        this.router.navigate(['/workspaces/select']);
        return;
      }

      this.workspaceId = workspaceId;
      this.workspaceState.setActiveWorkspaceId(workspaceId);
      this.loadModules(workspaceId);
    });

    this.workspaceModules.overview$.pipe(takeUntil(this.destroy$)).subscribe((overview) => {
      this.userRole = overview?.userRole ?? null;
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  goToWorkspaces(): void {
    this.router.navigate(['/workspaces/select']);
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
}
