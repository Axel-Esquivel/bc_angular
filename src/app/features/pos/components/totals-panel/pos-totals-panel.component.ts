import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
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
export class PosTotalsPanelComponent implements OnChanges {
  @Input() subtotal = 0;
  @Input() discountTotal = 0;
  @Input() total = 0;
  @Input() itemsCount = 0;
  @Input() allowedMethods: PosPaymentMethod[] | null = null;
  @Input() canCheckout = true;

  @Output() checkout = new EventEmitter<PosPayment>();

  readonly paymentForm;
  paymentOptions: PaymentOption[] = [];

  insufficientAmount = false;

  private readonly allPaymentMethods: PaymentOption[] = [
    { label: 'Efectivo', value: 'CASH' },
    { label: 'Tarjeta', value: 'CARD' },
    { label: 'Transferencia', value: 'TRANSFER' },
    { label: 'Vale', value: 'VOUCHER' },
  ];

  constructor(private readonly fb: FormBuilder) {
    this.paymentForm = this.fb.nonNullable.group({
      method: ['CASH' as PosPaymentMethod, Validators.required],
      amount: [0, [Validators.required, Validators.min(0)]],
    });

    this.paymentOptions = this.buildPaymentOptions();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['allowedMethods']) {
      this.paymentOptions = this.buildPaymentOptions();
      this.ensureSelectedMethod();
    }
  }

  get changeDue(): number {
    const amount = this.paymentForm.get('amount')?.value ?? 0;
    return amount > this.total ? amount - this.total : 0;
  }

  onCheckout(): void {
    this.insufficientAmount = false;
    if (this.paymentForm.invalid || !this.canCheckout) {
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

  private buildPaymentOptions(): PaymentOption[] {
    if (!this.allowedMethods || this.allowedMethods.length === 0) {
      return [...this.allPaymentMethods];
    }
    const allowed = new Set(this.allowedMethods);
    const filtered = this.allPaymentMethods.filter((option) => allowed.has(option.value));
    return filtered.length > 0 ? filtered : [...this.allPaymentMethods];
  }

  private ensureSelectedMethod(): void {
    const current = this.paymentForm.get('method')?.value ?? null;
    const exists = this.paymentOptions.some((option) => option.value === current);
    if (!exists) {
      const next = this.paymentOptions[0]?.value ?? 'CASH';
      this.paymentForm.patchValue({ method: next });
    }
  }
}
