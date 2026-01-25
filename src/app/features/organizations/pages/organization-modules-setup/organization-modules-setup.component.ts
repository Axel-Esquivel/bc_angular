import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';

import { ModulesApiService, ModuleDefinition } from '../../../../core/api/modules-api.service';
import { OrganizationsService } from '../../../../core/api/organizations-api.service';
import { CompanyStateService } from '../../../../core/company/company-state.service';
import { ModuleDependenciesService } from '../../../../core/workspace/module-dependencies.service';

@Component({
  selector: 'app-organization-modules-setup',
  templateUrl: './organization-modules-setup.component.html',
  styleUrl: './organization-modules-setup.component.scss',
  providers: [MessageService],
  standalone: false,
})
export class OrganizationModulesSetupComponent implements OnInit {
  orgId = '';
  companyId = '';
  modules: ModuleDefinition[] = [];
  moduleDefinitions: ModuleDefinition[] = [];
  enabledModules: string[] = [];
  submitting = false;
  loading = false;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly modulesApi: ModulesApiService,
    private readonly organizationsApi: OrganizationsService,
    private readonly moduleDependencies: ModuleDependenciesService,
    private readonly companyState: CompanyStateService,
    private readonly messageService: MessageService,
  ) {}

  ngOnInit(): void {
    this.orgId = this.route.snapshot.queryParamMap.get('orgId') ?? '';
    this.companyId = this.route.snapshot.queryParamMap.get('companyId') ?? '';
    if (!this.orgId) {
      this.router.navigateByUrl('/organizations');
      return;
    }

    if (this.companyId) {
      this.companyState.setActiveCompanyId(this.companyId);
      if (!this.companyState.getDefaultCompanyId()) {
        this.companyState.setDefaultCompanyId(this.companyId);
      }
    }

    this.loading = true;
    const idForDefinitions = this.companyId || this.orgId;
    this.modulesApi.getDefinitions(idForDefinitions).subscribe({
      next: (res) => {
        const list = res.result ?? [];
        this.moduleDefinitions = list;
        this.modules = list.filter((module) => module.isSystem !== true && module.isInstallable !== false);
        this.loadOrganizationModules();
      },
      error: () => {
        this.loading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Modulos',
          detail: 'No se pudieron cargar los modulos.',
        });
      },
    });
  }

  toggleModule(module: ModuleDefinition): void {
    const isEnabled = this.enabledModules.includes(module.id);
    if (isEnabled) {
      const result = this.moduleDependencies.canDisable(
        this.enabledModules,
        module.id,
        this.moduleDefinitions,
      );
      if (!result.allowed && result.requiredBy.length > 0) {
        this.messageService.add({
          severity: 'warn',
          summary: 'Dependencias',
          detail: `No puedes desactivar ${this.getModuleLabel(module.id)} porque ${this.getModuleLabel(
            result.requiredBy[0],
          )} lo requiere.`,
        });
        return;
      }
      this.enabledModules = this.enabledModules.filter((id) => id !== module.id);
      return;
    }

    const updated = this.moduleDependencies.applyEnableWithDeps(
      this.enabledModules,
      module.id,
      this.moduleDefinitions,
    );
    this.enabledModules = updated.enabled;

    if (updated.newDependencies.length > 0) {
      const formatted = updated.newDependencies.map((id) => this.getModuleLabel(id)).join(', ');
      this.messageService.add({
        severity: 'info',
        summary: 'Dependencias',
        detail: `Se activo ${this.getModuleLabel(module.id)} y tambien: ${formatted}.`,
      });
    }
  }

  isEnabled(moduleId: string): boolean {
    return this.enabledModules.includes(moduleId);
  }

  save(): void {
    if (this.submitting) {
      return;
    }
    this.submitting = true;
    this.organizationsApi.updateModules(this.orgId, { enabledModules: this.enabledModules }).subscribe({
      next: () => {
        this.submitting = false;
        if (this.companyId) {
          this.router.navigateByUrl(`/company/${this.companyId}/dashboard`);
          return;
        }
        this.router.navigateByUrl('/companies/select');
      },
      error: (error) => {
        this.submitting = false;
        const message = error?.error?.message || 'No se pudo guardar los modulos.';
        this.messageService.add({
          severity: 'error',
          summary: 'Modulos',
          detail: message,
        });
      },
    });
  }

  private loadOrganizationModules(): void {
    this.organizationsApi.getModules(this.orgId).subscribe({
      next: (res) => {
        this.enabledModules = res.result?.enabledModules ?? [];
        this.loading = false;
      },
      error: (error) => {
        this.loading = false;
        const message = error?.error?.message || 'No se pudo cargar los modulos.';
        this.messageService.add({
          severity: 'error',
          summary: 'Modulos',
          detail: message,
        });
        if (String(message).includes('Permission')) {
          this.router.navigateByUrl('/organizations');
        }
      },
    });
  }

  private getModuleLabel(moduleId: string): string {
    return this.moduleDefinitions.find((item) => item.id === moduleId)?.name ?? moduleId;
  }
}
