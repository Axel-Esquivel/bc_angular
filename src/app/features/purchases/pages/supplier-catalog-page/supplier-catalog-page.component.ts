import { Component, OnInit, inject } from '@angular/core';
import { MessageService } from 'primeng/api';
import { forkJoin, of, switchMap } from 'rxjs';

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
  SupplierCatalogItem,
  SupplierCatalogStatus,
} from '../../../../shared/models/supplier-catalog.model';

interface SelectOption {
  label: string;
  value: string;
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

  providers: Provider[] = [];
  providerOptions: SelectOption[] = [];
  selectedProviderId: string | null = null;

  catalog: SupplierCatalogItem[] = [];
  loading = false;
  saving = false;
  dialogVisible = false;
  editingItem: SupplierCatalogItem | null = null;
  contextMissing = false;

  variantOptions: SelectOption[] = [];

  ngOnInit(): void {
    this.loadProviders();
    this.loadVariants();
  }

  openCreate(): void {
    if (!this.selectedProviderId) {
      this.showError('Selecciona un proveedor para continuar.');
      return;
    }
    this.editingItem = null;
    this.dialogVisible = true;
  }

  openEdit(item: SupplierCatalogItem): void {
    this.editingItem = item;
    this.dialogVisible = true;
  }

  closeDialog(): void {
    this.dialogVisible = false;
  }

  onProviderChange(): void {
    this.loadCatalog();
  }

  onFormSave(payload: CreateSupplierCatalogDto): void {
    const context = this.activeContextState.getActiveContext();
    const OrganizationId = context.organizationId ?? undefined;
    const companyId = context.companyId ?? undefined;
    const supplierId = this.selectedProviderId ?? undefined;

    if (!OrganizationId || !companyId || !supplierId) {
      this.showError('Selecciona organización, empresa y proveedor.');
      return;
    }

    this.saving = true;

    const request$ = this.editingItem
      ? this.purchasesService.updateSupplierCatalog(this.editingItem.id, OrganizationId, companyId, {
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
          this.upsertCatalogItem(result);
        }
        this.saving = false;
        this.dialogVisible = false;
      },
      error: () => {
        this.saving = false;
        this.showError('No se pudo guardar el ítem de catálogo.');
      },
    });
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
        this.loadCatalog();
      },
      error: () => {
        this.providers = [];
        this.providerOptions = [];
        this.showError('No se pudieron cargar los proveedores.');
      },
    });
  }

  loadCatalog(): void {
    const context = this.activeContextState.getActiveContext();
    const OrganizationId = context.organizationId ?? undefined;
    const companyId = context.companyId ?? undefined;
    const supplierId = this.selectedProviderId ?? undefined;

    if (!OrganizationId || !companyId || !supplierId) {
      this.catalog = [];
      return;
    }

    this.loading = true;
    this.purchasesService
      .getSupplierCatalog({ OrganizationId, companyId, supplierId })
      .subscribe({
        next: ({ result }) => {
          this.catalog = Array.isArray(result) ? result : [];
          this.loading = false;
        },
        error: () => {
          this.catalog = [];
          this.loading = false;
          this.showError('No se pudo cargar el catálogo.');
        },
      });
  }

  resolveStatusLabel(status: SupplierCatalogStatus): string {
    return status === 'inactive' ? 'Inactivo' : 'Activo';
  }

  private loadVariants(): void {
    const context = this.activeContextState.getActiveContext();
    const enterpriseId = context.enterpriseId ?? undefined;
    if (!enterpriseId) {
      this.variantOptions = [];
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
        },
      });
  }

  private mapVariantOptions(products: Product[], variants: ProductVariant[]): SelectOption[] {
    const productMap = new Map(products.map((product) => [product.id, product.name]));
    return variants.map((variant) => {
      const productName = productMap.get(variant.productId) ?? 'Producto';
      const label = `${productName} - ${variant.name || variant.sku || variant.id}`;
      return { label, value: variant.id };
    });
  }

  private upsertCatalogItem(item: SupplierCatalogItem): void {
    const index = this.catalog.findIndex((row) => row.id === item.id);
    if (index >= 0) {
      this.catalog[index] = item;
      this.catalog = [...this.catalog];
      return;
    }
    this.catalog = [item, ...this.catalog];
  }

  private showError(detail: string): void {
    this.messageService.add({
      severity: 'error',
      summary: 'Catálogo proveedor-producto',
      detail,
    });
  }
}
