import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';

import { PosPayment } from '../../../../shared/models/pos.model';

@Component({
  selector: 'bc-pos-totals',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ButtonModule, InputNumberModule, SelectModule],
  templateUrl: './totals-panel.component.html',
  styleUrl: './totals-panel.component.scss',
})
export class TotalsPanelComponent {
  @Input() total = 0;
  @Input() itemsCount = 0;

  @Output() checkout = new EventEmitter<PosPayment>();

  readonly paymentMethods = [
    { label: 'Efectivo', value: 'cash' },
    { label: 'Tarjeta', value: 'card' },
    { label: 'Transferencia', value: 'transfer' },
  ];

  readonly paymentForm: FormGroup;

  constructor(private readonly fb: FormBuilder) {
    this.paymentForm = this.fb.nonNullable.group({
      method: ['cash', Validators.required],
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

    this.checkout.emit({ method, amount });
  }
}
