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
import { CompaniesApiService } from '../../../../core/api/companies-api.service';
import { ModuleDependenciesService } from '../../../../core/workspace/module-dependencies.service';
import { WorkspaceModulesService } from '../../../../core/workspace/workspace-modules.service';
import { WorkspaceModuleCatalogEntry, WorkspaceModuleState } from '../../../../shared/models/workspace-modules.model';

interface CompanyModuleEntry extends WorkspaceModuleCatalogEntry {
  globalDisabled?: boolean;
}

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
  private readonly companiesApi = inject(CompaniesApiService);
  private readonly modulesApi = inject(ModulesApiService);
  private readonly moduleDependencies = inject(ModuleDependenciesService);
  private readonly workspaceModules = inject(WorkspaceModulesService);
  private readonly messageService = inject(MessageService);
  private readonly destroy$ = new Subject<void>();

  workspaceId: string | null = null;
  modules: CompanyModuleEntry[] = [];
  enabledMap = new Map<string, WorkspaceModuleState>();
  moduleDefinitions: ModuleDefinition[] = [];
  availableModulesMap = new Map<string, WorkspaceModuleCatalogEntry>();
  loading = false;
  processing = new Set<string>();
  userRole: string | null = null;

  ngOnInit(): void {
    this.workspaceId = this.route.parent?.snapshot.paramMap.get('id') ?? null;
    if (this.workspaceId) {
      this.modulesApi
        .getDefinitions(this.workspaceId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            this.moduleDefinitions = response.result ?? [];
            if (this.availableModulesMap.size > 0) {
              this.modules = this.buildModulesList();
            }
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
        this.router.navigate(['/company', this.workspaceId ?? '', 'dashboard']);
        return;
      }
      this.availableModulesMap = new Map(
        (overview.availableModules ?? []).map((module) => [module.key, module]),
      );
      this.modules = this.buildModulesList();
      this.enabledMap = new Map((overview.enabledModules ?? []).map((state) => [state.key, state]));
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  goBack(): void {
    if (this.workspaceId) {
      this.router.navigate(['/company', this.workspaceId, 'dashboard']);
    } else {
      this.router.navigate(['/companies/select']);
    }
  }

  isEnabled(module: WorkspaceModuleCatalogEntry): boolean {
    return this.enabledMap.get(module.key)?.enabled ?? false;
  }

  isGlobalDisabled(module: CompanyModuleEntry): boolean {
    return module.globalDisabled === true;
  }

  getState(module: WorkspaceModuleCatalogEntry): WorkspaceModuleState {
    return (
      this.enabledMap.get(module.key) ?? {
        key: module.key,
        enabled: false,
        configured: false,
        status: 'inactive',
      }
    );
  }

  getStatusLabel(module: WorkspaceModuleCatalogEntry): string {
    const status = this.getState(module).status ?? (this.isEnabled(module) ? 'enabled' : 'inactive');
    switch (status) {
      case 'pendingConfig':
        return 'Pendiente';
      case 'configured':
        return 'Configurado';
      case 'ready':
        return 'Listo';
      case 'error':
        return 'Error';
      case 'enabled':
        return 'Activo';
      default:
        return 'Inactivo';
    }
  }

  needsConfiguration(module: WorkspaceModuleCatalogEntry): boolean {
    const state = this.getState(module);
    return Boolean(module.requiresConfig) && state.enabled && state.status !== 'ready';
  }

  toggleModule(module: WorkspaceModuleCatalogEntry): void {
    if (!this.workspaceId || this.processing.has(module.key)) {
      return;
    }

    const nextEnabled = !this.isEnabled(module);
    if (nextEnabled && this.isGlobalDisabled(module)) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Modulo deshabilitado',
        detail: 'El modulo no esta habilitado globalmente.',
      });
      return;
    }
    if (!nextEnabled) {
      this.messageService.add({
        severity: 'info',
        summary: 'Desactivar',
        detail: 'La desactivacion de modulos por compania aun no esta disponible.',
      });
      return;
    }

    this.processing.add(module.key);

    if (nextEnabled) {
      this.companiesApi.enableModule(this.workspaceId, module.key).subscribe({
        next: () => {
          this.processing.delete(module.key);
          this.workspaceModules.load(this.workspaceId!).subscribe();
          this.showAutoEnableToast(module.key);
        },
        error: () => {
          this.processing.delete(module.key);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo activar el modulo.',
          });
        },
      });
      return;
    }

  }

  configureModule(module: WorkspaceModuleCatalogEntry): void {
    if (!this.workspaceId || this.processing.has(module.key)) {
      return;
    }

    this.processing.add(module.key);
    this.companiesApi.configureModule(this.workspaceId, module.key).subscribe({
      next: () => {
        this.processing.delete(module.key);
        this.workspaceModules.load(this.workspaceId!).subscribe();
        this.router.navigate(['/company', this.workspaceId, 'settings', module.key]);
      },
      error: () => {
        this.processing.delete(module.key);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo configurar el modulo.',
        });
      },
    });
  }

  private getEnabledIds(): string[] {
    return Array.from(this.enabledMap.values())
      .filter((state) => state.enabled)
      .map((state) => state.key);
  }

  private buildModulesList(): CompanyModuleEntry[] {
    if (this.moduleDefinitions.length === 0) {
      return Array.from(this.availableModulesMap.values());
    }

    return this.moduleDefinitions.map((definition) => {
      const available = this.availableModulesMap.get(definition.id);
      return {
        key: definition.id,
        name: definition.name,
        description: available?.description,
        version: available?.version ?? definition.version,
        dependencies: available?.dependencies ?? definition.dependencies ?? [],
        requiresConfig: available?.requiresConfig ?? false,
        globalDisabled: !available,
      };
    });
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
