import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MessageService } from 'primeng/api';
import { take } from 'rxjs';

import { WorkspacesApiService } from '../../../../core/api/workspaces-api.service';
import { IWorkspaceCoreSettings } from '../../../../shared/models/workspace.model';

@Component({
  selector: 'app-workspace-core-settings-page',
  templateUrl: './workspace-core-settings-page.component.html',
  styleUrl: './workspace-core-settings-page.component.scss',
  standalone: false,
})
export class WorkspaceCoreSettingsPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly workspacesApi = inject(WorkspacesApiService);
  private readonly messageService = inject(MessageService);

  workspaceId = this.route.parent?.snapshot.paramMap.get('id') ?? '';
  loading = false;
  submitting = false;

  settings: IWorkspaceCoreSettings = {
    countryId: '',
    baseCurrencyId: '',
    currencyIds: [],
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
    return this.settings.companies.map((company) => ({
      label: company.name ? `${company.name} (${company.id})` : company.id,
      value: company.id,
    }));
  }

  get branchOptions(): Array<{ label: string; value: string }> {
    return this.settings.branches.map((branch) => ({
      label: branch.name ? `${branch.name} (${branch.id})` : branch.id,
      value: branch.id,
    }));
  }

  get currencyOptions(): Array<{ label: string; value: string }> {
    if (this.settings.currencyIds.length > 0) {
      return this.settings.currencyIds.map((id) => ({
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
      this.settings.currencyIds = this.settings.currencyIds
        .filter((item) => item !== this.editingCurrencyId)
        .concat(id);
    } else if (!this.settings.currencyIds.includes(id)) {
      this.settings.currencyIds = [...this.settings.currencyIds, id];
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

    const exists = this.settings.companies.find((item) => item.id === id);
    if (exists) {
      Object.assign(exists, { id, name });
    } else {
      this.settings.companies = [...this.settings.companies, { id, name }];
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

    if (!this.settings.companies.some((item) => item.id === companyId)) {
      this.showWarn('La empresa seleccionada no existe.');
      return;
    }

    const exists = this.settings.branches.find((item) => item.id === id);
    if (exists) {
      Object.assign(exists, { id, companyId, name });
    } else {
      this.settings.branches = [...this.settings.branches, { id, companyId, name }];
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

    if (!this.settings.branches.some((item) => item.id === branchId)) {
      this.showWarn('La sucursal seleccionada no existe.');
      return;
    }

    const exists = this.settings.warehouses.find((item) => item.id === id);
    if (exists) {
      Object.assign(exists, { id, branchId, name });
    } else {
      this.settings.warehouses = [...this.settings.warehouses, { id, branchId, name }];
    }

    this.warehouseDialogOpen = false;
    this.persist();
  }

  removeCurrency(id: string): void {
    this.settings.currencyIds = this.settings.currencyIds.filter((currencyId) => currencyId !== id);
    if (this.settings.baseCurrencyId === id) {
      this.settings.baseCurrencyId = '';
    }
    this.persist();
  }

  removeCompany(item: { id: string }): void {
    this.settings.companies = this.settings.companies.filter((company) => company.id !== item.id);
    this.settings.branches = this.settings.branches.filter((branch) => branch.companyId !== item.id);
    const branchIds = new Set(this.settings.branches.map((branch) => branch.id));
    this.settings.warehouses = this.settings.warehouses.filter((warehouse) => branchIds.has(warehouse.branchId));
    this.persist();
  }

  removeBranch(item: { id: string }): void {
    this.settings.branches = this.settings.branches.filter((branch) => branch.id !== item.id);
    this.settings.warehouses = this.settings.warehouses.filter((warehouse) => warehouse.branchId !== item.id);
    this.persist();
  }

  removeWarehouse(item: { id: string }): void {
    this.settings.warehouses = this.settings.warehouses.filter((warehouse) => warehouse.id !== item.id);
    this.persist();
  }

  updateCoreHeader(): void {
    if (this.settings.baseCurrencyId && !this.settings.currencyIds.includes(this.settings.baseCurrencyId)) {
      this.settings.currencyIds = [...this.settings.currencyIds, this.settings.baseCurrencyId];
    }
    this.persist();
  }

  private loadSettings(): void {
    this.loading = true;
    this.workspacesApi.getCoreSettings(this.workspaceId).pipe(take(1)).subscribe({
      next: ({ result }) => {
        const payload = result;
        if (payload) {
          this.settings = {
            countryId: payload.countryId ?? '',
            baseCurrencyId: payload.baseCurrencyId ?? '',
            currencyIds: Array.isArray(payload.currencyIds) ? payload.currencyIds : [],
            companies: (payload.companies ?? []).map((company) => ({
              id: company.id,
              name: company.name ?? 'Sin nombre',
            })),
            branches: (payload.branches ?? []).map((branch) => ({
              id: branch.id,
              companyId: branch.companyId ?? '',
              name: branch.name ?? 'Sin nombre',
            })),
            warehouses: (payload.warehouses ?? []).map((warehouse) => ({
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

    this.submitting = true;
    this.workspacesApi.updateCoreSettings(this.workspaceId, this.settings).pipe(take(1)).subscribe({
      next: ({ result }) => {
        const payload = result;
        if (payload) {
          this.settings = {
            countryId: payload.countryId ?? this.settings.countryId,
            baseCurrencyId: payload.baseCurrencyId ?? this.settings.baseCurrencyId,
            currencyIds: Array.isArray(payload.currencyIds) ? payload.currencyIds : this.settings.currencyIds,
            companies: (payload.companies ?? this.settings.companies).map((company) => ({
              id: company.id,
              name: company.name ?? 'Sin nombre',
            })),
            branches: (payload.branches ?? this.settings.branches).map((branch) => ({
              id: branch.id,
              companyId: branch.companyId ?? '',
              name: branch.name ?? 'Sin nombre',
            })),
            warehouses: (payload.warehouses ?? this.settings.warehouses).map((warehouse) => ({
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

  private showWarn(detail: string): void {
    this.messageService.add({
      severity: 'warn',
      summary: 'Validacion',
      detail,
    });
  }
}
