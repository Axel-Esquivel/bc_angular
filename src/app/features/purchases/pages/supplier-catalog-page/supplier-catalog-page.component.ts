import { Component, OnInit, inject } from '@angular/core';
import { MessageService } from 'primeng/api';
import { forkJoin } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';

import { ActiveContextStateService } from '../../../../core/context/active-context-state.service';
import { CompaniesApiService } from '../../../../core/api/companies-api.service';
import { OrganizationCoreApiService } from '../../../../core/api/organization-core-api.service';
import { ProvidersService } from '../../../providers/services/providers.service';
import { PurchasesService } from '../../services/purchases.service';
import { PurchasesProductsLookupService } from '../../services/purchases-products-lookup.service';
import { Provider } from '../../../../shared/models/provider.model';
import { Company, CompanyEnterprise } from '../../../../shared/models/company.model';
import {
  CreateSupplierCatalogDto,
  SupplierCatalogBonusType,
  SupplierCatalogItem,
  SupplierCatalogStatus,
  SupplierProductVariantItem,
} from '../../../../shared/models/supplier-catalog.model';
import { CoreCurrency } from '../../../../shared/models/organization-core.model';

interface SelectOption {
  label: string;
  value: string;
}

interface SupplierCatalogRow {
  supplierId: string;
  variantId: string;
  variantLabel: string;
  unitCost: number | null;
  currency?: string | null;
  freightCost?: number | null;
  bonusType?: SupplierCatalogBonusType | null;
  bonusValue?: number | null;
  minQty?: number | null;
  leadTimeDays?: number | null;
  status: SupplierCatalogStatus;
  overrideId?: string;
}

@Component({
  selector: 'app-supplier-catalog-page',
  standalone: false,
  templateUrl: './supplier-catalog-page.component.html',
  styleUrl: './supplier-catalog-page.component.scss',
  providers: [MessageService],
})
export class SupplierCatalogPageComponent implements OnInit {
  private readonly providersService = inject(ProvidersService);
  private readonly purchasesService = inject(PurchasesService);
  private readonly activeContextState = inject(ActiveContextStateService);
  private readonly messageService = inject(MessageService);
  private readonly router = inject(Router);
  private readonly lookupService = inject(PurchasesProductsLookupService);
  private readonly route = inject(ActivatedRoute);
  private readonly companiesApi = inject(CompaniesApiService);
  private readonly organizationCoreApi = inject(OrganizationCoreApiService);

  providers: Provider[] = [];
  providerOptions: SelectOption[] = [];
  selectedProviderId: string | null = null;
  private requestedSupplierId: string | null = null;

  currencyOptions: SelectOption[] = [];
  defaultCurrencyId: string | null = null;

  supplierProducts: SupplierProductVariantItem[] = [];
  catalogOverrides: SupplierCatalogItem[] = [];
  rows: SupplierCatalogRow[] = [];

  loading = false;
  saving = false;
  dialogVisible = false;
  editingItem: SupplierCatalogItem | null = null;
  editingOverrideId: string | null = null;
  contextMissing = false;

  private overridesByVariant = new Map<string, SupplierCatalogItem>();

  ngOnInit(): void {
    this.preloadProducts();
    this.loadCurrencies();
    this.requestedSupplierId = this.route.snapshot.queryParamMap.get('supplierId');
    this.loadProviders();
  }

  get hasProviders(): boolean {
    return this.providerOptions.length > 0;
  }

  get needsProviderSelection(): boolean {
    return this.hasProviders && !this.selectedProviderId;
  }

  openCreate(): void {
    if (!this.selectedProviderId) {
      this.showError('Selecciona un proveedor.');
      return;
    }
    this.editingOverrideId = null;
    this.editingItem = this.createDraftItem(null);
    this.dialogVisible = true;
  }

  openEdit(row: SupplierCatalogRow): void {
    if (!this.selectedProviderId) {
      this.showError('Selecciona un proveedor.');
      return;
    }
    const override = this.overridesByVariant.get(row.variantId);
    if (override) {
      this.editingOverrideId = override.id;
      this.editingItem = override;
    } else {
      this.editingOverrideId = null;
      this.editingItem = this.createDraftItem(row);
    }
    this.dialogVisible = true;
  }

