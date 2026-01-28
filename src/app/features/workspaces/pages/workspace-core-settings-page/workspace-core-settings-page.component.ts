import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MessageService } from 'primeng/api';
import { forkJoin, map, of, switchMap, take } from 'rxjs';

import { WorkspacesApiService } from '../../../../core/api/workspaces-api.service';
import { OrganizationSettingsApiService } from '../../../../core/api/organization-settings-api.service';
import { ApiResponse } from '../../../../shared/models/api-response.model';
import { OrganizationCoreSettings, OrganizationCoreSettingsUpdate } from '../../../../shared/models/organization-core-settings.model';
import { OrganizationStructureSettings, OrganizationStructureSettingsUpdate } from '../../../../shared/models/organization-structure-settings.model';
import { Workspace } from '../../../../shared/models/workspace.model';

@Component({
  selector: 'app-workspace-core-settings-page',
  templateUrl: './workspace-core-settings-page.component.html',
  styleUrl: './workspace-core-settings-page.component.scss',
  standalone: false,
})
export class WorkspaceCoreSettingsPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly workspacesApi = inject(WorkspacesApiService);
  private readonly organizationSettingsApi = inject(OrganizationSettingsApiService);
  private readonly messageService = inject(MessageService);

  workspaceId = this.route.parent?.snapshot.paramMap.get('id') ?? '';
  organizationId = '';
  loading = false;
  submitting = false;

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

  currencyDialogOpen = false;
  companyDialogOpen = false;
  branchDialogOpen = false;
  warehouseDialogOpen = false;

  currencyDraftId = '';
  editingCurrencyId: string | null = null;
  companyDraft = { id: '', name: '' };
  branchDraft = { id: '', companyId: '', name: '' };
  warehouseDraft = { id: '', branchId: '', name: '' };

  editMode: 'currency' | 'company' | 'branch' | 'warehouse' | null = null;

  countryOptions: Array<{ label: string; value: string }> = [
    { label: 'Argentina', value: 'AR' },
    { label: 'Chile', value: 'CL' },
    { label: 'Colombia', value: 'CO' },
    { label: 'Mexico', value: 'MX' },
    { label: 'Peru', value: 'PE' },
  ];

  ngOnInit(): void {
    if (!this.workspaceId) {
      this.workspaceId = this.route.snapshot.paramMap.get('id') ?? '';
    }
    if (!this.workspaceId) {
      return;
    }
    this.loadSettings();
  }

  get companyOptions(): Array<{ label: string; value: string }> {
    return this.structureSettings.companies.map((company) => ({
      label: company.name ? `${company.name} (${company.id})` : company.id,
      value: company.id,
    }));
  }

  get branchOptions(): Array<{ label: string; value: string }> {
    return this.structureSettings.branches.map((branch) => ({
      label: branch.name ? `${branch.name} (${branch.id})` : branch.id,
      value: branch.id,
    }));
  }

  get currencyOptions(): Array<{ label: string; value: string }> {
    if (this.coreSettings.currencyIds.length > 0) {
      return this.coreSettings.currencyIds.map((id) => ({
        label: id,
        value: id,
      }));
    }
    return [
      { label: 'USD', value: 'USD' },
      { label: 'EUR', value: 'EUR' },
      { label: 'COP', value: 'COP' },
    ];
  }

  openCurrencyDialog(edit?: string): void {
    this.editMode = 'currency';
    this.editingCurrencyId = edit ?? null;
    this.currencyDraftId = edit ?? '';
    this.currencyDialogOpen = true;
  }

  openCompanyDialog(edit?: { id: string; name?: string }): void {
    this.editMode = 'company';
    this.companyDraft = edit ? { ...edit, name: edit.name ?? '' } : { id: '', name: '' };
    this.companyDialogOpen = true;
  }

  openBranchDialog(edit?: { id: string; companyId: string; name?: string }): void {
    this.editMode = 'branch';
    this.branchDraft = edit ? { ...edit, name: edit.name ?? '' } : { id: '', companyId: '', name: '' };
    if (!this.branchDraft.companyId && this.companyOptions[0]) {
      this.branchDraft.companyId = this.companyOptions[0].value;
    }
    this.branchDialogOpen = true;
  }

  openWarehouseDialog(edit?: { id: string; branchId: string; name?: string }): void {
    this.editMode = 'warehouse';
    this.warehouseDraft = edit ? { ...edit, name: edit.name ?? '' } : { id: '', branchId: '', name: '' };
    if (!this.warehouseDraft.branchId && this.branchOptions[0]) {
      this.warehouseDraft.branchId = this.branchOptions[0].value;
    }
    this.warehouseDialogOpen = true;
  }

  saveCurrency(): void {
    const id = this.currencyDraftId.trim();
    if (!id) {
      this.showWarn('Completa el id de moneda.');
      return;
    }

    if (this.editingCurrencyId) {
      this.coreSettings.currencyIds = this.coreSettings.currencyIds
        .filter((item) => item !== this.editingCurrencyId)
        .concat(id);
    } else if (!this.coreSettings.currencyIds.includes(id)) {
      this.coreSettings.currencyIds = [...this.coreSettings.currencyIds, id];
    }

    this.currencyDialogOpen = false;
    this.editingCurrencyId = null;
    this.currencyDraftId = '';
    this.persist();
  }

  saveCompany(): void {
    const id = this.companyDraft.id.trim();
    const name = this.companyDraft.name.trim() || 'Sin nombre';
    if (!id) {
      this.showWarn('Completa el id de empresa.');
      return;
    }

    const exists = this.structureSettings.companies.find((item) => item.id === id);
    if (exists) {
      Object.assign(exists, { id, name });
    } else {
      this.structureSettings.companies = [...this.structureSettings.companies, { id, name }];
    }

    this.companyDialogOpen = false;
    this.persist();
  }

  saveBranch(): void {
    const id = this.branchDraft.id.trim();
    const companyId = this.branchDraft.companyId.trim();
    const name = this.branchDraft.name.trim() || 'Sin nombre';
    if (!id || !companyId) {
      this.showWarn('Completa el id y la empresa.');
      return;
    }

    if (!this.structureSettings.companies.some((item) => item.id === companyId)) {
      this.showWarn('La empresa seleccionada no existe.');
      return;
    }

    const exists = this.structureSettings.branches.find((item) => item.id === id);
    if (exists) {
      Object.assign(exists, { id, companyId, name });
    } else {
      this.structureSettings.branches = [...this.structureSettings.branches, { id, companyId, name }];
    }

    this.branchDialogOpen = false;
    this.persist();
  }

  saveWarehouse(): void {
    const id = this.warehouseDraft.id.trim();
    const branchId = this.warehouseDraft.branchId.trim();
    const name = this.warehouseDraft.name.trim() || 'Sin nombre';
    if (!id || !branchId) {
      this.showWarn('Completa el id y la sucursal.');
      return;
    }

    if (!this.structureSettings.branches.some((item) => item.id === branchId)) {
      this.showWarn('La sucursal seleccionada no existe.');
      return;
    }

    const exists = this.structureSettings.warehouses.find((item) => item.id === id);
    if (exists) {
      Object.assign(exists, { id, branchId, name });
    } else {
      this.structureSettings.warehouses = [...this.structureSettings.warehouses, { id, branchId, name }];
    }

    this.warehouseDialogOpen = false;
    this.persist();
  }

  removeCurrency(id: string): void {
    this.coreSettings.currencyIds = this.coreSettings.currencyIds.filter((currencyId) => currencyId !== id);
    if (this.coreSettings.baseCurrencyId === id) {
      this.coreSettings.baseCurrencyId = '';
    }
    this.persist();
  }

  removeCompany(item: { id: string }): void {
    this.structureSettings.companies = this.structureSettings.companies.filter((company) => company.id !== item.id);
    this.structureSettings.branches = this.structureSettings.branches.filter((branch) => branch.companyId !== item.id);
    const branchIds = new Set(this.structureSettings.branches.map((branch) => branch.id));
    this.structureSettings.warehouses = this.structureSettings.warehouses.filter((warehouse) =>
      branchIds.has(warehouse.branchId)
    );
    this.persist();
  }

  removeBranch(item: { id: string }): void {
    this.structureSettings.branches = this.structureSettings.branches.filter((branch) => branch.id !== item.id);
    this.structureSettings.warehouses = this.structureSettings.warehouses.filter(
      (warehouse) => warehouse.branchId !== item.id
    );
    this.persist();
  }

  removeWarehouse(item: { id: string }): void {
    this.structureSettings.warehouses = this.structureSettings.warehouses.filter(
      (warehouse) => warehouse.id !== item.id
    );
    this.persist();
  }

  updateCoreHeader(): void {
    if (this.coreSettings.baseCurrencyId && !this.coreSettings.currencyIds.includes(this.coreSettings.baseCurrencyId)) {
      this.coreSettings.currencyIds = [...this.coreSettings.currencyIds, this.coreSettings.baseCurrencyId];
    }
    this.persist();
  }

  private loadSettings(): void {
    this.loading = true;
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
        switchMap((organizationId) => {
          if (!organizationId) {
            return of({
              core: this.getEmptyCoreResponse(),
              structure: this.getEmptyStructureResponse(),
            });
          }
          return forkJoin({
            core: this.organizationSettingsApi.getCoreSettings(organizationId),
            structure: this.organizationSettingsApi.getStructureSettings(organizationId),
          });
        })
      )
      .subscribe({
        next: ({ core, structure }) => {
          const corePayload = core.result;
          if (corePayload) {
            this.coreSettings = {
              countryId: corePayload.countryId ?? '',
              baseCurrencyId: corePayload.baseCurrencyId ?? '',
              currencyIds: Array.isArray(corePayload.currencyIds) ? corePayload.currencyIds : [],
            };
          }
          const structurePayload = structure.result;
          if (structurePayload) {
            this.structureSettings = {
              companies: (structurePayload.companies ?? []).map((company) => ({
                id: company.id,
                name: company.name ?? 'Sin nombre',
              })),
              branches: (structurePayload.branches ?? []).map((branch) => ({
                id: branch.id,
                companyId: branch.companyId ?? '',
                name: branch.name ?? 'Sin nombre',
              })),
              warehouses: (structurePayload.warehouses ?? []).map((warehouse) => ({
                id: warehouse.id,
                branchId: warehouse.branchId ?? '',
                name: warehouse.name ?? 'Sin nombre',
                type: warehouse.type,
              })),
            };
          }
          this.loading = false;
        },
        error: () => {
          this.loading = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudieron cargar los settings base.',
          });
        },
      });
  }

  private persist(): void {
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
      .pipe(take(1))
      .subscribe({
        next: ({ core, structure }) => {
          const coreResult = core.result;
          if (coreResult) {
            this.coreSettings = {
              countryId: coreResult.countryId ?? this.coreSettings.countryId,
              baseCurrencyId: coreResult.baseCurrencyId ?? this.coreSettings.baseCurrencyId,
              currencyIds: Array.isArray(coreResult.currencyIds) ? coreResult.currencyIds : this.coreSettings.currencyIds,
            };
          }
          const structureResult = structure.result;
          if (structureResult) {
            this.structureSettings = {
              companies: (structureResult.companies ?? this.structureSettings.companies).map((company) => ({
                id: company.id,
                name: company.name ?? 'Sin nombre',
              })),
              branches: (structureResult.branches ?? this.structureSettings.branches).map((branch) => ({
                id: branch.id,
                companyId: branch.companyId ?? '',
                name: branch.name ?? 'Sin nombre',
              })),
              warehouses: (structureResult.warehouses ?? this.structureSettings.warehouses).map((warehouse) => ({
                id: warehouse.id,
                branchId: warehouse.branchId ?? '',
                name: warehouse.name ?? 'Sin nombre',
                type: warehouse.type,
              })),
            };
          }
          this.submitting = false;
        },
        error: () => {
          this.submitting = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudieron guardar los settings base.',
          });
        },
      });
  }

  private getWorkspaceId(workspace: Workspace | null | undefined): string | null {
    return workspace?.id ?? workspace?._id ?? null;
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

  private showWarn(detail: string): void {
    this.messageService.add({
      severity: 'warn',
      summary: 'Validacion',
      detail,
    });
  }
}
