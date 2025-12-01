import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { InputNumber } from 'primeng/inputnumber';
import { InputSwitch } from 'primeng/inputswitch';
import { InputText } from 'primeng/inputtext';
import { InputTextarea } from 'primeng/inputtextarea';
import { Select } from 'primeng/select';

import { Product } from '../../../../shared/models/product.model';

@Component({
  selector: 'bc-product-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    Card,
    InputText,
    InputTextarea,
    InputNumber,
    InputSwitch,
    Select,
    Button,
  ],
  templateUrl: './product-form.component.html',
  styleUrl: './product-form.component.scss',
})
export class ProductFormComponent implements OnChanges {
  @Input() product: Product | null = null;
  @Input() saving = false;

  @Output() submitForm = new EventEmitter<Partial<Product>>();
  @Output() cancel = new EventEmitter<void>();

  readonly categoryOptions = [
    { label: 'General', value: 'general' },
    { label: 'Servicios', value: 'services' },
    { label: 'Electrónica', value: 'electronics' },
  ];

  readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    sku: [''],
    category: [''],
    price: [0, [Validators.required, Validators.min(0)]],
    description: [''],
    isActive: [true],
  });

  constructor(private readonly fb: FormBuilder) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['product']) {
      this.patchForm(this.product);
    }
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitForm.emit(this.form.getRawValue());
  }

  onCancel(): void {
    this.cancel.emit();
  }

  private patchForm(product: Product | null): void {
    if (!product) {
      this.form.reset({
        name: '',
        sku: '',
        category: '',
        price: 0,
        description: '',
        isActive: true,
      });
      return;
    }

    this.form.reset({
      name: product.name ?? '',
      sku: product.sku ?? '',
      category: product.category ?? '',
      price: product.price ?? 0,
      description: product.description ?? '',
      isActive: product.isActive ?? true,
    });
  }
}
