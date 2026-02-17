import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';

import { ProductsApiService } from '../../../../core/api/products-api.service';
import { ActiveContextStateService } from '../../../../core/context/active-context-state.service';
import { Product } from '../../../../shared/models/product.model';

@Component({
  standalone: false,
  selector: 'app-products-list-page',
  templateUrl: './products-list-page.component.html',
  styleUrl: './products-list-page.component.scss',
})
export class ProductsListPageComponent implements OnInit {
  private readonly productsApi = inject(ProductsApiService);
  private readonly fb = inject(FormBuilder);
  private readonly messageService = inject(MessageService);
  private readonly activeContextState = inject(ActiveContextStateService);

  products: Product[] = [];
  loading = false;
  dialogVisible = false;
  saving = false;
  editingProduct: Product | null = null;

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
    sku: [''],
    barcode: [''],
    price: [0, [Validators.required, Validators.min(0)]],
    isActive: [true],
  });

  ngOnInit(): void {
    this.loadProducts();
  }

  loadProducts(): void {
    this.loading = true;
    const context = this.activeContextState.getActiveContext();
    const enterpriseId = context.enterpriseId ?? undefined;
    if (!enterpriseId) {
      this.products = [];
      this.loading = false;
      return;
    }
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
      sku: '',
      barcode: '',
      price: 0,
      isActive: true,
    });
    this.dialogVisible = true;
  }

  openEdit(product: Product): void {
    this.editingProduct = product;
    this.productForm.reset({
      name: product.name ?? '',
      sku: product.sku ?? '',
      barcode: product.barcode ?? '',
      price: product.price ?? 0,
      isActive: product.isActive ?? true,
    });
    this.dialogVisible = true;
  }

  saveProduct(): void {
    if (this.productForm.invalid) {
      this.productForm.markAllAsTouched();
      return;
    }

    const context = this.activeContextState.getActiveContext();
    const enterpriseId = context.enterpriseId ?? undefined;
    if (!enterpriseId) {
      this.showError(null, 'El enterpriseId es requerido.');
      return;
    }

    this.saving = true;
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
      next: () => {
        this.saving = false;
        this.dialogVisible = false;
        this.loadProducts();
      },
      error: (error) => {
        this.saving = false;
        this.showError(error, 'No se pudo guardar el producto');
      },
    });
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
