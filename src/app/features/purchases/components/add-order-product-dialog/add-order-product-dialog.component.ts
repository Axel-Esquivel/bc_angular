import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';

import { PurchasesService, SupplierLastCostResult } from '../../services/purchases.service';
import { VariantOption } from '../../../../shared/services/variants-lookup.service';

export interface AddOrderProductResult {
  productId: string;
  variantId: string;
  variantLabel: string;
  qty: number;
  unitCost: number;
  lastCost: number | null;
  lastCurrency: string | null;
}

type AddProductForm = FormGroup<{
  variantId: FormControl<string>;
  variantLabel: FormControl<string>;
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
  private readonly messageService = inject(MessageService);

  @Input() supplierId: string | null = null;
  @Input() OrganizationId: string | null = null;
  @Input() companyId: string | null = null;

  @Output() save = new EventEmitter<AddOrderProductResult>();
  @Output() cancel = new EventEmitter<void>();

  readonly numberLocale = 'en-US';

  form: AddProductForm = this.fb.group({
    variantId: this.fb.nonNullable.control('', { validators: [Validators.required] }),
    variantLabel: this.fb.nonNullable.control('', { validators: [Validators.required] }),
    qty: this.fb.control<number | null>(1, { validators: [Validators.required, Validators.min(0.01)] }),
    unitCost: this.fb.control<number | null>(null, { validators: [Validators.required, Validators.min(0)] }),
  });

  lastCost: SupplierLastCostResult | null = null;
  selectedVariant: VariantOption | null = null;

  onVariantSelected(option: VariantOption): void {
    this.form.controls.variantId.setValue(option.id);
    this.form.controls.variantLabel.setValue(option.label);
    this.selectedVariant = option;
    this.loadLastCost(option.id);
  }

  onVariantValueChange(value: string | null): void {
    if (value === null) {
      this.form.controls.variantId.setValue('');
      this.form.controls.variantLabel.setValue('');
      this.lastCost = null;
      this.selectedVariant = null;
    }
  }

  private loadLastCost(variantId: string): void {
    const supplierId = this.supplierId ?? undefined;
    const OrganizationId = this.OrganizationId ?? undefined;
    const companyId = this.companyId ?? undefined;

    if (!supplierId || !OrganizationId || !companyId) {
      this.lastCost = null;
      return;
    }

    this.purchasesService
      .getSupplierVariantLastCost({ OrganizationId, companyId, supplierId, variantId })
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

    const variantId = this.form.controls.variantId.value;
    const variantLabel = this.form.controls.variantLabel.value;
    const qty = this.form.controls.qty.value ?? 0;
    const unitCost = this.form.controls.unitCost.value ?? 0;

    if (!variantId) {
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
      productId: this.selectedVariant?.productId ?? '',
      variantId,
      variantLabel,
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

}
