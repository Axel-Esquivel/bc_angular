import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { Observable, forkJoin, of, switchMap } from 'rxjs';
import { map, take } from 'rxjs/operators';

import { ProductsApiService } from '../../../../core/api/products-api.service';
import { VariantsApiService } from '../../../../core/api/variants-api.service';
import { ActiveContextStateService } from '../../../../core/context/active-context-state.service';
import { OrganizationsService } from '../../../../core/api/organizations-api.service';
import { Product } from '../../../../shared/models/product.model';
import { ProductFormSubmit } from '../../components/product-form/product-form.component';

@Component({
  standalone: false,
  selector: 'app-products-list-page',
  templateUrl: './products-list-page.component.html',
  styleUrl: './products-list-page.component.scss',
})
export class ProductsListPageComponent implements OnInit {
  private readonly productsApi = inject(ProductsApiService);
  private readonly variantsApi = inject(VariantsApiService);
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

  readonly categoryOptions = [
    { label: 'Todas', value: '' },
    { label: 'General', value: 'general' },
    { label: 'Servicios', value: 'services' },
    { label: 'Electrónica', value: 'electronics' },
  ];

  readonly filtersForm = this.fb.nonNullable.group({
    search: [''],
    category: [''],
  });

  ngOnInit(): void {
    this.loadProducts();
    this.loadVariantsConfig();
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
    const { search, category } = this.filtersForm.getRawValue();
    this.productsApi
      .getProducts({
        enterpriseId,
        search: search?.trim(),
        category: category || undefined,
      })
      .subscribe({
        next: (response) => {
          const result = response.result;
          this.products = Array.isArray(result) ? result : result.items ?? [];
          this.loading = false;
        },
        error: (error) => {
          this.products = [];
          this.loading = false;
          this.showError(error, 'No se pudieron cargar los productos');
        },
      });
  }

  onResetFilters(): void {
    this.filtersForm.reset({ search: '', category: '' });
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

  private persistVariants(productId: string, payload: ProductFormSubmit): void {
    this.updateDefaultVariant(productId, payload.defaultVariant)
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.createAdditionalVariants(productId, payload.variants).subscribe(
            () => {
              this.saving = false;
              this.dialogVisible = false;
              this.loadProducts();
            },
            (error: unknown) => {
              this.saving = false;
              this.showError(error, 'No se pudieron crear las variantes adicionales');
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
