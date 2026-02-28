import { Component, OnInit, inject } from '@angular/core';
import { MessageService } from 'primeng/api';
import { forkJoin, of, switchMap } from 'rxjs';
import { Router } from '@angular/router';

import { ActiveContextStateService } from '../../../../core/context/active-context-state.service';
import { ProvidersService } from '../../../providers/services/providers.service';
import { PurchasesService } from '../../services/purchases.service';
import { ProductsApiService } from '../../../../core/api/products-api.service';
import { VariantsApiService } from '../../../../core/api/variants-api.service';
import { Product } from '../../../../shared/models/product.model';
import { ProductVariant } from '../../../../shared/models/product-variant.model';
import { Provider } from '../../../../shared/models/provider.model';
import {
  CreateSupplierCatalogDto,
  SupplierCatalogBonusType,
  SupplierCatalogItem,
  SupplierCatalogStatus,
  SupplierProductVariantItem,
} from '../../../../shared/models/supplier-catalog.model';

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
  private readonly productsApi = inject(ProductsApiService);
  private readonly variantsApi = inject(VariantsApiService);
  private readonly activeContextState = inject(ActiveContextStateService);
  private readonly messageService = inject(MessageService);
  private readonly router = inject(Router);

  providers: Provider[] = [];
  providerOptions: SelectOption[] = [];
  selectedProviderId: string | null = null;

  supplierProducts: SupplierProductVariantItem[] = [];
  catalogOverrides: SupplierCatalogItem[] = [];
  rows: SupplierCatalogRow[] = [];

  loading = false;
  saving = false;
  dialogVisible = false;
  editingItem: SupplierCatalogItem | null = null;
  editingOverrideId: string | null = null;
  contextMissing = false;

  variantOptions: SelectOption[] = [];
  private variantLabelById = new Map<string, string>();
  private overridesByVariant = new Map<string, SupplierCatalogItem>();

  ngOnInit(): void {
    this.loadProviders();
    this.loadVariants();
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
      this.showError('Selecciona organizaci\u00f3n, empresa y proveedor.');
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
        this.showError('No se pudo guardar el \u00edtem de cat\u00e1logo.');
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
        if (!this.selectedProviderId && this.providerOptions.length > 0) {
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
        this.showError('No se pudo cargar el cat\u00e1logo.');
      },
    });
  }

  resolveStatusLabel(status: SupplierCatalogStatus): string {
    return status === 'inactive' ? 'Inactivo' : 'Activo';
  }

  getVariantLabel(variantId: string): string {
    return this.variantLabelById.get(variantId) ?? variantId;
  }

  private loadVariants(): void {
    const context = this.activeContextState.getActiveContext();
    const enterpriseId = context.enterpriseId ?? undefined;
    if (!enterpriseId) {
      this.variantOptions = [];
      this.variantLabelById.clear();
      return;
    }

    this.productsApi
      .getProducts({ enterpriseId, includeInactive: true })
      .pipe(
        switchMap((response) => {
          const products = response.result?.items ?? [];
          if (products.length === 0) {
            return of({ products, variants: [] as ProductVariant[] });
          }
          const variantRequests = products.map((product) => this.variantsApi.getByProduct(product.id));
          return forkJoin(variantRequests).pipe(
            switchMap((variantResponses) => {
              const variants = variantResponses.flatMap((variantResponse) => variantResponse.result ?? []);
              return of({ products, variants });
            }),
          );
        }),
      )
      .subscribe({
        next: ({ products, variants }) => {
          this.variantOptions = this.mapVariantOptions(products, variants);
        },
        error: () => {
          this.variantOptions = [];
          this.variantLabelById.clear();
        },
      });
  }

  private mapVariantOptions(products: Product[], variants: ProductVariant[]): SelectOption[] {
    const productMap = new Map(products.map((product) => [product.id, product.name]));
    const options = variants.map((variant) => {
      const productName = productMap.get(variant.productId) ?? 'Producto';
      const label = `${productName} - ${variant.name || variant.sku || variant.id}`;
      return { label, value: variant.id };
    });
    this.variantLabelById = new Map(options.map((option) => [option.value, option.label]));
    return options;
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
      summary: 'Cat\u00e1logo proveedor-producto',
      detail,
    });
  }
}
