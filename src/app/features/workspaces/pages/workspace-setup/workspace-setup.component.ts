import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Card } from 'primeng/card';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { Toast } from 'primeng/toast';
import { catchError, finalize, forkJoin, map, of, switchMap, take, tap } from 'rxjs';

import { WorkspacesApiService } from '../../../../core/api/workspaces-api.service';
import { ModuleDefinition, ModulesApiService } from '../../../../core/api/modules-api.service';
import { LoggerService } from '../../../../core/logging/logger.service';
import { ModuleDependenciesService } from '../../../../core/workspace/module-dependencies.service';
import { CompanyStateService } from '../../../../core/company/company-state.service';
import { Workspace } from '../../../../shared/models/workspace.model';

@Component({
  selector: 'app-workspace-setup',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    Card,
    Button,
    InputText,
    Select,
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
  private readonly logger = inject(LoggerService);
  private readonly companyState = inject(CompanyStateService);
  private readonly moduleDependencies = inject(ModuleDependenciesService);

  workspaceId =
    this.route.snapshot.paramMap.get('id') ??
    this.route.snapshot.queryParamMap.get('workspaceId') ??
    this.router.getCurrentNavigation()?.extras.state?.['workspaceId'] ??
    this.companyState.getActiveCompanyId() ??
    '';
  modules: ModuleDefinition[] = [];
  moduleDefinitions: ModuleDefinition[] = [];

  enabledModules: string[] = [];
  submitting = false;
  stepIndex = 0;

  coreSettings = {
    countryId: '',
    baseCurrencyId: '',
    currencies: [] as Array<{ id: string; name?: string; code?: string }>,
    companies: [] as Array<{ id: string; name?: string }>,
    branches: [] as Array<{ id: string; companyId: string; name?: string }>,
    warehouses: [] as Array<{ id: string; branchId: string; name?: string }>,
  };

  draftCurrency = { id: '', name: '', code: '' };
  draftCompany = { id: '', name: '' };
  draftBranch = { id: '', companyId: '', name: '' };
  draftWarehouse = { id: '', branchId: '', name: '' };

  countryOptions: Array<{ label: string; value: string }> = [
    { label: 'Argentina', value: 'AR' },
    { label: 'Chile', value: 'CL' },
    { label: 'Colombia', value: 'CO' },
    { label: 'Mexico', value: 'MX' },
    { label: 'Peru', value: 'PE' },
  ];

  currencyOptions: Array<{ label: string; value: string }> = [
    { label: 'USD', value: 'USD' },
    { label: 'EUR', value: 'EUR' },
    { label: 'COP', value: 'COP' },
  ];

  toggleModule(module: ModuleDefinition): void {
    const isEnabled = this.enabledModules.includes(module.id);
    if (isEnabled) {
      const result = this.moduleDependencies.canDisable(
        this.enabledModules,
        module.id,
        this.moduleDefinitions
      );
      if (!result.allowed && result.requiredBy.length > 0) {
        this.messageService.add({
          severity: 'warn',
          summary: 'Dependencias',
          detail: `No puedes desactivar ${this.getModuleLabel(module.id)} porque ${this.getModuleLabel(
            result.requiredBy[0]
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
      this.moduleDefinitions
    );
    this.enabledModules = updated.enabled;

    if (updated.newDependencies.length > 0) {
      const formatted = updated.newDependencies.map((id) => this.getModuleLabel(id)).join(', ');
      this.messageService.add({
        severity: 'info',
        summary: 'Dependencias',
        detail: `Se activó ${this.getModuleLabel(module.id)} y también: ${formatted} (dependencias).`,
      });
    }
  }

  isEnabled(moduleId: string): boolean {
    return this.enabledModules.includes(moduleId);
  }

  continue(): void {
    this.logger.debug('[setup] continue click', {
      workspaceId: this.workspaceId,
      enabledModules: this.enabledModules,
    });
    if (!this.workspaceId) {
      this.workspaceId =
        this.route.snapshot.paramMap.get('id') ??
        this.route.snapshot.queryParamMap.get('workspaceId') ??
        this.companyState.getActiveCompanyId() ??
        '';
    }

    if (!this.workspaceId || this.submitting) {
      return;
    }

    this.submitting = true;
    const modules = this.moduleDefinitions.map((module) => ({
      key: module.id,
      enabled: this.enabledModules.includes(module.id),
    }));

    this.workspacesApi
      .updateWorkspaceModules(this.workspaceId, modules)
      .pipe(
        take(1),
        tap((response) => {
          this.logger.debug('[setup] modules patched', response);
        }),
        switchMap(() => {
          this.companyState.setActiveCompanyId(this.workspaceId);
          if (!this.companyState.getDefaultCompanyId()) {
            this.companyState.setDefaultCompanyId(this.workspaceId);
          }
          return this.refreshWorkspaceState();
        }),
        finalize(() => {
          this.submitting = false;
        })
      )
      .subscribe({
        next: () => {
          this.stepIndex = 1;
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

  saveCoreSettings(): void {
    if (!this.workspaceId || this.submitting) {
      return;
    }

    this.submitting = true;
    this.workspacesApi
      .updateCoreSettings(this.workspaceId, this.coreSettings)
      .pipe(
        take(1),
        finalize(() => {
          this.submitting = false;
        })
      )
      .subscribe({
        next: (response) => {
          const payload = response.result as typeof this.coreSettings | null;
          if (payload) {
            this.coreSettings = payload;
          }
          this.stepIndex = 2;
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo guardar la configuracion base.',
          });
        },
      });
  }

  finishSetup(): void {
    if (!this.workspaceId || this.submitting) {
      return;
    }
    this.submitting = true;
    this.workspacesApi
      .completeSetup(this.workspaceId)
      .pipe(
        take(1),
        switchMap(() => this.refreshWorkspaceState()),
        finalize(() => {
          this.submitting = false;
        })
      )
      .subscribe({
        next: () => {
          this.companyState.setActiveCompanySetupCompleted(true);
          this.router.navigateByUrl(`/company/${this.workspaceId}/dashboard`);
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo finalizar el setup.',
          });
        },
      });
  }

  ngOnInit(): void {
    if (!this.workspaceId) {
      this.workspaceId =
        this.route.parent?.snapshot.paramMap.get('id') ??
        this.route.snapshot.queryParamMap.get('workspaceId') ??
        this.companyState.getActiveCompanyId() ??
        '';
    }

    if (!this.workspaceId) {
      return;
    }

    forkJoin({
      definitions: this.modulesApi.getDefinitions(this.workspaceId),
      overview: this.workspacesApi.getWorkspaceModules(this.workspaceId),
      coreSettings: this.workspacesApi.getCoreSettings(this.workspaceId),
    })
      .pipe(take(1))
      .subscribe({
        next: ({ definitions, overview, coreSettings }) => {
          const list = definitions.result ?? [];
          this.moduleDefinitions = list;
          this.modules = list.filter(
            (module) => module.isSystem !== true && module.isInstallable !== false
          );
          const enabled = overview.result?.enabledModules ?? [];
          this.enabledModules = enabled.filter((module) => module.enabled).map((module) => module.key);
          if (coreSettings?.result) {
            this.coreSettings = {
              ...this.coreSettings,
              ...coreSettings.result,
            };
          }
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
      tap((response) => {
        this.logger.debug('[setup] workspaces refreshed', response);
      }),
      map((response) => {
        const workspaces = response.result?.workspaces ?? [];
        const workspace =
          workspaces.find((item) => this.getWorkspaceId(item) === this.workspaceId) ?? null;
        if (response.result?.defaultWorkspaceId) {
          this.companyState.setDefaultCompanyId(response.result.defaultWorkspaceId);
        }
        const derivedSetupCompleted = this.deriveSetupCompleted(workspace);
        if (derivedSetupCompleted !== null) {
          this.companyState.setActiveCompanySetupCompleted(derivedSetupCompleted);
        }
      }),
      catchError(() => of(undefined))
    );
  }

  private deriveSetupCompleted(workspace: Workspace | null): boolean | null {
    if (!workspace) {
      return null;
    }
    if (typeof workspace.setupCompleted === 'boolean') {
      return workspace.setupCompleted;
    }
    if (Array.isArray(workspace.enabledModules)) {
      return workspace.enabledModules.some((module) => module.enabled);
    }
    return null;
  }

  private getWorkspaceId(workspace: Workspace | null | undefined): string | null {
    return workspace?.id ?? workspace?._id ?? null;
  }

  private getModuleLabel(moduleId: string): string {
    return this.moduleDefinitions.find((item) => item.id === moduleId)?.name ?? moduleId;
  }

  get companyOptions(): Array<{ label: string; value: string }> {
    return this.coreSettings.companies.map((company) => ({
      label: company.name ? `${company.name} (${company.id})` : company.id,
      value: company.id,
    }));
  }

  get branchOptions(): Array<{ label: string; value: string }> {
    return this.coreSettings.branches.map((branch) => ({
      label: branch.name ? `${branch.name} (${branch.id})` : branch.id,
      value: branch.id,
    }));
  }

  get currencySelectOptions(): Array<{ label: string; value: string }> {
    if (this.coreSettings.currencies.length > 0) {
      return this.coreSettings.currencies.map((currency) => ({
        label: currency.code ? `${currency.code} (${currency.id})` : currency.id,
        value: currency.id,
      }));
    }
    return this.currencyOptions;
  }

  addCurrency(): void {
    if (!this.draftCurrency.id) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Campos requeridos',
        detail: 'Ingresa un id de moneda.',
      });
      return;
    }
    if (this.coreSettings.currencies.some((currency) => currency.id === this.draftCurrency.id)) {
      return;
    }
    this.coreSettings.currencies = [...this.coreSettings.currencies, { ...this.draftCurrency }];
    this.draftCurrency = { id: '', name: '', code: '' };
  }

  removeCurrency(id: string): void {
    this.coreSettings.currencies = this.coreSettings.currencies.filter((currency) => currency.id !== id);
  }

  addCompany(): void {
    if (!this.draftCompany.id) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Campos requeridos',
        detail: 'Ingresa un id de empresa.',
      });
      return;
    }
    if (this.coreSettings.companies.some((company) => company.id === this.draftCompany.id)) {
      return;
    }
    this.coreSettings.companies = [...this.coreSettings.companies, { ...this.draftCompany }];
    this.draftCompany = { id: '', name: '' };
  }

  removeCompany(id: string): void {
    this.coreSettings.companies = this.coreSettings.companies.filter((company) => company.id !== id);
    this.coreSettings.branches = this.coreSettings.branches.filter((branch) => branch.companyId !== id);
    this.coreSettings.warehouses = this.coreSettings.warehouses.filter(
      (warehouse) => this.coreSettings.branches.some((branch) => branch.id === warehouse.branchId)
    );
  }

  addBranch(): void {
    if (!this.draftBranch.id || !this.draftBranch.companyId) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Campos requeridos',
        detail: 'Selecciona una empresa y un id para la sucursal.',
      });
      return;
    }
    if (!this.coreSettings.companies.some((company) => company.id === this.draftBranch.companyId)) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Empresa',
        detail: 'La empresa seleccionada no existe.',
      });
      return;
    }
    if (this.coreSettings.branches.some((branch) => branch.id === this.draftBranch.id)) {
      return;
    }
    this.coreSettings.branches = [...this.coreSettings.branches, { ...this.draftBranch }];
    this.draftBranch = { id: '', companyId: '', name: '' };
  }

  removeBranch(id: string): void {
    this.coreSettings.branches = this.coreSettings.branches.filter((branch) => branch.id !== id);
    this.coreSettings.warehouses = this.coreSettings.warehouses.filter((warehouse) => warehouse.branchId !== id);
  }

  addWarehouse(): void {
    if (!this.draftWarehouse.id || !this.draftWarehouse.branchId) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Campos requeridos',
        detail: 'Selecciona una sucursal y un id para la bodega.',
      });
      return;
    }
    if (!this.coreSettings.branches.some((branch) => branch.id === this.draftWarehouse.branchId)) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Sucursal',
        detail: 'La sucursal seleccionada no existe.',
      });
      return;
    }
    if (this.coreSettings.warehouses.some((warehouse) => warehouse.id === this.draftWarehouse.id)) {
      return;
    }
    this.coreSettings.warehouses = [...this.coreSettings.warehouses, { ...this.draftWarehouse }];
    this.draftWarehouse = { id: '', branchId: '', name: '' };
  }

  removeWarehouse(id: string): void {
    this.coreSettings.warehouses = this.coreSettings.warehouses.filter((warehouse) => warehouse.id !== id);
  }

  goBack(): void {
    if (this.stepIndex > 0) {
      this.stepIndex -= 1;
      return;
    }
    if (this.workspaceId) {
      this.router.navigateByUrl(`/company/${this.workspaceId}/setup`);
    }
  }
}
