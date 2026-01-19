import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { Dialog } from 'primeng/dialog';
import { InputNumber } from 'primeng/inputnumber';
import { InputText } from 'primeng/inputtext';
import { MultiSelect } from 'primeng/multiselect';
import { Select } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { Textarea } from 'primeng/textarea';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { Toast } from 'primeng/toast';
import { catchError, forkJoin, Observable, of } from 'rxjs';

import { AccountingAccount, AccountingApiService } from '../../../../core/api/accounting-api.service';
import { ModuleDefinition, ModulesApiService } from '../../../../core/api/modules-api.service';
import { ProductCategoriesApiService } from '../../../../core/api/product-categories-api.service';
import { Warehouse, WarehousesApiService } from '../../../../core/api/warehouses-api.service';
import { WorkspacesApiService } from '../../../../core/api/workspaces-api.service';
import { ApiResponse } from '../../../../shared/models/api-response.model';
import { WorkspaceMember } from '../../../../shared/models/workspace.model';
import { WorkspaceModulesService } from '../../../../core/workspace/workspace-modules.service';

type FieldType =
  | 'text'
  | 'number'
  | 'boolean'
  | 'select'
  | 'multiselect'
  | 'textarea'
  | 'divider'
  | 'note';

interface FieldOption {
  label: string;
  value: string | number | boolean;
}

interface SettingsField {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  default?: string | number | boolean | string[] | number[];
  options?: FieldOption[];
  dataSource?: string;
  validators?: string[];
}

interface SettingsGroup {
  id: string;
  title: string;
  fields: SettingsField[];
}

interface SettingsSection {
  id: string;
  title: string;
  description?: string;
  groups?: SettingsGroup[];
  fields?: SettingsField[];
}

interface SettingsSchema {
  sections: SettingsSection[];
}

interface PosTerminal {
  id: string;
  name: string;
  companyId: string;
  branchId: string;
  warehouseId: string;
  currencyId: string;
  allowedUsers: string[];
  isActive: boolean;
}

interface PosTerminalSettings {
  terminals: PosTerminal[];
  defaults?: { terminalId?: string };
}

interface SelectOption {
  label: string;
  value: string;
}

interface UserOption {
  label: string;
  value: string;
}

interface InventorySettings {
  costMethod: 'weighted_avg' | 'fifo' | 'standard';
  stockLevel: 'warehouse' | 'location';
  allowNegative: boolean;
}

interface AccountingDefaults {
  salesIncomeAccountId?: string;
  salesDiscountAccountId?: string;
  inventoryAccountId?: string;
  cogsAccountId?: string;
  purchasesAccountId?: string;
  taxPayableAccountId?: string;
  taxReceivableAccountId?: string;
}

interface AccountingTax {
  id: string;
  name: string;
  rate: number;
  type: 'sales' | 'purchase' | 'both';
  accountId?: string;
  isActive: boolean;
}

interface AccountingCategoryMapping {
  id: string;
  categoryId: string;
  salesIncomeAccountId?: string;
  cogsAccountId?: string;
  inventoryAccountId?: string;
}

