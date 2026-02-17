import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { PosPayment } from '../../../../shared/models/pos.model';

@Component({
  standalone: false,
  selector: 'bc-pos-totals',
  templateUrl: './totals-panel.component.html',
  styleUrl: './totals-panel.component.scss',
})
export class TotalsPanelComponent {
  @Input() total = 0;
  @Input() itemsCount = 0;

  @Output() checkout = new EventEmitter<PosPayment>();

  readonly paymentMethods = [{ label: 'Efectivo', value: 'CASH' as const }];

  readonly paymentForm: FormGroup;

  constructor(private readonly fb: FormBuilder) {
    this.paymentForm = this.fb.nonNullable.group({
      method: ['CASH', Validators.required],
      amount: [0, [Validators.required, Validators.min(0)]],
    });
  }

  insufficientAmount = false;

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
