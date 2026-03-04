import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormArray, FormGroup } from '@angular/forms';

interface SelectOption {
  label: string;
  value: string;
}

export interface ReceiptLineView {
  variantId: string;
  label: string;
  orderedQty: number;
}

export type ReceiptLineForm = FormGroup<{
  variantId: import('@angular/forms').FormControl<string>;
  productId: import('@angular/forms').FormControl<string | null>;
  orderedQty: import('@angular/forms').FormControl<number>;
  quantityReceived: import('@angular/forms').FormControl<number>;
  unitCost: import('@angular/forms').FormControl<number>;
  discountType: import('@angular/forms').FormControl<'percent' | 'amount' | undefined>;
  discountValue: import('@angular/forms').FormControl<number | null>;
  bonusQty: import('@angular/forms').FormControl<number>;
}>;

export type BonusLineForm = FormGroup<{
  variantId: import('@angular/forms').FormControl<string>;
  quantity: import('@angular/forms').FormControl<number>;
  bonusSourceLineId: import('@angular/forms').FormControl<string | null>;
}>;

@Component({
  selector: 'app-purchase-receipt-form',
  standalone: false,
  templateUrl: './purchase-receipt-form.component.html',
  styleUrl: './purchase-receipt-form.component.scss',
})
export class PurchaseReceiptFormComponent {
  @Input() orderOptions: SelectOption[] = [];
  @Input() warehouseOptions: SelectOption[] = [];
  @Input() selectedOrderId: string | null = null;
  @Input() selectedWarehouseId: string | null = null;
  @Input() lineItems: ReceiptLineView[] = [];
  @Input() receiptForm!: FormGroup<{
    lines: FormArray<ReceiptLineForm>;
    bonuses: FormArray<BonusLineForm>;
  }>;
  @Input() subtotal = 0;
  @Input() discounts = 0;
  @Input() netTotal = 0;
  @Input() bonusTotal = 0;
  @Input() loadingOrders = false;
  @Input() loadingWarehouses = false;
  @Input() validating = false;
  @Input() saving = false;

  @Output() orderChange = new EventEmitter<string | null>();
  @Output() warehouseChange = new EventEmitter<string | null>();
  @Output() addBonus = new EventEmitter<void>();
  @Output() removeBonus = new EventEmitter<number>();
  @Output() validate = new EventEmitter<void>();
  @Output() save = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  onOrderChange(value: string | null): void {
    this.orderChange.emit(value);
  }

  onWarehouseChange(value: string | null): void {
    this.warehouseChange.emit(value);
  }
}
