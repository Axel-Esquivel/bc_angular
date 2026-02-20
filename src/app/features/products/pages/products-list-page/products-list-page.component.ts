import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { Observable, forkJoin, of, switchMap } from 'rxjs';
import { finalize, map, take } from 'rxjs/operators';

import { ProductCategoriesApiService, ProductCategoryTreeNode } from '../../../../core/api/product-categories-api.service';
import { ProductPackagingApiService } from '../../../../core/api/product-packaging-api.service';
import { ProductsApiService } from '../../../../core/api/products-api.service';
import { VariantsApiService } from '../../../../core/api/variants-api.service';
import { ActiveContextStateService } from '../../../../core/context/active-context-state.service';
import { OrganizationsService } from '../../../../core/api/organizations-api.service';
import { Product } from '../../../../shared/models/product.model';
import { PackagingPayload, ProductFormSubmit } from '../../components/product-form/product-form.component';

interface CategoryOption {
  label: string;
  value: string;
}

@Component({
  standalone: false,
  selector: 'app-products-list-page',
  templateUrl: './products-list-page.component.html',
  styleUrl: './products-list-page.component.scss',
})
export class ProductsListPageComponent implements OnInit {
  private readonly productsApi = inject(ProductsApiService);
  private readonly variantsApi = inject(VariantsApiService);
  private readonly packagingApi = inject(ProductPackagingApiService);
  private readonly categoriesApi = inject(ProductCategoriesApiService);
  private readonly fb = inject(FormBuilder);
  private readonly messageService = inject(MessageService);
  private readonly activeContextState = inject(ActiveContextStateService);
  private readonly organizationsApi = inject(OrganizationsService);

  products: Product[] = [];
  loading = false;
  dialogVisible = false;
  saving = false;
  editingProduct: Product | null = null;
  contextMissing = false;
  enableVariants = false;
  statusUpdating = new Set<string>();

  categoryOptions: CategoryOption[] = [{ label: 'Todas', value: '' }];
  packagingPriceByProduct = new Map<string, number>();

  readonly filtersForm = this.fb.nonNullable.group({
    search: [''],
    category: [''],
    includeInactive: [false],
  });

  ngOnInit(): void {
    this.loadProducts();
    this.loadVariantsConfig();
    this.loadCategories();
  }

  loadProducts(): void {
    this.loading = true;
    const context = this.activeContextState.getActiveContext();
    const enterpriseId = context.enterpriseId ?? undefined;
    if (!enterpriseId) {
      this.products = [];
      this.loading = false;
      this.contextMissing = true;
      return;
    }
    this.contextMissing = false;
    const { search, category, includeInactive } = this.filtersForm.getRawValue();
    this.productsApi
      .getProducts({
        enterpriseId,
        search: search?.trim(),
        category: category || undefined,
        includeInactive,
      })
      .subscribe({
        next: (response) => {
          const result = response.result;
          this.products = Array.isArray(result) ? result : result.items ?? [];
          this.loading = false;
          this.loadPackagingPrices(this.products);
        },
        error: (error) => {
          this.products = [];
          this.loading = false;
          this.showError(error, 'No se pudieron cargar los productos');
        },
      });
  }

  onResetFilters(): void {
    this.filtersForm.reset({ search: '', category: '', includeInactive: false });
    this.loadProducts();
  }

  openCreate(): void {
    this.editingProduct = null;
    this.dialogVisible = true;
  }

  openEdit(product: Product): void {
    this.editingProduct = product;
    this.dialogVisible = true;
  }

  toggleStatus(product: Product): void {
    if (this.statusUpdating.has(product.id)) {
      return;
    }
    const nextStatus = !product.isActive;
    const message = nextStatus
      ? '¿Activar producto?'
      : '¿Desactivar producto? Podrás reactivarlo después.';
    if (!window.confirm(message)) {
      return;
    }
    const context = this.activeContextState.getActiveContext();
    const organizationId = context.organizationId ?? undefined;
    if (!organizationId) {
      this.showError(null, 'El organizationId es requerido.');
      return;
    }
    this.statusUpdating.add(product.id);
    this.productsApi
      .setProductStatus(organizationId, product.id, nextStatus)
      .pipe(finalize(() => this.statusUpdating.delete(product.id)))
      .subscribe({
        next: (response) => {
          const updated = response.result;
          if (updated) {
            product.isActive = updated.isActive;
          } else {
            product.isActive = nextStatus;
          }
          this.loadProducts();
        },
        error: (error) => {
          this.showError(error, 'No se pudo actualizar el estado del producto');
        },
      });
  }

  onFormSave(payload: ProductFormSubmit): void {
    const context = this.activeContextState.getActiveContext();
    const enterpriseId = context.enterpriseId ?? undefined;
    if (!enterpriseId) {
      this.showError(null, 'El enterpriseId es requerido.');
      return;
    }

    this.saving = true;
    const productPayload = {
      ...payload.product,
      OrganizationId: context.organizationId ?? undefined,
      companyId: context.companyId ?? undefined,
      enterpriseId,
    };

    const request$ = this.editingProduct?.id
      ? this.productsApi.updateProduct(this.editingProduct.id, productPayload)
      : this.productsApi.createProduct(productPayload);

    request$.subscribe({
      next: (response) => {
        const product = response.result;
        if (!product) {
          this.saving = false;
          return;
        }
        this.persistVariants(product.id, payload);
      },
      error: (error) => {
        this.saving = false;
        this.showError(error, 'No se pudo guardar el producto');
      },
    });
  }