  closeDialog(): void {
    this.dialogVisible = false;
  }

  onProviderChange(): void {
    this.loadSupplierData();
  }

  onFormSave(payload: CreateSupplierCatalogDto): void {
    const context = this.activeContextState.getActiveContext();
    const OrganizationId = context.organizationId ?? undefined;
    const companyId = context.companyId ?? undefined;
    const supplierId = this.selectedProviderId ?? undefined;

    if (!OrganizationId || !companyId || !supplierId) {
      this.showError('Selecciona organizacion, empresa y proveedor.');
      return;
    }

    this.saving = true;

    const request$ = this.editingOverrideId
      ? this.purchasesService.updateSupplierCatalog(this.editingOverrideId, OrganizationId, companyId, {
          ...payload,
          supplierId,
        })
      : this.purchasesService.createSupplierCatalog({
          ...payload,
          supplierId,
          OrganizationId,
          companyId,
        });

    request$.subscribe({
      next: ({ result }) => {
        if (result) {
          this.upsertOverride(result);
          this.buildRows();
        }
        this.saving = false;
        this.dialogVisible = false;
      },
      error: () => {
        this.saving = false;
        this.showError('No se pudo guardar el item de catalogo.');
      },
    });
  }

  navigateToProviders(): void {
    void this.router.navigateByUrl('/app/providers');
  }

  createOrder(): void {
    if (!this.selectedProviderId) {
      this.showError('Selecciona un proveedor.');
      return;
    }
    void this.router.navigateByUrl('/app/purchases/orders/new');
  }

  loadProviders(): void {
    const context = this.activeContextState.getActiveContext();
    const organizationId = context.organizationId ?? undefined;
    const companyId = context.companyId ?? undefined;
    if (!organizationId || !companyId) {
      this.providers = [];
      this.providerOptions = [];
      this.currencyOptions = [];
      this.defaultCurrencyId = context.currencyId ?? null;
      this.contextMissing = true;
      return;
    }
    this.contextMissing = false;

    this.providersService.getAll().subscribe({
      next: ({ result }) => {
        const list = Array.isArray(result) ? result : [];
        this.providers = list.filter(
          (item) =>
            item.OrganizationId === organizationId &&
            item.companyId === companyId &&
            item.status !== 'inactive',
        );
        this.providerOptions = this.providers.map((provider) => ({
          label: provider.name,
          value: provider.id,
        }));
        if (this.requestedSupplierId) {
          const match = this.providerOptions.find((option) => option.value === this.requestedSupplierId);
          this.selectedProviderId = match?.value ?? this.providerOptions[0]?.value ?? null;
          this.requestedSupplierId = null;
        } else if (!this.selectedProviderId && this.providerOptions.length > 0) {
          this.selectedProviderId = this.providerOptions[0].value;
        }
        this.loadSupplierData();
      },
      error: () => {
        this.providers = [];
        this.providerOptions = [];
        this.showError('No se pudieron cargar los proveedores.');
      },
    });
  }

  loadSupplierData(): void {
    const context = this.activeContextState.getActiveContext();
    const OrganizationId = context.organizationId ?? undefined;
    const companyId = context.companyId ?? undefined;
    const supplierId = this.selectedProviderId ?? undefined;

    if (!OrganizationId || !companyId || !supplierId) {
      this.supplierProducts = [];
      this.catalogOverrides = [];
      this.rows = [];
      return;
    }

    this.loading = true;

    forkJoin({
      products: this.purchasesService.getSupplierProducts({ OrganizationId, companyId, supplierId }),
      overrides: this.purchasesService.listSupplierCatalog({ OrganizationId, companyId, supplierId }),
    }).subscribe({
      next: ({ products, overrides }) => {
        this.supplierProducts = Array.isArray(products.result) ? products.result : [];
        this.catalogOverrides = Array.isArray(overrides.result) ? overrides.result : [];
        this.rebuildOverridesIndex();
        this.buildRows();
        this.loading = false;
      },
      error: () => {
        this.supplierProducts = [];
        this.catalogOverrides = [];
        this.rows = [];
        this.loading = false;
        this.showError('No se pudo cargar el catalogo.');
      },
    });
  }

  resolveStatusLabel(status: SupplierCatalogStatus): string {
    return status === 'inactive' ? 'Inactivo' : 'Activo';
  }

