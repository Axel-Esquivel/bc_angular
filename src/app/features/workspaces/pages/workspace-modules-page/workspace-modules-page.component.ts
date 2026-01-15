import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { Toast } from 'primeng/toast';

import { WorkspacesApiService } from '../../../../core/api/workspaces-api.service';
import { WorkspaceModulesService } from '../../../../core/workspace/workspace-modules.service';
import {
  WorkspaceModuleCatalogEntry,
  WorkspaceModuleState,
  WorkspaceModulesOverview,
} from '../../../../shared/models/workspace-modules.model';

@Component({
  selector: 'app-workspace-modules-page',
  standalone: true,
  imports: [CommonModule, FormsModule, Card, Button, ToggleSwitchModule, Toast],
  templateUrl: './workspace-modules-page.component.html',
  styleUrl: './workspace-modules-page.component.scss',
  providers: [MessageService],
})
export class WorkspaceModulesPageComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly workspacesApi = inject(WorkspacesApiService);
  private readonly workspaceModules = inject(WorkspaceModulesService);
  private readonly messageService = inject(MessageService);
  private readonly destroy$ = new Subject<void>();

  workspaceId: string | null = null;
  modules: WorkspaceModuleCatalogEntry[] = [];
  enabledMap = new Map<string, WorkspaceModuleState>();
  loading = false;
  processing = new Set<string>();
  userRole: 'admin' | 'member' | null = null;

  ngOnInit(): void {
    this.workspaceId = this.route.parent?.snapshot.paramMap.get('workspaceId') ?? null;
    this.workspaceModules.overview$.pipe(takeUntil(this.destroy$)).subscribe((overview) => {
      if (!overview) {
        return;
      }
      this.userRole = overview.userRole;
      if (overview.userRole !== 'admin') {
        this.router.navigate(['/workspaces', this.workspaceId ?? '', '']);
        return;
      }
      this.modules = overview.availableModules ?? [];
      this.enabledMap = new Map((overview.enabledModules ?? []).map((state) => [state.key, state]));
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  goBack(): void {
    if (this.workspaceId) {
      this.router.navigate(['/workspaces', this.workspaceId]);
    } else {
      this.router.navigate(['/workspaces/select']);
    }
  }

  isEnabled(module: WorkspaceModuleCatalogEntry): boolean {
    return this.enabledMap.get(module.key)?.enabled ?? false;
  }

  toggleModule(module: WorkspaceModuleCatalogEntry): void {
    if (!this.workspaceId || this.processing.has(module.key)) {
      return;
    }

    this.processing.add(module.key);
    const nextEnabled = !this.isEnabled(module);

    this.workspacesApi
      .updateWorkspaceModules(this.workspaceId, [{ key: module.key, enabled: nextEnabled }])
      .subscribe({
        next: () => {
          this.processing.delete(module.key);
          this.workspaceModules.load(this.workspaceId!).subscribe();
        },
        error: () => {
          this.processing.delete(module.key);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo actualizar el modulo.',
          });
        },
      });
  }
}