  private loadVariantsConfig(): void {
    const context = this.activeContextState.getActiveContext();
    const organizationId = context.organizationId ?? undefined;
    const enterpriseId = context.enterpriseId ?? undefined;
    if (!organizationId || !enterpriseId) {
      this.enableVariants = false;
      return;
    }
    this.organizationsApi
      .getById(organizationId)
      .pipe(take(1))
      .subscribe({
        next: (response) => {
          const settings = response.result?.moduleSettings?.['products'] ?? null;
          this.enableVariants = this.isProductsSettings(settings) && settings.enableVariants === true;
        },
        error: () => {
          this.enableVariants = false;
        },
      });
  }

  private loadCategories(): void {
    const context = this.activeContextState.getActiveContext();
    const organizationId = context.organizationId ?? undefined;
    if (!organizationId) {
      this.categoryOptions = [{ label: 'Todas', value: '' }];
      return;
    }
    this.categoriesApi.getTree(organizationId).subscribe({
      next: (response) => {
        const tree = response.result ?? [];
        const flat = this.flattenCategoryTree(tree);
        this.categoryOptions = [{ label: 'Todas', value: '' }, ...flat];
      },
      error: () => {
        this.categoryOptions = [{ label: 'Todas', value: '' }];
      },
    });
  }

  private flattenCategoryTree(nodes: ProductCategoryTreeNode[], prefix = ''): CategoryOption[] {
    const result: CategoryOption[] = [];
    nodes.forEach((node) => {
      const label = prefix ? `${prefix} / ${node.name}` : node.name;
      result.push({ label, value: node.id });
      if (node.children && node.children.length > 0) {
        result.push(...this.flattenCategoryTree(node.children, label));
      }
    });
    return result;
  }

  private persistVariants(productId: string, payload: ProductFormSubmit): void {
    this.updateDefaultVariant(productId, payload.defaultVariant)
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.createPackagingForDefaultVariant(productId, payload.packaging).subscribe(
            () => {
              this.createAdditionalVariants(productId, payload.variants).subscribe(
                () => {
                  this.deleteVariants(payload.deletedVariantIds ?? []).subscribe(
                    () => {
                      this.saving = false;
                      this.dialogVisible = false;
                      this.loadProducts();
                    },
                    (error: unknown) => {
                      this.saving = false;
                      this.showError(error, 'No se pudieron eliminar las variantes');
                    },
                  );
                },
                (error: unknown) => {
                  this.saving = false;
                  this.showError(error, 'No se pudieron crear las variantes adicionales');
                },
              );
            },
            (error: unknown) => {
              this.saving = false;
              this.showError(error, 'No se pudieron crear los empaques');
            },
          );
        },
        error: (error) => {
          this.saving = false;
          this.showError(error, 'No se pudo actualizar la variante por defecto');
        },
      });
  }

  private updateDefaultVariant(productId: string, payload: ProductFormSubmit['defaultVariant']) {
    return this.variantsApi.getByProduct(productId).pipe(
      switchMap((response) => {
        const defaultVariant = response.result?.[0];
        if (!defaultVariant) {
          return of(null);
        }
        return this.variantsApi.updateVariant(defaultVariant.id, payload);
      }),
    );
  }

  private createPackagingForDefaultVariant(
    productId: string,
    packaging: PackagingPayload[],
  ): Observable<null> {
    return this.variantsApi.getByProduct(productId).pipe(
      switchMap((response) => {
        const defaultVariant = response.result?.[0];
        if (!defaultVariant) {
          return of(null);
        }
        const rows = packaging.length > 0 ? packaging : [{ name: 'Unidad', unitsPerPack: 1, price: 0 }];
        const requests = rows.map((row) => this.packagingApi.create(defaultVariant.id, row));
        return forkJoin(requests).pipe(map(() => null));
      }),
    );
  }

  private createAdditionalVariants(
    productId: string,
    variants: ProductFormSubmit['variants'],
  ): Observable<null> {
    if (!this.enableVariants || variants.length === 0) {
      return of(null);
    }
    const requests = variants.map((variant) => this.variantsApi.createForProduct(productId, variant));
    return forkJoin(requests).pipe(map(() => null));
  }

  private deleteVariants(variantIds: string[]): Observable<null> {
    if (!variantIds || variantIds.length === 0) {
      return of(null);
    }
    const requests = variantIds.map((id) => this.variantsApi.deleteVariant(id));
    return forkJoin(requests).pipe(map(() => null));
  }

  private loadPackagingPrices(products: Product[]): void {
    if (products.length === 0) {
      this.packagingPriceByProduct.clear();
      return;
    }
    const requests = products.map((product) =>
      this.variantsApi.getByProduct(product.id).pipe(
        switchMap((response) => {
          const defaultVariant = response.result?.[0];
          if (!defaultVariant) {
            return of({ productId: product.id, price: 0 });
          }
          return this.packagingApi.listByVariant(defaultVariant.id).pipe(
            map((packResponse) => {
              const list = packResponse.result ?? [];
              const unit = list.find((item) => item.unitsPerPack === 1 && item.isActive) ?? list[0];
              return { productId: product.id, price: unit?.price ?? 0 };
            }),
          );
        }),
      ),
    );

    forkJoin(requests).subscribe({
      next: (rows) => {
        this.packagingPriceByProduct.clear();
        rows.forEach((row) => {
          this.packagingPriceByProduct.set(row.productId, row.price);
        });
      },
      error: () => {
        this.packagingPriceByProduct.clear();
      },
    });
  }

  private isProductsSettings(value: unknown): value is { enableVariants?: boolean } {
    return typeof value === 'object' && value !== null && 'enableVariants' in value;
  }

  private showError(error: unknown, fallback: string): void {
    const detail =
      typeof error === 'object' && error !== null && 'error' in error
        ? (error as { error?: { message?: string } }).error?.message ?? fallback
        : fallback;
    this.messageService.add({
      severity: 'error',
      summary: 'Error',
      detail,
    });
  }
}
