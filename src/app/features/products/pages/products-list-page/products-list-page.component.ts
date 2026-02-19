import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';

import { ProductsApiService } from '../../../../core/api/products-api.service';
import { VariantsApiService } from '../../../../core/api/variants-api.service';
import { ActiveContextStateService } from '../../../../core/context/active-context-state.service';
import { OrganizationsService } from '../../../../core/api/organizations-api.service';
import { Product } from '../../../../shared/models/product.model';
import { ProductVariant } from '../../../../shared/models/product-variant.model';
import { Observable, Subject, forkJoin, of, switchMap } from 'rxjs';
import { map, take, takeUntil } from 'rxjs/operators';

type VariantFormGroup = FormGroup<{
  name: FormControl<string>;
  sku: FormControl<string>;
  barcodes: FormControl<string>;
  uomId: FormControl<string>;
  price: FormControl<number>;
  minStock: FormControl<number>;
  sellable: FormControl<boolean>;
}>;

@Component({
  standalone: false,
  selector: 'app-products-list-page',
  templateUrl: './products-list-page.component.html',
  styleUrl: './products-list-page.component.scss',
})
export class ProductsListPageComponent implements OnInit, OnDestroy {
  private readonly productsApi = inject(ProductsApiService);
  private readonly variantsApi = inject(VariantsApiService);
  private readonly fb = inject(FormBuilder);
  private readonly messageService = inject(MessageService);
  private readonly activeContextState = inject(ActiveContextStateService);
  private readonly organizationsApi = inject(OrganizationsService);
  private readonly destroy$ = new Subject<void>();
  private defaultVariantNameEdited = false;
  private suppressDefaultNameSync = false;

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
    isActive: [true],
  });

  readonly defaultVariantForm = this.fb.nonNullable.group({
    name: [''],
    sku: [''],
    barcodes: [''],
    uomId: ['unit', [Validators.required]],
    price: [0, [Validators.required, Validators.min(0)]],
    minStock: [0, [Validators.min(0)]],
  });

  readonly variantsFormArray = new FormArray<VariantFormGroup>([]);

  ngOnInit(): void {
    this.loadProducts();
    this.loadVariantsConfig();
    this.productForm.controls.name.valueChanges.pipe(takeUntil(this.destroy$)).subscribe((value) => {
      if (this.defaultVariantNameEdited) {
        return;
      }
      const next = value?.trim();
      if (!next) {
        return;
      }
      this.suppressDefaultNameSync = true;
      this.defaultVariantForm.controls.name.setValue(next, { emitEvent: false });
      this.defaultVariantForm.controls.name.markAsPristine();
      this.suppressDefaultNameSync = false;
    });
    this.defaultVariantForm.controls.name.valueChanges.pipe(takeUntil(this.destroy$)).subscribe((value) => {
      if (this.suppressDefaultNameSync) {
        return;
      }
      if (value && value.trim().length > 0) {
        this.defaultVariantNameEdited = true;
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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
    this.defaultVariantNameEdited = false;
    this.productForm.reset({
      name: '',
      category: '',
      isActive: true,
    });
    this.defaultVariantForm.reset({
      name: '',
      sku: '',
      barcodes: '',
      uomId: 'unit',
      price: 0,
      minStock: 0,
    });
    this.variants = [];
    this.variantsFormArray.clear();
    this.defaultVariantId = null;
    this.dialogVisible = true;
  }

  openEdit(product: Product): void {
    this.editingProduct = product;
    this.defaultVariantNameEdited = false;
    this.productForm.reset({
      name: product.name ?? '',
      category: product.category ?? '',
      isActive: product.isActive ?? true,
    });
    this.defaultVariantForm.reset({
      name: '',
      sku: '',
      barcodes: '',
      uomId: 'unit',
      price: 0,
      minStock: 0,
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
    const barcodes = this.ensureBarcodes(this.parseBarcodes(this.defaultVariantForm.controls.barcodes.value));
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
          name: this.defaultVariantForm.controls.name.value || payload.name,
          sku: this.defaultVariantForm.controls.sku.value || undefined,
          barcodes,
          uomId: this.defaultVariantForm.controls.uomId.value,
          price: this.defaultVariantForm.controls.price.value,
          minStock: this.defaultVariantForm.controls.minStock.value,
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
      this.showError(null, 'Las variantes adicionales están deshabilitadas.');
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
              name: defaultVariant.name ?? '',
              sku: defaultVariant.sku ?? '',
              barcodes: defaultVariant.barcodes?.join(', ') ?? '',
              uomId: defaultVariant.uomId ?? 'unit',
              price: defaultVariant.price ?? 0,
              minStock: defaultVariant.minStock ?? 0,
            });
            if (defaultVariant.name) {
              this.defaultVariantNameEdited = true;
            }
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
    defaultPayload: {
      name: string;
      sku?: string;
      barcodes: string[];
      uomId: string;
      price: number;
      minStock: number;
      sellable: boolean;
    },
  ): void {
    this.updateDefaultVariant(productId, defaultPayload)
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.createAdditionalVariants(productId).subscribe(
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
    payload: {
      name: string;
      sku?: string;
      barcodes: string[];
      uomId: string;
      price: number;
      minStock: number;
      sellable: boolean;
    },
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

  private createAdditionalVariants(productId: string): Observable<null> {
    const groups = this.variantsFormArray.controls;
    if (groups.length === 0) {
      return of(null);
    }
    const requests = groups.map((group) => {
      const value = group.getRawValue();
      return this.variantsApi.createForProduct(productId, {
        name: value.name,
        sku: value.sku?.trim() || undefined,
        barcodes: this.ensureBarcodes(this.parseBarcodes(value.barcodes)),
        uomId: value.uomId,
        price: value.price,
        minStock: value.minStock,
        sellable: value.sellable,
      });
    });
    return forkJoin(requests).pipe(map(() => null));
  }

  private createVariantGroup(): VariantFormGroup {
    return this.fb.nonNullable.group({
      name: ['', [Validators.required]],
      sku: [''],
      barcodes: [''],
      uomId: ['unit', [Validators.required]],
      price: [0, [Validators.required, Validators.min(0)]],
      minStock: [0, [Validators.min(0)]],
      sellable: [true],
    });
  }

  private parseBarcodes(value: string): string[] {
    return value
      .split(',')
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
  }

  private ensureBarcodes(values: string[]): string[] {
    if (values.length > 0) {
      return values;
    }
    return [this.generateInternalBarcode()];
  }

  private generateInternalBarcode(): string {
    const suffix = Math.floor(Date.now() / 1000).toString(36).toUpperCase();
    return `INT-${suffix}`;
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