@Component({
  selector: 'app-module-settings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    Card,
    Button,
    Dialog,
    InputNumber,
    MultiSelect,
    Select,
    TableModule,
    ToggleSwitchModule,
    Toast,
  ],
  templateUrl: './module-settings.component.html',
  styleUrl: './module-settings.component.scss',
  providers: [MessageService],
})
export class ModuleSettingsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly modulesApi = inject(ModulesApiService);
  private readonly workspacesApi = inject(WorkspacesApiService);
  private readonly warehousesApi = inject(WarehousesApiService);
  private readonly accountingApi = inject(AccountingApiService);
  private readonly productCategoriesApi = inject(ProductCategoriesApiService);
  private readonly workspaceModules = inject(WorkspaceModulesService);
  private readonly messageService = inject(MessageService);

  readonly workspaceId = this.route.parent?.snapshot.paramMap.get('id') ?? '';
  moduleId = '';

  moduleDefinition: ModuleDefinition | null = null;
  settingsSchema: SettingsSchema | null = null;
  settingsData: Record<string, any> = {};
  posSettings: PosTerminalSettings = { terminals: [] };
  inventorySettings: InventorySettings = {
    costMethod: 'weighted_avg',
    stockLevel: 'warehouse',
    allowNegative: false,
  };
  accountingDefaults: AccountingDefaults = {};
  accountingTaxes: AccountingTax[] = [];
  accountingMappings: AccountingCategoryMapping[] = [];
  accounts: AccountingAccount[] = [];
  accountOptions: SelectOption[] = [];
  categoryOptions: SelectOption[] = [];
  warehouses: Warehouse[] = [];
  userOptions: UserOption[] = [];
  companyOptions: SelectOption[] = [];
  branchOptions: SelectOption[] = [
    { label: 'Principal', value: 'main' },
    { label: 'Sucursal Norte', value: 'north' },
    { label: 'Sucursal Sur', value: 'south' },
  ];
  currencyOptions: SelectOption[] = [
    { label: 'USD', value: 'USD' },
    { label: 'EUR', value: 'EUR' },
    { label: 'COP', value: 'COP' },
  ];
  warehouseOptions: SelectOption[] = [];
  costMethodOptions: SelectOption[] = [
    { label: 'Promedio ponderado', value: 'weighted_avg' },
    { label: 'FIFO', value: 'fifo' },
    { label: 'Estándar', value: 'standard' },
  ];
  stockLevelOptions: SelectOption[] = [
    { label: 'Por bodega', value: 'warehouse' },
    { label: 'Por ubicación', value: 'location' },
  ];
  taxTypeOptions: SelectOption[] = [
    { label: 'Venta', value: 'sales' },
    { label: 'Compra', value: 'purchase' },
    { label: 'Ambos', value: 'both' },
  ];
  terminalDialogVisible = false;
  terminalDraft: PosTerminal = {
    id: '',
    name: '',
    companyId: '',
    branchId: '',
    warehouseId: '',
    currencyId: '',
    allowedUsers: [],
    isActive: true,
  };
  savingTerminal = false;
  savingInventory = false;
  savingAccountingDefaults = false;
  savingTax = false;
  savingMapping = false;
  loading = false;
  saving = false;
  taxDialogVisible = false;
  mappingDialogVisible = false;
  taxDraft: AccountingTax = {
    id: '',
    name: '',
    rate: 0,
    type: 'sales',
    accountId: undefined,
    isActive: true,
  };
  mappingDraft: AccountingCategoryMapping = {
    id: '',
    categoryId: '',
    salesIncomeAccountId: undefined,
    cogsAccountId: undefined,
    inventoryAccountId: undefined,
  };

  ngOnInit(): void {
    this.moduleId = this.route.snapshot.paramMap.get('moduleId') ?? this.route.snapshot.data?.['moduleId'] ?? '';
    if (!this.workspaceId || !this.moduleId) {
      return;
    }

    this.loading = true;
    type RequestsMap = {
      definitions?: Observable<ApiResponse<ModuleDefinition[]>>;
      settings?: Observable<ApiResponse<any>>;
      workspaces?: Observable<ApiResponse<any>>;
      pos?: Observable<ApiResponse<any>>;
      warehouses?: Observable<Warehouse[]>;
      inventory?: Observable<ApiResponse<any>>;
      accountingDefaults?: Observable<ApiResponse<any>>;
      accountingTaxes?: Observable<ApiResponse<any>>;
      accountingMappings?: Observable<ApiResponse<any>>;
      accounts?: Observable<ApiResponse<AccountingAccount[]>>;
      categories?: Observable<string[]>;
      modulesOverview?: Observable<any>;
    };

    const requests: RequestsMap = {
      definitions: this.modulesApi.getDefinitions(this.workspaceId),
      settings: this.workspacesApi.getModuleSettings(this.workspaceId, this.moduleId),
      workspaces: this.workspacesApi.listMine().pipe(
        catchError(() => {
          this.messageService.add({
            severity: 'warn',
            summary: 'Sesión',
            detail: 'No se pudieron cargar los workspaces.',
          });
          return of({
            status: 'error',
            message: 'No autorizado',
            result: { workspaces: [] },
            error: null,
          } as ApiResponse<{ workspaces: WorkspaceMember[] }>);
        })
      ),
    };
    if (this.isPosModule) {
      requests['pos'] = this.workspacesApi.getPosTerminals(this.workspaceId);
      requests['warehouses'] = this.warehousesApi.list().pipe(
        catchError(() => {
          this.messageService.add({
            severity: 'warn',
            summary: 'Bodegas',
            detail: 'No se pudieron cargar las bodegas.',
          });
          return of([] as Warehouse[]);
        })
      );
    }
    if (this.isInventoryModule) {
      requests['inventory'] = this.workspacesApi.getInventorySettings(this.workspaceId);
    }
    if (this.isAccountingModule) {
      requests['accountingDefaults'] = this.workspacesApi.getAccountingDefaults(this.workspaceId);
      requests['accountingTaxes'] = this.workspacesApi.listAccountingTaxes(this.workspaceId);
      requests['accountingMappings'] = this.workspacesApi.listAccountingCategoryMappings(this.workspaceId);
      requests['accounts'] = this.accountingApi.listAccounts(this.workspaceId);
      requests['categories'] = this.productCategoriesApi.listCategories();
    }
    requests['modulesOverview'] = this.workspaceModules.load(this.workspaceId);

    forkJoin(requests).subscribe({
      next: (raw) => {
        const response = raw as {
          definitions?: ApiResponse<ModuleDefinition[]>;
          settings?: ApiResponse<any>;
          workspaces?: ApiResponse<{ workspaces: WorkspaceMember[] }>;
          pos?: ApiResponse<any>;
          warehouses?: Warehouse[];
          inventory?: ApiResponse<any>;
          accountingDefaults?: ApiResponse<any>;
          accountingTaxes?: ApiResponse<any>;
          accountingMappings?: ApiResponse<any>;
          accounts?: ApiResponse<AccountingAccount[]>;
          categories?: string[];
          modulesOverview?: { enabledModules?: { key: string; enabled: boolean }[] };
        };
        const enabled = response['modulesOverview']?.enabledModules ?? [];
        const isEnabled = enabled.some((module) => module.key === this.moduleId && module.enabled);
        if (!isEnabled) {
          this.loading = false;
          this.router.navigateByUrl(`/workspace/${this.workspaceId}/settings/modules`);
          return;
        }

        const modules = response['definitions']?.result ?? [];
        this.moduleDefinition =
          modules.find((module: ModuleDefinition) => module.id === this.moduleId) ?? null;
        this.settingsSchema = (this.moduleDefinition?.settingsSchema as SettingsSchema) ?? null;
        this.settingsData = this.mergeDefaults(response['settings']?.result ?? {});
        this.applyWorkspaceMembers((response['workspaces']?.result as any)?.workspaces ?? []);
        if (this.isPosModule && response['pos']) {
          this.posSettings = this.normalizePosSettings(response['pos'].result);
        }
        if (this.isPosModule && response['warehouses']) {
          this.warehouses = this.normalizeArray<Warehouse>(response['warehouses']);
          this.warehouseOptions = this.warehouses.map((warehouse) => ({
            label: warehouse.name,
            value: warehouse.id,
          }));
          this.companyOptions = Array.from(
            new Set(this.warehouses.map((warehouse) => warehouse.companyId))
          ).map((companyId) => ({ label: companyId, value: companyId }));
        }
        if (this.isInventoryModule && response['inventory']) {
          this.inventorySettings = this.normalizeInventorySettings(response['inventory'].result);
        }
        if (this.isAccountingModule) {
          this.accountingDefaults = response['accountingDefaults']?.result ?? {};
          this.accountingTaxes = (response['accountingTaxes']?.result ?? []) as AccountingTax[];
          this.accountingMappings = (response['accountingMappings']?.result ?? []) as AccountingCategoryMapping[];
          this.accounts = response['accounts']?.result ?? [];
          this.accountOptions = this.accounts.map((account) => ({
            label: `${account.code} - ${account.name}`,
            value: account.id,
          }));
          const categories = Array.isArray(response['categories']) ? response['categories'] : [];
          this.categoryOptions = categories.map((category: string) => ({
            label: category,
            value: category,
          }));
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo cargar la configuracion del modulo.',
        });
      },
    });
  }

  get sections(): SettingsSection[] {
    return this.settingsSchema?.sections ?? [];
  }

  get isPosModule(): boolean {
    return this.moduleId === 'pos';
  }

  get isInventoryModule(): boolean {
    return this.moduleId === 'inventory';
  }

  get isAccountingModule(): boolean {
    return this.moduleId === 'accounting';
  }

  openNewTerminal(): void {
    this.terminalDraft = {
      id: '',
      name: '',
      companyId: this.companyOptions[0]?.value ?? '',
      branchId: this.branchOptions[0]?.value ?? '',
      warehouseId: this.warehouseOptions[0]?.value ?? '',
      currencyId: this.currencyOptions[0]?.value ?? '',
      allowedUsers: [],
      isActive: true,
    };
    this.terminalDialogVisible = true;
  }

  editTerminal(terminal: PosTerminal): void {
    this.terminalDraft = { ...terminal, allowedUsers: [...terminal.allowedUsers] };
    this.terminalDialogVisible = true;
  }

  deleteTerminal(terminal: PosTerminal): void {
    if (!this.workspaceId || !terminal.id) {
      return;
    }
    if (!confirm('Eliminar esta caja?')) {
      return;
    }

    this.workspacesApi.deletePosTerminal(this.workspaceId, terminal.id).subscribe({
      next: () => {
        this.posSettings.terminals = this.posSettings.terminals.filter((item) => item.id !== terminal.id);
        this.messageService.add({
          severity: 'success',
          summary: 'Eliminado',
          detail: 'Caja removida.',
        });
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo eliminar la caja.',
        });
      },
    });
  }

  saveTerminal(): void {
    if (!this.workspaceId || this.savingTerminal) {
      return;
    }

    if (!this.terminalDraft.name || !this.terminalDraft.companyId || !this.terminalDraft.branchId || !this.terminalDraft.warehouseId || !this.terminalDraft.currencyId) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Campos requeridos',
        detail: 'Completa los campos obligatorios.',
      });
      return;
    }

    this.savingTerminal = true;
    const payload = {
      name: this.terminalDraft.name,
      companyId: this.terminalDraft.companyId,
      branchId: this.terminalDraft.branchId,
      warehouseId: this.terminalDraft.warehouseId,
      currencyId: this.terminalDraft.currencyId,
      allowedUsers: this.terminalDraft.allowedUsers,
      isActive: this.terminalDraft.isActive,
    };

    const request$ = this.terminalDraft.id
      ? this.workspacesApi.updatePosTerminal(this.workspaceId, this.terminalDraft.id, payload)
      : this.workspacesApi.createPosTerminal(this.workspaceId, payload);

    request$.subscribe({
      next: (response) => {
        const terminal = response.result as PosTerminal;
        if (this.terminalDraft.id) {
          this.posSettings.terminals = this.posSettings.terminals.map((item) =>
            item.id === terminal.id ? terminal : item
          );
        } else {
          this.posSettings.terminals = [...this.posSettings.terminals, terminal];
        }
        this.terminalDialogVisible = false;
        this.savingTerminal = false;
        this.messageService.add({
          severity: 'success',
          summary: 'Guardado',
          detail: 'Caja actualizada.',
        });
      },
      error: () => {
        this.savingTerminal = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo guardar la caja.',
        });
      },
    });
  }

  onWarehouseChange(warehouseId: string): void {
    const warehouse = this.warehouses.find((item) => item.id === warehouseId);
    if (warehouse) {
      this.terminalDraft.companyId = warehouse.companyId;
    }
  }

  getWarehouseLabel(warehouseId: string): string {
    return this.warehouses.find((warehouse) => warehouse.id === warehouseId)?.name ?? warehouseId;
  }

  save(): void {
    if (!this.workspaceId || !this.moduleId || this.saving) {
      return;
    }

    this.saving = true;
    this.workspacesApi
      .updateModuleSettings(this.workspaceId, this.moduleId, this.settingsData)
      .subscribe({
        next: () => {
          this.saving = false;
          this.messageService.add({
            severity: 'success',
            summary: 'Guardado',
            detail: 'Configuracion actualizada.',
          });
        },
        error: () => {
          this.saving = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo guardar la configuracion.',
          });
        },
      });
  }

  back(): void {
    if (this.workspaceId) {
      this.router.navigateByUrl(`/workspace/${this.workspaceId}/dashboard`);
    }
  }

  saveInventorySettings(): void {
    if (!this.workspaceId || this.savingInventory) {
      return;
    }

    this.savingInventory = true;
    this.workspacesApi.updateInventorySettings(this.workspaceId, this.inventorySettings).subscribe({
      next: (response) => {
        this.inventorySettings = this.normalizeInventorySettings(response.result);
        this.savingInventory = false;
        this.messageService.add({
          severity: 'success',
          summary: 'Guardado',
          detail: 'Configuración de inventario actualizada.',
        });
      },
      error: () => {
        this.savingInventory = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo guardar la configuración de inventario.',
        });
      },
    });
  }

  saveAccountingDefaults(): void {
    if (!this.workspaceId || this.savingAccountingDefaults) {
      return;
    }

    this.savingAccountingDefaults = true;
    this.workspacesApi.updateAccountingDefaults(this.workspaceId, this.accountingDefaults).subscribe({
      next: (response) => {
        this.accountingDefaults = response.result ?? {};
        this.savingAccountingDefaults = false;
        this.messageService.add({
          severity: 'success',
          summary: 'Guardado',
          detail: 'Cuentas por defecto actualizadas.',
        });
      },
      error: () => {
        this.savingAccountingDefaults = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo guardar las cuentas por defecto.',
        });
      },
    });
  }

  openNewTax(): void {
    this.taxDraft = {
      id: '',
      name: '',
      rate: 0,
      type: 'sales',
      accountId: undefined,
      isActive: true,
    };
    this.taxDialogVisible = true;
  }

  editTax(tax: AccountingTax): void {
    this.taxDraft = { ...tax };
    this.taxDialogVisible = true;
  }

  saveTax(): void {
    if (!this.workspaceId || this.savingTax) {
      return;
    }

    if (!this.taxDraft.name) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Nombre requerido',
        detail: 'Completa el nombre del impuesto.',
      });
      return;
    }

    this.savingTax = true;
    const payload = {
      name: this.taxDraft.name,
      rate: this.taxDraft.rate,
      type: this.taxDraft.type,
      accountId: this.taxDraft.accountId,
      isActive: this.taxDraft.isActive,
    };
    const request$ = this.taxDraft.id
      ? this.workspacesApi.updateAccountingTax(this.workspaceId, this.taxDraft.id, payload)
      : this.workspacesApi.createAccountingTax(this.workspaceId, payload);

    request$.subscribe({
      next: (response) => {
        const updated = response.result as AccountingTax;
        if (this.taxDraft.id) {
          this.accountingTaxes = this.accountingTaxes.map((item) =>
            item.id === updated.id ? updated : item
          );
        } else {
          this.accountingTaxes = [...this.accountingTaxes, updated];
        }
        this.taxDialogVisible = false;
        this.savingTax = false;
        this.messageService.add({
          severity: 'success',
          summary: 'Guardado',
          detail: 'Impuesto actualizado.',
        });
      },
      error: () => {
        this.savingTax = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo guardar el impuesto.',
        });
      },
    });
  }

  deleteTax(tax: AccountingTax): void {
    if (!this.workspaceId || !tax.id) {
      return;
    }
    if (!confirm('Eliminar este impuesto?')) {
      return;
    }
    this.workspacesApi.deleteAccountingTax(this.workspaceId, tax.id).subscribe({
      next: () => {
        this.accountingTaxes = this.accountingTaxes.filter((item) => item.id !== tax.id);
        this.messageService.add({
          severity: 'success',
          summary: 'Eliminado',
          detail: 'Impuesto removido.',
        });
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo eliminar el impuesto.',
        });
      },
    });
  }

  openNewMapping(): void {
    this.mappingDraft = {
      id: '',
      categoryId: this.categoryOptions[0]?.value ?? '',
      salesIncomeAccountId: undefined,
      cogsAccountId: undefined,
      inventoryAccountId: undefined,
    };
    this.mappingDialogVisible = true;
  }

  editMapping(mapping: AccountingCategoryMapping): void {
    this.mappingDraft = { ...mapping };
    this.mappingDialogVisible = true;
  }

  saveMapping(): void {
    if (!this.workspaceId || this.savingMapping) {
      return;
    }
    if (!this.mappingDraft.categoryId) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Categoria requerida',
        detail: 'Selecciona una categoria.',
      });
      return;
    }

    this.savingMapping = true;
    const payload = {
      categoryId: this.mappingDraft.categoryId,
      salesIncomeAccountId: this.mappingDraft.salesIncomeAccountId,
      cogsAccountId: this.mappingDraft.cogsAccountId,
      inventoryAccountId: this.mappingDraft.inventoryAccountId,
    };
    const request$ = this.mappingDraft.id
      ? this.workspacesApi.updateAccountingCategoryMapping(
          this.workspaceId,
          this.mappingDraft.id,
          payload
        )
      : this.workspacesApi.createAccountingCategoryMapping(this.workspaceId, payload);

    request$.subscribe({
      next: (response) => {
        const updated = response.result as AccountingCategoryMapping;
        if (this.mappingDraft.id) {
          this.accountingMappings = this.accountingMappings.map((item) =>
            item.id === updated.id ? updated : item
          );
        } else {
          this.accountingMappings = [...this.accountingMappings, updated];
        }
        this.mappingDialogVisible = false;
        this.savingMapping = false;
        this.messageService.add({
          severity: 'success',
          summary: 'Guardado',
          detail: 'Regla guardada.',
        });
      },
      error: () => {
        this.savingMapping = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo guardar la regla.',
        });
      },
    });
  }

  deleteMapping(mapping: AccountingCategoryMapping): void {
    if (!this.workspaceId || !mapping.id) {
      return;
    }
    if (!confirm('Eliminar esta regla?')) {
      return;
    }
    this.workspacesApi.deleteAccountingCategoryMapping(this.workspaceId, mapping.id).subscribe({
      next: () => {
        this.accountingMappings = this.accountingMappings.filter((item) => item.id !== mapping.id);
        this.messageService.add({
          severity: 'success',
          summary: 'Eliminado',
          detail: 'Regla removida.',
        });
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo eliminar la regla.',
        });
      },
    });
  }

  getAccountLabel(accountId?: string): string {
    if (!accountId) {
      return '-';
    }
    return this.accounts.find((account) => account.id === accountId)?.name ?? accountId;
  }


  private applyWorkspaceMembers(workspaces: { id?: string; members?: WorkspaceMember[] }[]): void {
    const workspace = workspaces.find((item) => item.id === this.workspaceId);
    const members = workspace?.members ?? [];
    this.userOptions = members.map((member) => ({
      label: member.userId,
      value: member.userId,
    }));
  }

  private normalizePosSettings(payload: any): PosTerminalSettings {
    const terminals = Array.isArray(payload?.terminals) ? payload.terminals : [];
    const defaults = payload?.defaults ?? {};
    return { terminals, defaults };
  }

  private normalizeInventorySettings(payload: any): InventorySettings {
    return {
      costMethod:
        payload?.costMethod === 'fifo' || payload?.costMethod === 'standard'
          ? payload.costMethod
          : 'weighted_avg',
      stockLevel: payload?.stockLevel === 'location' ? 'location' : 'warehouse',
      allowNegative: payload?.allowNegative === true,
    };
  }

  private mergeDefaults(payload: Record<string, any>): Record<string, any> {
    const defaults: Record<string, any> = {};
    (this.settingsSchema?.sections ?? []).forEach((section) => {
      section.fields?.forEach((field) => {
        this.assignDefault(defaults, field);
      });
      section.groups?.forEach((group) => {
        group.fields.forEach((field) => {
          this.assignDefault(defaults, field);
        });
      });
    });

    return { ...defaults, ...payload };
  }

  private assignDefault(target: Record<string, any>, field: SettingsField): void {
    if (field.default !== undefined) {
      target[field.key] = field.default;
      return;
    }

    switch (field.type) {
      case 'boolean':
        target[field.key] = false;
        break;
      case 'multiselect':
        target[field.key] = [];
        break;
      case 'number':
        target[field.key] = null;
        break;
      default:
        target[field.key] = '';
    }
  }

  private normalizeArray<T>(value: unknown): T[] {
    if (Array.isArray(value)) {
      return value as T[];
    }
    const result = (value as { result?: unknown })?.result;
    if (Array.isArray(result)) {
      return result as T[];
    }
    const resultItems = (value as { result?: { items?: unknown } })?.result?.items;
    if (Array.isArray(resultItems)) {
      return resultItems as T[];
    }
    const items = (value as { items?: unknown })?.items;
    if (Array.isArray(items)) {
      return items as T[];
    }
    return [];
  }
}