  getVariantLabel(variantId: string): string {
    return this.lookupService.getVariantById(variantId)?.name ?? variantId;
  }

  private preloadProducts(): void {
    this.lookupService.searchVariants('').subscribe({
      next: () => undefined,
      error: () => undefined,
    });
  }

  private loadCurrencies(): void {
    const context = this.activeContextState.getActiveContext();
    const organizationId = context.organizationId ?? null;
    const companyId = context.companyId ?? null;
    const enterpriseId = context.enterpriseId ?? null;

    if (!organizationId || !companyId) {
      this.currencyOptions = [];
      this.defaultCurrencyId = context.currencyId ?? null;
      return;
    }

    forkJoin({
      company: this.companiesApi.getById(companyId),
      core: this.organizationCoreApi.getCoreSettings(organizationId),
    }).subscribe({
      next: ({ company, core }) => {
        const companyData = company.result ?? null;
        const coreCurrencies = core.result?.currencies ?? [];
        const allowed = this.resolveAllowedCurrencyIds(companyData, enterpriseId, coreCurrencies);
        this.currencyOptions = this.buildCurrencyOptions(allowed, coreCurrencies);
        this.defaultCurrencyId = this.resolveDefaultCurrencyId(
          context.currencyId ?? null,
          allowed,
          companyData,
          enterpriseId,
          coreCurrencies,
        );
      },
      error: () => {
        this.currencyOptions = [];
        this.defaultCurrencyId = context.currencyId ?? null;
      },
    });
  }

  private rebuildOverridesIndex(): void {
    this.overridesByVariant = new Map(
      this.catalogOverrides.map((item) => [item.variantId, item]),
    );
  }

  private buildRows(): void {
    const supplierId = this.selectedProviderId;
    if (!supplierId) {
      this.rows = [];
      return;
    }
    this.rows = this.supplierProducts.map((product) => {
      const override = this.overridesByVariant.get(product.variantId);
      const baseStatus: SupplierCatalogStatus = product.active ? 'active' : 'inactive';
      return {
        supplierId,
        variantId: product.variantId,
        variantLabel: this.getVariantLabel(product.variantId),
        unitCost: override?.unitCost ?? product.lastCost,
        currency: override?.currency ?? product.lastCurrency ?? null,
        freightCost: override?.freightCost ?? null,
        bonusType: override?.bonusType ?? null,
        bonusValue: override?.bonusValue ?? null,
        minQty: override?.minQty ?? null,
        leadTimeDays: override?.leadTimeDays ?? null,
        status: override?.status ?? baseStatus,
        overrideId: override?.id,
      } satisfies SupplierCatalogRow;
    });
  }

  private upsertOverride(item: SupplierCatalogItem): void {
    const index = this.catalogOverrides.findIndex((row) => row.id === item.id);
    if (index >= 0) {
      this.catalogOverrides[index] = item;
    } else {
      this.catalogOverrides = [item, ...this.catalogOverrides];
    }
    this.rebuildOverridesIndex();
  }

  private createDraftItem(row: SupplierCatalogRow | null): SupplierCatalogItem {
    const context = this.activeContextState.getActiveContext();
    const OrganizationId = context.organizationId ?? '';
    const companyId = context.companyId ?? '';
    const supplierId = this.selectedProviderId ?? '';
    return {
      id: row?.overrideId ?? '',
      supplierId,
      variantId: row?.variantId ?? '',
      unitCost: row?.unitCost ?? 0,
      currency: row?.currency ?? undefined,
      freightCost: row?.freightCost ?? undefined,
      bonusType: row?.bonusType ?? undefined,
      bonusValue: row?.bonusValue ?? undefined,
      minQty: row?.minQty ?? undefined,
      leadTimeDays: row?.leadTimeDays ?? undefined,
      validFrom: undefined,
      validTo: undefined,
      status: row?.status ?? 'active',
      OrganizationId,
      companyId,
    };
  }

  private showError(detail: string): void {
    this.messageService.add({
      severity: 'error',
      summary: 'Catalogo proveedor-producto',
      detail,
    });
  }

