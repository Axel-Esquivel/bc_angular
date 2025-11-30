import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { Table } from 'primeng/table';

import { Product } from '../../../../shared/models/product.model';

@Component({
  selector: 'bc-pos-product-selector',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, Button, InputText, Table],
  templateUrl: './product-selector.component.html',
  styleUrl: './product-selector.component.scss',
})
export class ProductSelectorComponent {
  @Input() products: Product[] = [];
  @Input() loading = false;

  @Output() search = new EventEmitter<string>();
  @Output() addProduct = new EventEmitter<Product>();

  readonly searchForm = this.fb.nonNullable.group({
    term: ['', Validators.required],
  });

  constructor(private readonly fb: FormBuilder) {}

  onSubmit(): void {
    if (this.searchForm.invalid) return;
    const { term } = this.searchForm.getRawValue();
    this.search.emit(term.trim());
  }

  onAdd(product: Product): void {
    this.addProduct.emit(product);
  }
}
