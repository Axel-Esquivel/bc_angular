import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { PosPayment, PosPaymentMethod } from '../../models/pos.model';

interface PaymentOption {
  label: string;
  value: PosPaymentMethod;
}

@Component({
  standalone: false,
  selector: 'bc-pos-totals',
  templateUrl: './pos-totals-panel.component.html',
  styleUrl: './pos-totals-panel.component.scss',
})
export class PosTotalsPanelComponent {
  @Input() subtotal = 0;
  @Input() discountTotal = 0;
  @Input() total = 0;
  @Input() itemsCount = 0;

  @Output() checkout = new EventEmitter<PosPayment>();

  readonly paymentMethods: PaymentOption[] = [
    { label: 'Efectivo', value: 'CASH' },
  ];

  readonly paymentForm;

  insufficientAmount = false;

  constructor(private readonly fb: FormBuilder) {
    this.paymentForm = this.fb.nonNullable.group({
      method: ['CASH' as PosPaymentMethod, Validators.required],
      amount: [0, [Validators.required, Validators.min(0)]],
    });
  }

  get changeDue(): number {
    const amount = this.paymentForm.get('amount')?.value ?? 0;
    return amount > this.total ? amount - this.total : 0;
  }

  onCheckout(): void {
    this.insufficientAmount = false;
    if (this.paymentForm.invalid) {
      this.paymentForm.markAllAsTouched();
      return;
    }

    const { method, amount } = this.paymentForm.getRawValue();
    if (amount < this.total) {
      this.insufficientAmount = true;
      return;
    }

    const received = amount;
    const change = this.changeDue;
    this.checkout.emit({ method, amount: this.total, received, change });
  }
}