  private resolveAllowedCurrencyIds(
    company: Company | null,
    enterpriseId: string | null,
    coreCurrencies: CoreCurrency[],
  ): string[] {
    const normalizedEnterpriseId = this.normalizeId(enterpriseId);
    const enterprise = normalizedEnterpriseId
      ? this.findEnterprise(company, normalizedEnterpriseId)
      : null;
    const ids =
      enterprise?.currencyIds?.length
        ? enterprise.currencyIds
        : company?.currencies?.length
          ? company.currencies
          : coreCurrencies.map((currency) => currency.id);
    return this.normalizeCurrencyList(ids, coreCurrencies);
  }

  private resolveDefaultCurrencyId(
    contextCurrencyId: string | null,
    allowedIds: string[],
    company: Company | null,
    enterpriseId: string | null,
    coreCurrencies: CoreCurrency[],
  ): string | null {
    const normalizedAllowed = this.normalizeCurrencyList(allowedIds, coreCurrencies);
    const normalizedContext = this.normalizeCurrencyId(contextCurrencyId, coreCurrencies);
    if (normalizedContext && normalizedAllowed.includes(normalizedContext)) {
      return normalizedContext;
    }

    const enterprise = enterpriseId ? this.findEnterprise(company, enterpriseId) : null;
    const enterpriseDefault = this.normalizeCurrencyId(enterprise?.defaultCurrencyId ?? null, coreCurrencies);
    if (enterpriseDefault && normalizedAllowed.includes(enterpriseDefault)) {
      return enterpriseDefault;
    }

    const companyDefault = this.normalizeCurrencyId(
      company?.defaultCurrencyId ?? company?.baseCurrencyId ?? null,
      coreCurrencies,
    );
    if (companyDefault && normalizedAllowed.includes(companyDefault)) {
      return companyDefault;
    }

    return normalizedAllowed[0] ?? null;
  }

  private buildCurrencyOptions(allowedIds: string[], coreCurrencies: CoreCurrency[]): SelectOption[] {
    const normalizedAllowed = this.normalizeCurrencyList(allowedIds, coreCurrencies);
    if (coreCurrencies.length === 0) {
      return normalizedAllowed.map((id) => ({ value: id, label: id }));
    }
    return normalizedAllowed.map((id) => ({
      value: id,
      label: this.resolveCurrencyLabel(id, coreCurrencies),
    }));
  }

  private resolveCurrencyLabel(id: string, coreCurrencies: CoreCurrency[]): string {
    const currency = coreCurrencies.find((item) => item.id === id || item.code?.toUpperCase() === id.toUpperCase());
    if (!currency) {
      return id;
    }
    return currency.symbol
      ? `${currency.name.toUpperCase()} (${currency.symbol})`
      : `${currency.name.toUpperCase()} (${currency.code})`;
  }

  private normalizeCurrencyList(values: string[] | undefined, coreCurrencies: CoreCurrency[]): string[] {
    const normalized = (values ?? [])
      .map((value) => this.normalizeCurrencyId(value, coreCurrencies))
      .filter((value): value is string => Boolean(value));
    return Array.from(new Set(normalized));
  }

  private normalizeCurrencyId(value: string | null | undefined, coreCurrencies: CoreCurrency[]): string | null {
    const trimmed = typeof value === 'string' ? value.trim() : '';
    if (!trimmed) {
      return null;
    }
    const directMatch = coreCurrencies.find((currency) => currency.id === trimmed);
    if (directMatch) {
      return directMatch.id;
    }
    const upper = trimmed.toUpperCase();
    const codeMatch = coreCurrencies.find((currency) => currency.code?.toUpperCase() === upper);
    if (codeMatch) {
      return codeMatch.id;
    }
    return trimmed;
  }

  private normalizeId(value: string | null | undefined): string | null {
    const trimmed = typeof value === 'string' ? value.trim() : '';
    return trimmed.length > 0 ? trimmed : null;
  }

  private findEnterprise(company: Company | null, enterpriseId: string): CompanyEnterprise | null {
    if (!company?.enterprises?.length) {
      return null;
    }
    return (
      company.enterprises.find((enterprise) => this.normalizeId(enterprise.id) === enterpriseId) ??
      company.enterprises.find((enterprise) => this.normalizeId(enterprise._id ?? null) === enterpriseId) ??
      null
    );
  }
}
