import { Component, OnInit, inject } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';

import { ProductsApiService } from '../../../../core/api/products-api.service';
import { VariantsApiService } from '../../../../core/api/variants-api.service';
import { ActiveContextStateService } from '../../../../core/context/active-context-state.service';
import { OrganizationsService } from '../../../../core/api/organizations-api.service';
import { Product } from '../../../../shared/models/product.model';
import { ProductVariant } from '../../../../shared/models/product-variant.model';
import { forkJoin, of, switchMap } from 'rxjs';
import { take } from 'rxjs/operators';

type VariantFormGroup = FormGroup<{
  name: FormControl<string>;
  sku: FormControl<string>;
  barcodes: FormControl<string>;
  uomId: FormControl<string>;
  sellable: FormControl<boolean>;
}>;

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
  variants: ProductVariant[] = [];
  variantsLoading = false;
  defaultVariantId: string | null = null;

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

  readonly productForm = this.fb.nonNullable.group({
    name: ['', [Validators.required]],
    category: [''],
    price: [0, [Validators.required, Validators.min(0)]],
    isActive: [true],
  });

  readonly defaultVariantForm = this.fb.nonNullable.group({
    sku: [''],
    barcodes: [''],
    uomId: ['unit', [Validators.required]],
  });

  readonly variantsFormArray = new FormArray<VariantFormGroup>([]);

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
    this.productForm.reset({
      name: '',
      category: '',
      price: 0,
      isActive: true,
    });
    this.defaultVariantForm.reset({
      sku: '',
      barcodes: '',
      uomId: 'unit',
    });
    this.variants = [];
    this.variantsFormArray.clear();
    this.defaultVariantId = null;
    this.dialogVisible = true;
  }

  openEdit(product: Product): void {
    this.editingProduct = product;
    this.productForm.reset({
      name: product.name ?? '',
      category: product.category ?? '',
      price: product.price ?? 0,
      isActive: product.isActive ?? true,
    });
    this.defaultVariantForm.reset({
      sku: '',
      barcodes: '',
      uomId: 'unit',
    });
    this.variantsFormArray.clear();
    this.loadVariants(product.id);
    this.dialogVisible = true;
  }

  saveProduct(): void {
    if (this.productForm.invalid || this.defaultVariantForm.invalid) {
      this.productForm.markAllAsTouched();
      this.defaultVariantForm.markAllAsTouched();
      return;
    }

    const context = this.activeContextState.getActiveContext();
    const enterpriseId = context.enterpriseId ?? undefined;
    if (!enterpriseId) {
      this.showError(null, 'El enterpriseId es requerido.');
      return;
    }

    this.saving = true;
    const barcodes = this.parseBarcodes(this.defaultVariantForm.controls.barcodes.value);
    const payload = {
      ...this.productForm.getRawValue(),
      OrganizationId: context.organizationId ?? undefined,
      companyId: context.companyId ?? undefined,
      enterpriseId,
    };

    const request$ = this.editingProduct?.id
      ? this.productsApi.updateProduct(this.editingProduct.id, payload)
      : this.productsApi.createProduct(payload);

    request$.subscribe({
      next: (response) => {
        const product = response.result;
        if (!product) {
          this.saving = false;
          return;
        }
        const defaultPayload = {
          name: payload.name,
          sku: this.defaultVariantForm.controls.sku.value || undefined,
          barcodes,
          uomId: this.defaultVariantForm.controls.uomId.value,
          sellable: true,
        };
        this.persistVariants(product.id, defaultPayload);
      },
      error: (error) => {
        this.saving = false;
        this.showError(error, 'No se pudo guardar el producto');
      },
    });
  }

  openVariantCreate(): void {
    if (!this.enableVariants) {
      this.showError(null, 'Las variantes adicionales est?n deshabilitadas.');
      return;
    }
    this.variantsFormArray.push(this.createVariantGroup());
  }

  removeVariant(index: number): void {
    this.variantsFormArray.removeAt(index);
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

  private loadVariants(productId: string): void {
    if (!productId) {
      return;
    }
    this.variantsLoading = true;
    this.variantsApi
      .getByProduct(productId)
      .pipe(take(1))
      .subscribe({
        next: (response) => {
          this.variants = response.result ?? [];
          const defaultVariant = this.variants[0] ?? null;
          this.defaultVariantId = defaultVariant?.id ?? null;
          if (defaultVariant) {
            this.defaultVariantForm.patchValue({
              sku: defaultVariant.sku ?? '',
              barcodes: defaultVariant.barcodes?.join(', ') ?? '',
              uomId: defaultVariant.uomId ?? 'unit',
            });
          }
          this.variantsLoading = false;
        },
        error: (error) => {
          this.variants = [];
          this.defaultVariantId = null;
          this.variantsLoading = false;
          this.showError(error, 'No se pudieron cargar las variantes');
        },
      });
  }

  private persistVariants(
    productId: string,
    defaultPayload: { name: string; sku?: string; barcodes: string[]; uomId: string; sellable: boolean },
  ): void {
    this.updateDefaultVariant(productId, defaultPayload)
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.createAdditionalVariants(productId)
            .pipe(take(1))
            .subscribe(
              () => {
                this.saving = false;
                this.dialogVisible = false;
                this.variantsFormArray.clear();
                this.loadProducts();
                if (this.editingProduct) {
                  this.loadVariants(productId);
                }
              },
              (error: unknown) => {
                this.saving = false;
                this.showError(error, 'No se pudieron crear las variantes adicionales');
              }
            );
        },
        error: (error) => {
          this.saving = false;
          this.showError(error, 'No se pudo actualizar la variante por defecto');
        },
      });
  }

  private updateDefaultVariant(
    productId: string,
    payload: { name: string; sku?: string; barcodes: string[]; uomId: string; sellable: boolean },
  ) {
    if (this.defaultVariantId) {
      return this.variantsApi.updateVariant(this.defaultVariantId, payload);
    }
    return this.variantsApi.getByProduct(productId).pipe(
      switchMap((response) => {
        const defaultVariant = response.result?.[0];
        if (!defaultVariant) {
          return of(null);
        }
        this.defaultVariantId = defaultVariant.id;
        return this.variantsApi.updateVariant(defaultVariant.id, payload);
      }),
    );
  }

  private createAdditionalVariants(productId: string) {
    const groups = this.variantsFormArray.controls;
    if (groups.length === 0) {
      return of(null);
    }
    const requests = groups.map((group) => {
      const value = group.getRawValue();
      return this.variantsApi.createForProduct(productId, {
        name: value.name,
        sku: value.sku?.trim() || undefined,
        barcodes: this.parseBarcodes(value.barcodes),
        uomId: value.uomId,
        sellable: value.sellable,
      });
    });
    return forkJoin(requests);
  }

  private createVariantGroup(): VariantFormGroup {
    return this.fb.nonNullable.group({
      name: ['', [Validators.required]],
      sku: [''],
      barcodes: [''],
      uomId: ['unit', [Validators.required]],
      sellable: [true],
    });
  }

  private parseBarcodes(value: string): string[] {
    return value
      .split(',')
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
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
