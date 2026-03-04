import { Component, Input } from '@angular/core';
import { FormArray, FormGroup } from '@angular/forms';

export interface ReceiptLineView {
  variantId: string;
  label: string;
  orderedQty: number;
}

type ReceiptLineForm = FormGroup<{
  variantId: import('@angular/forms').FormControl<string>;
  productId: import('@angular/forms').FormControl<string | null>;
  orderedQty: import('@angular/forms').FormControl<number>;
  quantityReceived: import('@angular/forms').FormControl<number>;
  unitCost: import('@angular/forms').FormControl<number>;
  discountType: import('@angular/forms').FormControl<'percent' | 'amount' | undefined>;
  discountValue: import('@angular/forms').FormControl<number | null>;
  bonusQty: import('@angular/forms').FormControl<number>;
}>;

@Component({
  selector: 'app-purchase-receipt-lines',
  standalone: false,
  templateUrl: './purchase-receipt-lines.component.html',
  styleUrl: './purchase-receipt-lines.component.scss',
})
export class PurchaseReceiptLinesComponent {
  @Input() lineItems: ReceiptLineView[] = [];
  @Input() lines: FormArray<ReceiptLineForm> = new FormArray<ReceiptLineForm>([]);
  readonly numberLocale = 'en-US';

  getLineLabel(index: number): string {
    return this.lineItems[index]?.label ?? this.lineItems[index]?.variantId ?? '';
  }

  getOrderedQty(index: number): number {
    return this.lineItems[index]?.orderedQty ?? 0;
  }

  get linesForm(): FormArray<ReceiptLineForm> {
    return this.lines;
  }
}
