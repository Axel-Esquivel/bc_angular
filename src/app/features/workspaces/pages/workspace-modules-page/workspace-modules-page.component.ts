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

import { ModuleDefinition, ModulesApiService } from '../../../../core/api/modules-api.service';
import { WorkspacesApiService } from '../../../../core/api/workspaces-api.service';
import { ModuleDependenciesService } from '../../../../core/workspace/module-dependencies.service';
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
  private readonly modulesApi = inject(ModulesApiService);
  private readonly moduleDependencies = inject(ModuleDependenciesService);
  private readonly workspaceModules = inject(WorkspaceModulesService);
  private readonly messageService = inject(MessageService);
  private readonly destroy$ = new Subject<void>();

  workspaceId: string | null = null;
  modules: WorkspaceModuleCatalogEntry[] = [];
  enabledMap = new Map<string, WorkspaceModuleState>();
  moduleDefinitions: ModuleDefinition[] = [];
  loading = false;
  processing = new Set<string>();
  userRole: 'admin' | 'member' | null = null;

  ngOnInit(): void {
    this.workspaceId = this.route.parent?.snapshot.paramMap.get('id') ?? null;
    if (this.workspaceId) {
      this.modulesApi
        .getDefinitions(this.workspaceId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            this.moduleDefinitions = response.result ?? [];
          },
          error: () => {
            this.moduleDefinitions = [];
          },
        });
    }
    this.workspaceModules.overview$.pipe(takeUntil(this.destroy$)).subscribe((overview) => {
      if (!overview) {
        return;
      }
      this.userRole = overview.userRole;
      if (overview.userRole !== 'admin') {
        this.router.navigate(['/workspace', this.workspaceId ?? '', 'dashboard']);
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
      this.router.navigate(['/workspace', this.workspaceId, 'dashboard']);
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

    const enabledIds = this.getEnabledIds();
    const nextEnabled = !this.isEnabled(module);
    if (!nextEnabled) {
      const result = this.moduleDependencies.canDisable(enabledIds, module.key, this.moduleDefinitions);
      if (!result.allowed && result.requiredBy.length > 0) {
        this.messageService.add({
          severity: 'warn',
          summary: 'Dependencias',
          detail: `No puedes desactivar ${this.getModuleLabel(module.key)} porque ${this.getModuleLabel(
            result.requiredBy[0]
          )} lo requiere.`,
        });
        return;
      }
    }

    this.processing.add(module.key);

    const payload = nextEnabled
      ? this.buildEnablePayload(enabledIds, module.key)
      : [{ key: module.key, enabled: false }];

    this.workspacesApi
      .updateWorkspaceModules(this.workspaceId, payload)
      .subscribe({
        next: () => {
          this.processing.delete(module.key);
          this.workspaceModules.load(this.workspaceId!).subscribe();
          if (nextEnabled) {
            this.showAutoEnableToast(module.key);
          }
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

  private getEnabledIds(): string[] {
    return Array.from(this.enabledMap.values())
      .filter((state) => state.enabled)
      .map((state) => state.key);
  }

  private buildEnablePayload(enabledIds: string[], moduleId: string): { key: string; enabled: boolean }[] {
    const result = this.moduleDependencies.applyEnableWithDeps(
      enabledIds,
      moduleId,
      this.moduleDefinitions
    );
    const idsToEnable = [moduleId, ...result.newDependencies];
    return idsToEnable.map((key) => ({ key, enabled: true }));
  }

  private showAutoEnableToast(moduleId: string): void {
    const enabledIds = this.getEnabledIds();
    const result = this.moduleDependencies.applyEnableWithDeps(
      enabledIds,
      moduleId,
      this.moduleDefinitions
    );
    if (result.newDependencies.length === 0) {
      return;
    }
    const formatted = result.newDependencies.map((id) => this.getModuleLabel(id)).join(', ');
    this.messageService.add({
      severity: 'info',
      summary: 'Dependencias',
      detail: `Se activó ${this.getModuleLabel(moduleId)} y también: ${formatted} (dependencias).`,
    });
  }

  private getModuleLabel(moduleId: string): string {
    return this.moduleDefinitions.find((item) => item.id === moduleId)?.name ?? moduleId;
  }
}
