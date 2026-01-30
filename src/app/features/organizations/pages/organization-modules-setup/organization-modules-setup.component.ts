import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';

import { ModulesApiService, ModuleDefinition } from '../../../../core/api/modules-api.service';
import { CompaniesApiService } from '../../../../core/api/companies-api.service';
import { CompanyStateService } from '../../../../core/company/company-state.service';
import { ActiveContextStateService } from '../../../../core/context/active-context-state.service';
import { ModuleDependenciesService } from '../../../../core/workspace/module-dependencies.service';
import { OrganizationModulesApiService } from '../../services/organization-modules-api.service';

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
    private readonly organizationModulesApi: OrganizationModulesApiService,
    private readonly companiesApi: CompaniesApiService,
    private readonly moduleDependencies: ModuleDependenciesService,
    private readonly companyState: CompanyStateService,
    private readonly activeContextState: ActiveContextStateService,
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
    this.organizationModulesApi.updateModules(this.orgId, { modules: this.enabledModules }).subscribe({
      next: () => {
        this.submitting = false;
        const activeContext = this.activeContextState.getActiveContext();
        const targetCompanyId =
          this.companyId ||
          activeContext.companyId ||
          this.companyState.getActiveCompanyId() ||
          this.companyState.getDefaultCompanyId();
        if (targetCompanyId) {
          this.navigateToDashboard(targetCompanyId);
          return;
        }
        this.redirectToDashboardFromOrganization();
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

  private redirectToDashboardFromOrganization(): void {
    this.companiesApi.listByOrganization(this.orgId).subscribe({
      next: (res) => {
        const companies = res?.result ?? [];
        const targetCompanyId = companies[0]?.id ?? '';
        if (targetCompanyId) {
          this.navigateToDashboard(targetCompanyId);
          return;
        }
        this.router.navigateByUrl('/organizations/select');
      },
      error: () => {
        this.router.navigateByUrl('/organizations/select');
      },
    });
  }

  private loadOrganizationModules(): void {
    this.organizationModulesApi.getOverview(this.orgId).subscribe({
      next: (res) => {
        const overview = res.result?.modules ?? [];
        this.enabledModules = overview
          .filter((module) => module.state.status !== 'disabled')
          .map((module) => module.key);
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

  private navigateToDashboard(companyId: string): void {
    this.companyState.setActiveCompanyId(companyId);
    if (!this.companyState.getDefaultCompanyId()) {
      this.companyState.setDefaultCompanyId(companyId);
    }
    this.router.navigateByUrl(`/companies/${companyId}/dashboard`);
  }
}


