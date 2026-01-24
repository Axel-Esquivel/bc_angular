import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MessageService } from 'primeng/api';
import { take } from 'rxjs';

import { WorkspacesApiService } from '../../../../core/api/workspaces-api.service';

interface CoreCurrency {
  id: string;
  name?: string;
  code?: string;
}

interface CoreCompany {
  id: string;
  name?: string;
}

interface CoreBranch {
  id: string;
  companyId: string;
  name?: string;
}

interface CoreWarehouse {
  id: string;
  branchId: string;
  name?: string;
}

interface CoreSettings {
  countryId?: string;
  baseCurrencyId?: string;
  currencies: CoreCurrency[];
  companies: CoreCompany[];
  branches: CoreBranch[];
  warehouses: CoreWarehouse[];
}

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

  settings: CoreSettings = {
    countryId: '',
    baseCurrencyId: '',
    currencies: [],
    companies: [],
    branches: [],
    warehouses: [],
  };

  currencyDialogOpen = false;
  companyDialogOpen = false;
  branchDialogOpen = false;
  warehouseDialogOpen = false;

  currencyDraft: CoreCurrency = { id: '', name: '', code: '' };
  companyDraft: CoreCompany = { id: '', name: '' };
  branchDraft: CoreBranch = { id: '', companyId: '', name: '' };
  warehouseDraft: CoreWarehouse = { id: '', branchId: '', name: '' };

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
    if (this.settings.currencies.length > 0) {
      return this.settings.currencies.map((currency) => ({
        label: currency.code ? `${currency.code} (${currency.id})` : currency.id,
        value: currency.id,
      }));
    }
    return [
      { label: 'USD', value: 'USD' },
      { label: 'EUR', value: 'EUR' },
      { label: 'COP', value: 'COP' },
    ];
  }

  openCurrencyDialog(edit?: CoreCurrency): void {
    this.editMode = 'currency';
    this.currencyDraft = edit ? { ...edit } : { id: '', name: '', code: '' };
    this.currencyDialogOpen = true;
  }

  openCompanyDialog(edit?: CoreCompany): void {
    this.editMode = 'company';
    this.companyDraft = edit ? { ...edit } : { id: '', name: '' };
    this.companyDialogOpen = true;
  }

  openBranchDialog(edit?: CoreBranch): void {
    this.editMode = 'branch';
    this.branchDraft = edit ? { ...edit } : { id: '', companyId: '', name: '' };
    if (!this.branchDraft.companyId && this.companyOptions[0]) {
      this.branchDraft.companyId = this.companyOptions[0].value;
    }
    this.branchDialogOpen = true;
  }

  openWarehouseDialog(edit?: CoreWarehouse): void {
    this.editMode = 'warehouse';
    this.warehouseDraft = edit ? { ...edit } : { id: '', branchId: '', name: '' };
    if (!this.warehouseDraft.branchId && this.branchOptions[0]) {
      this.warehouseDraft.branchId = this.branchOptions[0].value;
    }
    this.warehouseDialogOpen = true;
  }

  saveCurrency(): void {
    if (!this.currencyDraft.id) {
      this.showWarn('Completa el id de moneda.');
      return;
    }

    const exists = this.settings.currencies.find((item) => item.id === this.currencyDraft.id);
    if (exists) {
      Object.assign(exists, this.currencyDraft);
    } else {
      this.settings.currencies = [...this.settings.currencies, { ...this.currencyDraft }];
    }

    this.currencyDialogOpen = false;
    this.persist();
  }

  saveCompany(): void {
    if (!this.companyDraft.id) {
      this.showWarn('Completa el id de empresa.');
      return;
    }

    const exists = this.settings.companies.find((item) => item.id === this.companyDraft.id);
    if (exists) {
      Object.assign(exists, this.companyDraft);
    } else {
      this.settings.companies = [...this.settings.companies, { ...this.companyDraft }];
    }

    this.companyDialogOpen = false;
    this.persist();
  }

  saveBranch(): void {
    if (!this.branchDraft.id || !this.branchDraft.companyId) {
      this.showWarn('Completa el id y la empresa.');
      return;
    }

    if (!this.settings.companies.some((item) => item.id === this.branchDraft.companyId)) {
      this.showWarn('La empresa seleccionada no existe.');
      return;
    }

    const exists = this.settings.branches.find((item) => item.id === this.branchDraft.id);
    if (exists) {
      Object.assign(exists, this.branchDraft);
    } else {
      this.settings.branches = [...this.settings.branches, { ...this.branchDraft }];
    }

    this.branchDialogOpen = false;
    this.persist();
  }

  saveWarehouse(): void {
    if (!this.warehouseDraft.id || !this.warehouseDraft.branchId) {
      this.showWarn('Completa el id y la sucursal.');
      return;
    }

    if (!this.settings.branches.some((item) => item.id === this.warehouseDraft.branchId)) {
      this.showWarn('La sucursal seleccionada no existe.');
      return;
    }

    const exists = this.settings.warehouses.find((item) => item.id === this.warehouseDraft.id);
    if (exists) {
      Object.assign(exists, this.warehouseDraft);
    } else {
      this.settings.warehouses = [...this.settings.warehouses, { ...this.warehouseDraft }];
    }

    this.warehouseDialogOpen = false;
    this.persist();
  }

  removeCurrency(item: CoreCurrency): void {
    this.settings.currencies = this.settings.currencies.filter((currency) => currency.id !== item.id);
    if (this.settings.baseCurrencyId === item.id) {
      this.settings.baseCurrencyId = '';
    }
    this.persist();
  }

  removeCompany(item: CoreCompany): void {
    this.settings.companies = this.settings.companies.filter((company) => company.id !== item.id);
    this.settings.branches = this.settings.branches.filter((branch) => branch.companyId !== item.id);
    const branchIds = new Set(this.settings.branches.map((branch) => branch.id));
    this.settings.warehouses = this.settings.warehouses.filter((warehouse) => branchIds.has(warehouse.branchId));
    this.persist();
  }

  removeBranch(item: CoreBranch): void {
    this.settings.branches = this.settings.branches.filter((branch) => branch.id !== item.id);
    this.settings.warehouses = this.settings.warehouses.filter((warehouse) => warehouse.branchId !== item.id);
    this.persist();
  }

  removeWarehouse(item: CoreWarehouse): void {
    this.settings.warehouses = this.settings.warehouses.filter((warehouse) => warehouse.id !== item.id);
    this.persist();
  }

  updateCoreHeader(): void {
    this.persist();
  }

  private loadSettings(): void {
    this.loading = true;
    this.workspacesApi.getCoreSettings(this.workspaceId).pipe(take(1)).subscribe({
      next: ({ result }) => {
        if (result) {
          const payload = result as Partial<CoreSettings>;
          this.settings = {
            countryId: payload.countryId ?? '',
            baseCurrencyId: payload.baseCurrencyId ?? '',
            currencies: Array.isArray(payload.currencies) ? payload.currencies : [],
            companies: Array.isArray(payload.companies) ? payload.companies : [],
            branches: Array.isArray(payload.branches) ? payload.branches : [],
            warehouses: Array.isArray(payload.warehouses) ? payload.warehouses : [],
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
        if (result) {
          const payload = result as Partial<CoreSettings>;
          this.settings = {
            countryId: payload.countryId ?? this.settings.countryId,
            baseCurrencyId: payload.baseCurrencyId ?? this.settings.baseCurrencyId,
            currencies: Array.isArray(payload.currencies) ? payload.currencies : this.settings.currencies,
            companies: Array.isArray(payload.companies) ? payload.companies : this.settings.companies,
            branches: Array.isArray(payload.branches) ? payload.branches : this.settings.branches,
            warehouses: Array.isArray(payload.warehouses) ? payload.warehouses : this.settings.warehouses,
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
