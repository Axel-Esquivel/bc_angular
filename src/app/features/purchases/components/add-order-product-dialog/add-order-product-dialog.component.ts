import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';

import { PurchasesService, SupplierLastCostResult } from '../../services/purchases.service';
import {
  PurchasesProductsLookupService,
  VariantOption,
} from '../../services/purchases-products-lookup.service';

export interface AddOrderProductResult {
  variantId: string;
  variantLabel: string;
  qty: number;
  unitCost: number;
  lastCost: number | null;
  lastCurrency: string | null;
}

type AddProductForm = FormGroup<{
  variant: FormControl<ProductOptionDisplay | null>;
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
export class AddOrderProductDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly purchasesService = inject(PurchasesService);
  private readonly lookupService = inject(PurchasesProductsLookupService);
  private readonly messageService = inject(MessageService);

  @Input() supplierId: string | null = null;
  @Input() OrganizationId: string | null = null;
  @Input() companyId: string | null = null;

  @Output() save = new EventEmitter<AddOrderProductResult>();
  @Output() cancel = new EventEmitter<void>();

  form: AddProductForm = this.fb.group({
    variant: this.fb.control<ProductOptionDisplay | null>(null, { validators: [Validators.required] }),
    qty: this.fb.control<number | null>(1, { validators: [Validators.required, Validators.min(0.01)] }),
    unitCost: this.fb.control<number | null>(null, { validators: [Validators.required, Validators.min(0)] }),
  });

  filteredVariants: ProductOptionDisplay[] = [];
  lastCost: SupplierLastCostResult | null = null;

  onSearch(event: { query: string }): void {
    const term = event.query ?? '';
    this.lookupService.searchVariants(term).subscribe({
      next: (options) => {
        this.filteredVariants = options.map((option) => ({
          ...option,
          display: this.formatOption(option),
        }));
      },
      error: () => {
        this.filteredVariants = [];
      },
    });
  }

  onVariantSelect(event: { value: ProductOptionDisplay }): void {
    const option = event.value;
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
      variantLabel: variant.name,
      qty,
      unitCost,
      lastCost: this.lastCost?.lastCost ?? null,
      lastCurrency: this.lastCost?.lastCurrency ?? null,
    });
  }

  close(): void {
    this.cancel.emit();
  }

  private showError(detail: string): void {
    this.messageService.add({
      severity: 'error',
      summary: 'Pedidos',
      detail,
    });
  }

  private formatOption(option: VariantOption): string {
    return option.sku ? `${option.name} (${option.sku})` : option.name;
  }
}

interface ProductOptionDisplay extends VariantOption {
  display: string;
}
