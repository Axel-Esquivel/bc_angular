import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { catchError, finalize, forkJoin, map, of, switchMap, take, tap } from 'rxjs';

import { CountriesApiService } from '../../../../core/api/countries-api.service';
import { CurrenciesApiService } from '../../../../core/api/currencies-api.service';
import { WorkspacesApiService } from '../../../../core/api/workspaces-api.service';
import { ModuleDefinition, ModulesApiService } from '../../../../core/api/modules-api.service';
import { OrganizationSettingsApiService } from '../../../../core/api/organization-settings-api.service';
import { LoggerService } from '../../../../core/logging/logger.service';
import { ModuleDependenciesService } from '../../../../core/workspace/module-dependencies.service';
import { CompanyStateService } from '../../../../core/company/company-state.service';
import { Country } from '../../../../shared/models/country.model';
import { Currency } from '../../../../shared/models/currency.model';
import { Workspace } from '../../../../shared/models/workspace.model';
import { ApiResponse } from '../../../../shared/models/api-response.model';
import { OrganizationCoreSettings, OrganizationCoreSettingsUpdate } from '../../../../shared/models/organization-core-settings.model';
import { OrganizationStructureSettings, OrganizationStructureSettingsUpdate } from '../../../../shared/models/organization-structure-settings.model';

