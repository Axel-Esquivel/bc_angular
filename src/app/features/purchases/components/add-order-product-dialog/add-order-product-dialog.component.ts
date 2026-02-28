import { Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { forkJoin, of, switchMap } from 'rxjs';

import { ActiveContextStateService } from '../../../../core/context/active-context-state.service';
import { ProductsApiService } from '../../../../core/api/products-api.service';
import { VariantsApiService } from '../../../../core/api/variants-api.service';
import { Product } from '../../../../shared/models/product.model';
import { ProductVariant } from '../../../../shared/models/product-variant.model';
import { PurchasesService, SupplierLastCostResult } from '../../services/purchases.service';

export interface VariantOption {
  id: string;
  label: string;
  sku?: string;
}

export interface AddOrderProductResult {
  variantId: string;
  variantLabel: string;
  qty: number;
  unitCost: number;
  lastCost: number | null;
  lastCurrency: string | null;
}

type AddProductForm = FormGroup<{
  variant: FormControl<VariantOption | null>;
  qty: FormControl<number | null>;
  unitCost: FormControl<number | null>;
}>;

@Component({
  selector: 'app-add-order-product-dialog',
  standalone: false,
  templateUrl: './add-order-product-dialog.component.html',
  styleUrl: './add-order-product-dialog.component.scss',
  providers: [MessageService],
})
export class AddOrderProductDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly purchasesService = inject(PurchasesService);
  private readonly productsApi = inject(ProductsApiService);
  private readonly variantsApi = inject(VariantsApiService);
  private readonly activeContextState = inject(ActiveContextStateService);
  private readonly messageService = inject(MessageService);

  @Input() supplierId: string | null = null;
  @Input() OrganizationId: string | null = null;
  @Input() companyId: string | null = null;

  @Output() save = new EventEmitter<AddOrderProductResult>();
  @Output() cancel = new EventEmitter<void>();

  form: AddProductForm = this.fb.group({
    variant: this.fb.control<VariantOption | null>(null, { validators: [Validators.required] }),
    qty: this.fb.control<number | null>(1, { validators: [Validators.required, Validators.min(0.01)] }),
    unitCost: this.fb.control<number | null>(null, { validators: [Validators.required, Validators.min(0)] }),
  });

  variantOptions: VariantOption[] = [];
  filteredVariants: VariantOption[] = [];
  lastCost: SupplierLastCostResult | null = null;

  ngOnInit(): void {
    this.loadVariants();
  }

  onSearch(event: { query: string }): void {
    const query = event.query.toLowerCase();
    this.filteredVariants = this.variantOptions.filter((option) => {
      const label = option.label.toLowerCase();
      const sku = option.sku?.toLowerCase() ?? '';
      return label.includes(query) || sku.includes(query);
    });
  }

  onVariantSelect(option: VariantOption): void {
    const supplierId = this.supplierId ?? undefined;
    const OrganizationId = this.OrganizationId ?? undefined;
    const companyId = this.companyId ?? undefined;

    if (!supplierId || !OrganizationId || !companyId) {
      this.lastCost = null;
      return;
    }

    this.purchasesService
      .getSupplierVariantLastCost({ OrganizationId, companyId, supplierId, variantId: option.id })
      .subscribe({
        next: ({ result }) => {
          this.lastCost = result ?? null;
          if (result?.lastCost !== null && result?.lastCost !== undefined) {
            this.form.controls.unitCost.setValue(result.lastCost);
          }
        },
        error: () => {
          this.lastCost = null;
        },
      });
  }

  confirm(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const variant = this.form.controls.variant.value;
    const qty = this.form.controls.qty.value ?? 0;
    const unitCost = this.form.controls.unitCost.value ?? 0;

    if (!variant) {
      return;
    }

    if (qty <= 0) {
      this.showError('La cantidad debe ser mayor a 0.');
      return;
    }

    if (unitCost < 0) {
      this.showError('El precio no puede ser negativo.');
      return;
    }

    this.save.emit({
      variantId: variant.id,
      variantLabel: variant.label,
      qty,
      unitCost,
      lastCost: this.lastCost?.lastCost ?? null,
      lastCurrency: this.lastCost?.lastCurrency ?? null,
    });
  }

  close(): void {
    this.cancel.emit();
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

  private mapVariantOptions(products: Product[], variants: ProductVariant[]): VariantOption[] {
    const productMap = new Map(products.map((product) => [product.id, product.name]));
    return variants.map((variant) => {
      const productName = productMap.get(variant.productId) ?? 'Producto';
      const label = `${productName} - ${variant.name || variant.sku || variant.id}`;
      return {
        id: variant.id,
        label,
        sku: variant.sku ?? undefined,
      };
    });
  }

  private showError(detail: string): void {
    this.messageService.add({
      severity: 'error',
      summary: 'Pedidos',
      detail,
    });
  }
}
