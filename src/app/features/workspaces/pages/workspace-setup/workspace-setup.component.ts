import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Card } from 'primeng/card';
import { Button } from 'primeng/button';
import { Toast } from 'primeng/toast';
import { catchError, finalize, forkJoin, map, of, switchMap, take } from 'rxjs';

import { WorkspacesApiService } from '../../../../core/api/workspaces-api.service';
import { ModuleDefinition, ModulesApiService } from '../../../../core/api/modules-api.service';
import { WorkspaceStateService } from '../../../../core/workspace/workspace-state.service';
import { Workspace } from '../../../../shared/models/workspace.model';

@Component({
  selector: 'app-workspace-setup',
  standalone: true,
  imports: [
    CommonModule,
    Card,
    Button,
    Toast,
  ],
  templateUrl: './workspace-setup.component.html',
  styleUrl: './workspace-setup.component.scss',
  providers: [MessageService],
})
export class WorkspaceSetupComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly workspacesApi = inject(WorkspacesApiService);
  private readonly modulesApi = inject(ModulesApiService);
  private readonly messageService = inject(MessageService);
  private readonly workspaceState = inject(WorkspaceStateService);

  workspaceId =
    this.route.snapshot.paramMap.get('id') ??
    this.route.snapshot.queryParamMap.get('workspaceId') ??
    this.router.getCurrentNavigation()?.extras.state?.['workspaceId'] ??
    this.workspaceState.getActiveWorkspaceId() ??
    '';
  modules: ModuleDefinition[] = [];

  enabledModules: string[] = [];
  submitting = false;

  toggleModule(module: ModuleDefinition): void {
    const isEnabled = this.enabledModules.includes(module.id);
    this.enabledModules = isEnabled
      ? this.enabledModules.filter((id) => id !== module.id)
      : [...this.enabledModules, module.id];
  }

  isEnabled(moduleId: string): boolean {
    return this.enabledModules.includes(moduleId);
  }

  continue(): void {
    if (!this.workspaceId) {
      this.workspaceId =
        this.route.snapshot.paramMap.get('id') ??
        this.route.snapshot.queryParamMap.get('workspaceId') ??
        this.workspaceState.getActiveWorkspaceId() ??
        '';
    }

    if (!this.workspaceId || this.submitting) {
      return;
    }

    this.submitting = true;
    const modules = this.modules.map((module) => ({
      key: module.id,
      enabled: this.enabledModules.includes(module.id),
    }));

    this.workspacesApi
      .updateWorkspaceModules(this.workspaceId, modules)
      .pipe(
        take(1),
        switchMap(() => {
          this.workspaceState.setActiveWorkspaceId(this.workspaceId);
          if (!this.workspaceState.getDefaultWorkspaceId()) {
            this.workspaceState.setDefaultWorkspaceId(this.workspaceId);
          }
          this.workspaceState.setActiveWorkspaceSetupCompleted(true);
          return this.refreshWorkspaceState();
        }),
        finalize(() => {
          this.submitting = false;
        })
      )
      .subscribe({
        next: () => {
          this.router.navigateByUrl(`/workspace/${this.workspaceId}/dashboard`);
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo completar el setup.',
          });
        },
      });
  }

  ngOnInit(): void {
    if (!this.workspaceId) {
      this.workspaceId =
        this.route.parent?.snapshot.paramMap.get('id') ??
        this.route.snapshot.queryParamMap.get('workspaceId') ??
        this.workspaceState.getActiveWorkspaceId() ??
        '';
    }

    if (!this.workspaceId) {
      return;
    }

    forkJoin({
      definitions: this.modulesApi.getDefinitions(this.workspaceId),
      overview: this.workspacesApi.getWorkspaceModules(this.workspaceId),
    })
      .pipe(take(1))
      .subscribe({
        next: ({ definitions, overview }) => {
          const list = definitions.result ?? [];
          this.modules = list.filter(
            (module) => module.isSystem !== true && module.isInstallable !== false
          );
          const enabled = overview.result?.enabledModules ?? [];
          this.enabledModules = enabled.filter((module) => module.enabled).map((module) => module.key);
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudieron cargar los modulos.',
          });
        },
      });
  }

  private refreshWorkspaceState() {
    return this.workspacesApi.listMine().pipe(
      take(1),
      map((response) => {
        const workspaces = response.result?.workspaces ?? [];
        const workspace =
          workspaces.find((item) => this.getWorkspaceId(item) === this.workspaceId) ?? null;
        if (response.result?.defaultWorkspaceId) {
          this.workspaceState.setDefaultWorkspaceId(response.result.defaultWorkspaceId);
        }
        if (workspace && typeof workspace.setupCompleted === 'boolean') {
          this.workspaceState.setActiveWorkspaceSetupCompleted(workspace.setupCompleted);
        }
      }),
      catchError(() => of(undefined))
    );
  }

  private getWorkspaceId(workspace: Workspace | null | undefined): string | null {
    return workspace?.id ?? workspace?._id ?? null;
  }

}
