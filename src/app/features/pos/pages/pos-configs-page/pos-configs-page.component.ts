import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { MessageService } from 'primeng/api';

import { ActiveContextStateService } from '../../../../core/context/active-context-state.service';
import { CompaniesApiService } from '../../../../core/api/companies-api.service';
import { CurrenciesApiService } from '../../../../core/api/currencies-api.service';
import { UsersApiService } from '../../../../core/api/users-api.service';
import { WarehousesService, Warehouse } from '../../../warehouses/services/warehouses.service';
import { Company } from '../../../../shared/models/company.model';
import { Currency } from '../../../../shared/models/currency.model';
import { PosConfigsService } from '../../services/pos-configs.service';
import { PosConfig } from '../../models/pos-config.model';
import { PosPaymentMethod } from '../../models/pos.model';

interface SelectOption {
  label: string;
  value: string;
}

interface PosConfigRow {
  id: string;
  name: string;
  code: string;
  warehouseLabel: string;
  currencyLabel: string;
  usersLabel: string;
  active: boolean;
  requiresOpening: boolean;
}

@Component({
  selector: 'app-pos-configs-page',
  standalone: false,
  templateUrl: './pos-configs-page.component.html',
  styleUrl: './pos-configs-page.component.scss',
})
export class PosConfigsPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly messageService = inject(MessageService);
  private readonly activeContext = inject(ActiveContextStateService);
  private readonly companiesApi = inject(CompaniesApiService);
  private readonly currenciesApi = inject(CurrenciesApiService);
  private readonly usersApi = inject(UsersApiService);
  private readonly warehousesApi = inject(WarehousesService);
  private readonly posConfigsService = inject(PosConfigsService);

  configs: PosConfig[] = [];
  rows: PosConfigRow[] = [];
  loading = false;
  saving = false;
  contextMissing = false;
  errorMessage: string | null = null;

  dialogVisible = false;
  deleteDialogVisible = false;
  deleteTarget: PosConfigRow | null = null;
  editing: PosConfig | null = null;

  organizationId: string | null = null;
  companyId: string | null = null;
  enterpriseId: string | null = null;
  enterpriseName: string | null = null;

  warehouses: Warehouse[] = [];
  warehouseOptions: SelectOption[] = [];
  currencyOptions: SelectOption[] = [];
  userOptions: SelectOption[] = [];

  private readonly warehouseMap = new Map<string, string>();
  private readonly currencyMap = new Map<string, string>();
  private readonly userMap = new Map<string, string>();
  private enterpriseCurrencyIds: string[] = [];

  readonly paymentMethodOptions: Array<{ label: string; value: PosPaymentMethod }> = [
    { label: 'Efectivo', value: 'CASH' },
    { label: 'Tarjeta', value: 'CARD' },
    { label: 'Transferencia', value: 'TRANSFER' },
    { label: 'Vale', value: 'VOUCHER' },
  ];

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    code: ['', [Validators.required, Validators.maxLength(60)]],
    warehouseId: ['', Validators.required],
    currencyId: ['', Validators.required],
    active: [true],
    allowedPaymentMethods: this.fb.nonNullable.control<PosPaymentMethod[]>([], [
      Validators.required,
      Validators.minLength(1),
    ]),
    allowedUserIds: this.fb.nonNullable.control<string[]>([], [Validators.required, Validators.minLength(1)]),
    requiresOpening: [true],
    allowOtherUsersClose: [false],
    notes: [''],
  });

  ngOnInit(): void {
    const context = this.activeContext.getActiveContext();
    this.organizationId = context.organizationId ?? null;
    this.companyId = context.companyId ?? null;
    this.enterpriseId = context.enterpriseId ?? null;
    this.contextMissing = !this.organizationId || !this.companyId || !this.enterpriseId;

    if (this.contextMissing) {
      return;
    }

    this.loadLookups();
  }

  openCreate(): void {
    this.editing = null;
    this.form.reset({
      name: '',
      code: '',
      warehouseId: this.warehouseOptions[0]?.value ?? '',
      currencyId: this.currencyOptions[0]?.value ?? '',
      active: true,
      allowedPaymentMethods: ['CASH'],
      allowedUserIds: [],
      requiresOpening: true,
      allowOtherUsersClose: false,
      notes: '',
    });
    this.dialogVisible = true;
  }

  openEdit(row: PosConfigRow): void {
    const config = this.configs.find((item) => item.id === row.id);
    if (!config) {
      return;
    }
    this.editing = config;
    this.form.reset({
      name: config.name,
      code: config.code,
      warehouseId: config.warehouseId,
      currencyId: config.currencyId,
      active: config.active,
      allowedPaymentMethods: config.allowedPaymentMethods ?? [],
      allowedUserIds: config.allowedUserIds ?? [],
      requiresOpening: config.requiresOpening,
      allowOtherUsersClose: config.allowOtherUsersClose,
      notes: config.notes ?? '',
    });
    this.dialogVisible = true;
  }

  closeDialog(): void {
    this.dialogVisible = false;
  }

  confirmDelete(row: PosConfigRow): void {
    this.deleteTarget = row;
    this.deleteDialogVisible = true;
  }

  cancelDelete(): void {
    this.deleteDialogVisible = false;
    this.deleteTarget = null;
  }

  deleteConfig(): void {
    const target = this.deleteTarget;
    if (!target) {
      return;
    }
    this.saving = true;
    this.posConfigsService.remove(target.id).subscribe({
      next: () => {
        this.saving = false;
        this.deleteDialogVisible = false;
        this.deleteTarget = null;
        this.configs = this.configs.filter((item) => item.id !== target.id);
        this.rows = this.buildRows(this.configs);
        this.messageService.add({
          severity: 'success',
          summary: 'POS eliminado',
          detail: 'La configuración se eliminó correctamente.',
        });
      },
      error: () => {
        this.saving = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error al eliminar',
          detail: 'No se pudo eliminar el POS seleccionado.',
        });
      },
    });
  }

  save(): void {
    if (this.form.invalid || !this.organizationId || !this.companyId || !this.enterpriseId) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    this.saving = true;

    if (this.editing) {
      this.posConfigsService
        .update(this.editing.id, {
          name: value.name,
          code: value.code,
          warehouseId: value.warehouseId,
          currencyId: value.currencyId,
          active: value.active,
          allowedPaymentMethods: value.allowedPaymentMethods,
          allowedUserIds: value.allowedUserIds,
          requiresOpening: value.requiresOpening,
          allowOtherUsersClose: value.allowOtherUsersClose,
          notes: value.notes,
        })
        .subscribe({
          next: (updated) => {
            this.saving = false;
            this.dialogVisible = false;
            this.configs = this.configs.map((item) => (item.id === updated.id ? updated : item));
            this.rows = this.buildRows(this.configs);
            this.messageService.add({
              severity: 'success',
              summary: 'POS actualizado',
              detail: 'La configuración se actualizó correctamente.',
            });
          },
          error: () => {
            this.saving = false;
            this.messageService.add({
              severity: 'error',
              summary: 'Error al guardar',
              detail: 'No se pudo actualizar el POS.',
            });
          },
        });
      return;
    }

    this.posConfigsService
      .create({
        name: value.name,
        code: value.code,
        OrganizationId: this.organizationId,
        companyId: this.companyId,
        enterpriseId: this.enterpriseId,
        warehouseId: value.warehouseId,
        currencyId: value.currencyId,
        active: value.active,
        allowedPaymentMethods: value.allowedPaymentMethods,
        allowedUserIds: value.allowedUserIds,
        requiresOpening: value.requiresOpening,
        allowOtherUsersClose: value.allowOtherUsersClose,
        notes: value.notes,
      })
      .subscribe({
        next: (created) => {
          this.saving = false;
          this.dialogVisible = false;
          this.configs = [...this.configs, created];
          this.rows = this.buildRows(this.configs);
          this.messageService.add({
            severity: 'success',
            summary: 'POS creado',
            detail: 'La configuración se guardó correctamente.',
          });
        },
        error: () => {
          this.saving = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Error al guardar',
            detail: 'No se pudo crear el POS.',
          });
        },
      });
  }

  private loadLookups(): void {
    if (!this.organizationId || !this.companyId || !this.enterpriseId) {
      return;
    }

    this.loading = true;
    this.errorMessage = null;

    const company$ = this.companiesApi.getById(this.companyId);
    const warehouses$ = this.warehousesApi.getAll(this.organizationId, this.enterpriseId);
    const currencies$ = this.currenciesApi.list();

    forkJoin({ company: company$, warehouses: warehouses$, currencies: currencies$ }).subscribe({
      next: ({ company, warehouses, currencies }) => {
        const companyData = company.result ?? null;
        const warehouseList = warehouses.result ?? [];
        const currencyList = currencies.result ?? [];

        if (companyData) {
          this.applyCompanyData(companyData);
        }
        this.applyWarehouses(warehouseList);
        this.applyCurrencies(currencyList);
        this.loadConfigs();
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'No se pudieron cargar los datos de referencia.';
      },
    });
  }

  private applyCompanyData(company: Company): void {
    const enterprise = (company.enterprises ?? []).find((item) => this.getId(item) === this.enterpriseId) ?? null;
    this.enterpriseName = enterprise?.name ?? null;
    this.enterpriseCurrencyIds = enterprise?.currencyIds ?? [];

    const memberIds = (company.members ?? [])
      .map((member) => member.userId)
      .filter((value): value is string => typeof value === 'string' && value.length > 0);

    if (memberIds.length === 0) {
      this.userOptions = [];
      this.userMap.clear();
      return;
    }

    this.usersApi.resolve(memberIds).subscribe({
      next: (resolved) => {
        this.userMap.clear();
        resolved.forEach((user) => {
          if (user.id) {
            const label = user.name?.trim() || user.email;
            this.userMap.set(user.id, label);
          }
        });
        this.userOptions = memberIds.map((id) => ({
          value: id,
          label: this.userMap.get(id) ?? id,
        }));
        this.rows = this.buildRows(this.configs);
      },
      error: () => {
        this.userOptions = memberIds.map((id) => ({ value: id, label: id }));
      },
    });
  }

  private applyWarehouses(warehouses: Warehouse[]): void {
    this.warehouses = warehouses ?? [];
    this.warehouseMap.clear();
    this.warehouseOptions = this.warehouses.map((warehouse) => {
      this.warehouseMap.set(warehouse.id, warehouse.name);
      return { value: warehouse.id, label: warehouse.name };
    });
  }

  private applyCurrencies(currencies: Currency[]): void {
    const normalized = currencies.map((currency) => ({
      ...currency,
      id: this.normalizeCurrencyId(currency),
    }));

    const allowedIds = this.enterpriseCurrencyIds.length > 0 ? new Set(this.enterpriseCurrencyIds) : null;
    const filtered = allowedIds ? normalized.filter((currency) => currency.id && allowedIds.has(currency.id)) : normalized;

    this.currencyMap.clear();
    this.currencyOptions = filtered
      .filter((currency) => !!currency.id)
      .map((currency) => {
        const id = currency.id as string;
        const label = currency.symbol ? `${currency.code} (${currency.symbol})` : currency.code;
        this.currencyMap.set(id, label);
        return { value: id, label };
      });
  }

  private loadConfigs(): void {
    if (!this.organizationId || !this.companyId || !this.enterpriseId) {
      return;
    }

    this.posConfigsService
      .list({
        OrganizationId: this.organizationId,
        companyId: this.companyId,
        enterpriseId: this.enterpriseId,
      })
      .subscribe({
        next: (configs) => {
          this.configs = configs ?? [];
          this.rows = this.buildRows(this.configs);
          this.loading = false;
        },
        error: () => {
          this.loading = false;
          this.configs = [];
          this.rows = [];
          this.errorMessage = 'No se pudieron cargar los POS.';
        },
      });
  }

  private buildRows(configs: PosConfig[]): PosConfigRow[] {
    return configs.map((config) => {
      const usersLabel = this.buildUsersLabel(config.allowedUserIds ?? []);
      return {
        id: config.id,
        name: config.name,
        code: config.code,
        warehouseLabel: this.warehouseMap.get(config.warehouseId) ?? config.warehouseId,
        currencyLabel: this.currencyMap.get(config.currencyId) ?? config.currencyId,
        usersLabel,
        active: config.active,
        requiresOpening: config.requiresOpening,
      };
    });
  }

  private buildUsersLabel(userIds: string[]): string {
    const labels = userIds.map((id) => this.userMap.get(id) ?? id).filter(Boolean);
    if (labels.length === 0) {
      return 'Sin usuarios';
    }
    if (labels.length <= 2) {
      return labels.join(', ');
    }
    return `${labels[0]}, ${labels[1]} y ${labels.length - 2} más`;
  }

  private getId(value: { id?: string; _id?: string } | null | undefined): string {
    const raw = value?.id ?? value?._id;
    return typeof raw === 'string' && raw.trim().length > 0 ? raw : '';
  }

  private normalizeCurrencyId(currency: Currency): string {
    const raw = currency.id ?? currency.code;
    return typeof raw === 'string' && raw.trim().length > 0 ? raw : '';
  }
}