@Component({
  selector: 'app-workspace-setup',
  templateUrl: './workspace-setup.component.html',
  styleUrl: './workspace-setup.component.scss',
  standalone: false,
  providers: [MessageService, ConfirmationService],
})
export class WorkspaceSetupComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly workspacesApi = inject(WorkspacesApiService);
  private readonly modulesApi = inject(ModulesApiService);
  private readonly organizationSettingsApi = inject(OrganizationSettingsApiService);
  private readonly countriesApi = inject(CountriesApiService);
  private readonly currenciesApi = inject(CurrenciesApiService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly logger = inject(LoggerService);
  private readonly companyState = inject(CompanyStateService);
  private readonly moduleDependencies = inject(ModuleDependenciesService);

  workspaceId =
    this.route.snapshot.paramMap.get('id') ??
    this.route.snapshot.queryParamMap.get('workspaceId') ??
    this.router.getCurrentNavigation()?.extras.state?.['workspaceId'] ??
    this.companyState.getActiveCompanyId() ??
    '';
  organizationId = '';
  modules: ModuleDefinition[] = [];
  moduleDefinitions: ModuleDefinition[] = [];

  enabledModules: string[] = [];
  submitting = false;
  stepIndex = 0;

  coreSettings: OrganizationCoreSettings = {
    countryId: '',
    baseCurrencyId: '',
    currencyIds: [],
  };
  structureSettings: OrganizationStructureSettings = {
    companies: [],
    branches: [],
    warehouses: [],
  };

  countries: Country[] = [];
  currencies: Currency[] = [];

  countryDialogOpen = false;
  currencyDialogOpen = false;
  savingCountry = false;
  savingCurrency = false;

  draftCountry = { code: '', name: '' };
  draftCurrency = { code: '', name: '', symbol: '' };

  draftCompanyName = '';
  draftBranchCompanyId = '';
  draftBranchName = '';
  draftWarehouseBranchId = '';
  draftWarehouseName = '';

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
        detail: `Se activo ${this.getModuleLabel(module.id)} y tambien: ${formatted} (dependencias).`,
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
        error: (error) => {
          const message = error?.error?.message || 'No se pudo completar el setup.';
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: message,
          });
          if (String(message).includes('Pending approval')) {
            this.router.navigateByUrl('/organizations');
          }
        },
      });
  }

  saveCoreSettings(): void {
    if (!this.workspaceId || this.submitting) {
      return;
    }
    if (!this.organizationId) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Organizacion',
        detail: 'No se pudo identificar la organizacion.',
      });
      return;
    }

    this.syncCurrencyIdsWithBase();
    this.submitting = true;
    const corePayload: OrganizationCoreSettingsUpdate = {
      countryId: this.coreSettings.countryId || undefined,
      baseCurrencyId: this.coreSettings.baseCurrencyId || undefined,
      currencyIds: this.coreSettings.currencyIds,
    };
    const structurePayload: OrganizationStructureSettingsUpdate = {
      companies: this.structureSettings.companies,
      branches: this.structureSettings.branches,
      warehouses: this.structureSettings.warehouses,
    };

    forkJoin({
      core: this.organizationSettingsApi.updateCoreSettings(this.organizationId, corePayload),
      structure: this.organizationSettingsApi.updateStructureSettings(this.organizationId, structurePayload),
    })
      .pipe(
        take(1),
        finalize(() => {
          this.submitting = false;
        })
      )
      .subscribe({
        next: ({ core, structure }) => {
          const corePayload = core.result;
          const structurePayload = structure.result;
          if (corePayload) {
            this.coreSettings = {
              countryId: corePayload.countryId ?? this.coreSettings.countryId ?? '',
              baseCurrencyId: corePayload.baseCurrencyId ?? this.coreSettings.baseCurrencyId ?? '',
              currencyIds: Array.isArray(corePayload.currencyIds) ? corePayload.currencyIds : [],
            };
          }
          if (structurePayload) {
            this.structureSettings = {
              companies: structurePayload.companies ?? [],
              branches: structurePayload.branches ?? [],
              warehouses: structurePayload.warehouses ?? [],
            };
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

    this.workspacesApi
      .listMine()
      .pipe(
        take(1),
        map((response) => {
          const workspaces = response.result?.workspaces ?? [];
          const workspace = workspaces.find((item) => this.getWorkspaceId(item) === this.workspaceId);
          this.organizationId = workspace?.organizationId ?? '';
          return this.organizationId;
        }),
        switchMap((organizationId) =>
          forkJoin({
            definitions: this.modulesApi.getDefinitions(this.workspaceId),
            overview: this.workspacesApi.getWorkspaceModules(this.workspaceId),
            coreSettings: organizationId
              ? this.organizationSettingsApi.getCoreSettings(organizationId)
              : of(this.getEmptyCoreResponse()),
            structureSettings: organizationId
              ? this.organizationSettingsApi.getStructureSettings(organizationId)
              : of(this.getEmptyStructureResponse()),
            countries: this.countriesApi.list().pipe(catchError(() => of({ result: [] }))),
            currencies: this.currenciesApi.list().pipe(catchError(() => of({ result: [] }))),
          })
        )
      )
      .subscribe({
        next: ({ definitions, overview, coreSettings, structureSettings, countries, currencies }) => {
          const list = definitions.result ?? [];
          this.moduleDefinitions = list;
          this.modules = list.filter(
            (module) => module.isSystem !== true && module.isInstallable !== false
          );
          const enabled = overview.result?.enabledModules ?? [];
          this.enabledModules = enabled.filter((module) => module.enabled).map((module) => module.key);
          this.countries = countries.result ?? [];
          this.currencies = currencies.result ?? [];
          const core = coreSettings.result;
          if (core) {
            this.coreSettings = {
              countryId: core.countryId ?? '',
              baseCurrencyId: core.baseCurrencyId ?? '',
              currencyIds: Array.isArray(core.currencyIds) ? core.currencyIds : [],
            };
          }
          const structure = structureSettings.result;
          if (structure) {
            this.structureSettings = {
              companies: structure.companies ?? [],
              branches: structure.branches ?? [],
              warehouses: structure.warehouses ?? [],
            };
          }
          this.syncCurrencyIdsWithBase();
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

  get countryOptions(): Array<{ id: string; label: string; code: string }> {
    return this.countries.map((country) => ({
      id: country.id ?? country.iso2,
      label: this.getCountryLabel(country),
      code: country.iso2,
    }));
  }

  get currencyOptions(): Array<{ id: string; label: string; code: string }> {
    return this.currencies.map((currency) => ({
      id: currency.id ?? currency.code,
      label: this.getCurrencyLabel(currency),
      code: currency.code,
    }));
  }

  onBaseCurrencyChange(): void {
    this.syncCurrencyIdsWithBase();
  }

  onCurrencyIdsChange(): void {
    this.syncCurrencyIdsWithBase();
  }

  openCreateCountryDialog(): void {
    this.draftCountry = { code: '', name: '' };
    this.countryDialogOpen = true;
  }

  openCreateCurrencyDialog(): void {
    this.draftCurrency = { code: '', name: '', symbol: '' };
    this.currencyDialogOpen = true;
  }

  saveCountry(): void {
    const code = this.draftCountry.code.trim().toUpperCase();
    const name = this.draftCountry.name.trim();
    if (!code || !name) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Campos requeridos',
        detail: 'Ingresa el codigo y el nombre del pais.',
      });
      return;
    }
    if (this.savingCountry) {
      return;
    }
    this.savingCountry = true;
    this.countriesApi
      .create({ code, name })
      .pipe(
        take(1),
        finalize(() => {
          this.savingCountry = false;
        })
      )
      .subscribe({
        next: ({ result }) => {
          if (result) {
            const id = result.id ?? result.iso2;
            const exists = this.countries.some((country) => (country.id ?? country.iso2) === id);
            if (!exists) {
              this.countries = [result, ...this.countries];
            }
            this.coreSettings.countryId = id;
          }
          this.countryDialogOpen = false;
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Paises',
            detail: 'No se pudo guardar el pais.',
          });
        },
      });
  }

  saveCurrency(): void {
    const code = this.draftCurrency.code.trim().toUpperCase();
    const name = this.draftCurrency.name.trim();
    const symbol = this.draftCurrency.symbol.trim();
    if (!code || !name) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Campos requeridos',
        detail: 'Ingresa el codigo y el nombre de la moneda.',
      });
      return;
    }
    if (this.savingCurrency) {
      return;
    }
    this.savingCurrency = true;
    this.currenciesApi
      .create({ code, name, symbol: symbol || undefined })
      .pipe(
        take(1),
        finalize(() => {
          this.savingCurrency = false;
        })
      )
      .subscribe({
        next: ({ result }) => {
          if (result) {
            const id = result.id ?? result.code;
            const exists = this.currencies.some((currency) => (currency.id ?? currency.code) === id);
            if (!exists) {
              this.currencies = [result, ...this.currencies];
            }
            if (!this.coreSettings.baseCurrencyId) {
              this.coreSettings.baseCurrencyId = id;
            }
            if (!this.coreSettings.currencyIds.includes(id)) {
              this.coreSettings.currencyIds = [...this.coreSettings.currencyIds, id];
            }
            this.syncCurrencyIdsWithBase();
          }
          this.currencyDialogOpen = false;
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Monedas',
            detail: 'No se pudo guardar la moneda.',
          });
        },
      });
  }

  addCompany(): void {
    const name = this.draftCompanyName.trim();
    if (!name) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Campos requeridos',
        detail: 'Ingresa el nombre de la empresa.',
      });
      return;
    }
    const next = { id: this.generateTempId(), name };
    this.structureSettings.companies = [...this.structureSettings.companies, next];
    this.draftCompanyName = '';
  }

  confirmRemoveCompany(companyId: string): void {
    const company = this.structureSettings.companies.find((item) => item.id === companyId);
    if (!company) {
      return;
    }
    this.confirmationService.confirm({
      message: `Eliminar la empresa ${company.name}?`,
      accept: () => this.removeCompany(companyId),
    });
  }

  removeCompany(id: string): void {
    this.structureSettings.companies = this.structureSettings.companies.filter((company) => company.id !== id);
    this.structureSettings.branches = this.structureSettings.branches.filter((branch) => branch.companyId !== id);
    this.structureSettings.warehouses = this.structureSettings.warehouses.filter((warehouse) =>
      this.structureSettings.branches.some((branch) => branch.id === warehouse.branchId)
    );
  }

  addBranch(): void {
    const name = this.draftBranchName.trim();
    if (!this.draftBranchCompanyId || !name) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Campos requeridos',
        detail: 'Selecciona una empresa y escribe el nombre.',
      });
      return;
    }
    if (!this.structureSettings.companies.some((company) => company.id === this.draftBranchCompanyId)) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Empresa',
        detail: 'La empresa seleccionada no existe.',
      });
      return;
    }
    const next = {
      id: this.generateTempId(),
      companyId: this.draftBranchCompanyId,
      name,
    };
    this.structureSettings.branches = [...this.structureSettings.branches, next];
    this.draftBranchCompanyId = '';
    this.draftBranchName = '';
  }

  confirmRemoveBranch(branchId: string): void {
    const branch = this.structureSettings.branches.find((item) => item.id === branchId);
    if (!branch) {
      return;
    }
    this.confirmationService.confirm({
      message: `Eliminar la sucursal ${branch.name}?`,
      accept: () => this.removeBranch(branchId),
    });
  }

  removeBranch(id: string): void {
    this.structureSettings.branches = this.structureSettings.branches.filter((branch) => branch.id !== id);
    this.structureSettings.warehouses = this.structureSettings.warehouses.filter((warehouse) => warehouse.branchId !== id);
  }

  addWarehouse(): void {
    const name = this.draftWarehouseName.trim();
    if (!this.draftWarehouseBranchId || !name) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Campos requeridos',
        detail: 'Selecciona una sucursal y escribe el nombre.',
      });
      return;
    }
    if (!this.structureSettings.branches.some((branch) => branch.id === this.draftWarehouseBranchId)) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Sucursal',
        detail: 'La sucursal seleccionada no existe.',
      });
      return;
    }
    const next = {
      id: this.generateTempId(),
      branchId: this.draftWarehouseBranchId,
      name,
    };
    this.structureSettings.warehouses = [...this.structureSettings.warehouses, next];
    this.draftWarehouseBranchId = '';
    this.draftWarehouseName = '';
  }

  confirmRemoveWarehouse(warehouseId: string): void {
    const warehouse = this.structureSettings.warehouses.find((item) => item.id === warehouseId);
    if (!warehouse) {
      return;
    }
    this.confirmationService.confirm({
      message: `Eliminar la bodega ${warehouse.name}?`,
      accept: () => this.removeWarehouse(warehouseId),
    });
  }

  removeWarehouse(id: string): void {
    this.structureSettings.warehouses = this.structureSettings.warehouses.filter((warehouse) => warehouse.id !== id);
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

  private getEmptyCoreResponse(): ApiResponse<OrganizationCoreSettings> {
    return {
      status: 'success',
      message: '',
      result: {
        countryId: '',
        baseCurrencyId: '',
        currencyIds: [],
      },
      error: null,
    };
  }

  private getEmptyStructureResponse(): ApiResponse<OrganizationStructureSettings> {
    return {
      status: 'success',
      message: '',
      result: {
        companies: [],
        branches: [],
        warehouses: [],
      },
      error: null,
    };
  }

  private getWorkspaceId(workspace: Workspace | null | undefined): string | null {
    return workspace?.id ?? workspace?._id ?? null;
  }

  private getModuleLabel(moduleId: string): string {
    return this.moduleDefinitions.find((item) => item.id === moduleId)?.name ?? moduleId;
  }

  getCountryLabelById(id: string | null | undefined): string {
    if (!id) {
      return '';
    }
    const match = this.countryOptions.find((item) => item.id === id);
    return match?.label ?? '';
  }

  getCurrencyLabelById(id: string | null | undefined): string {
    if (!id) {
      return '';
    }
    const match = this.currencyOptions.find((item) => item.id === id);
    return match?.label ?? '';
  }

  getCompanyName(companyId: string): string {
    const company = this.structureSettings.companies.find((item) => item.id === companyId);
    return company?.name ?? '-';
  }

  getBranchName(branchId: string): string {
    const branch = this.structureSettings.branches.find((item) => item.id === branchId);
    return branch?.name ?? '-';
  }

  private syncCurrencyIdsWithBase(): void {
    const baseId = this.coreSettings.baseCurrencyId;
    if (baseId && !this.coreSettings.currencyIds.includes(baseId)) {
      this.coreSettings.currencyIds = [...this.coreSettings.currencyIds, baseId];
    }
  }

  private getCountryLabel(country: Country | undefined): string {
    if (!country) {
      return '';
    }
    const name = country.nameEs || country.nameEn || country.iso2;
    return country.iso2 ? `${name} (${country.iso2})` : name;
  }

  private getCurrencyLabel(currency: Currency | undefined): string {
    if (!currency) {
      return '';
    }
    return currency.name ? `${currency.code} - ${currency.name}` : currency.code;
  }

  private generateTempId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return `tmp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }
}
