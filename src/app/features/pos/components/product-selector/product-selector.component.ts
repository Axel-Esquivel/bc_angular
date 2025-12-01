import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';

import { Product } from '../../../../shared/models/product.model';

@Component({
  selector: 'bc-pos-product-selector',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ButtonModule, InputTextModule, TableModule],
  templateUrl: './product-selector.component.html',
  styleUrl: './product-selector.component.scss',
})
export class ProductSelectorComponent {
  @Input() products: Product[] = [];
  @Input() loading = false;

  @Output() search = new EventEmitter<string>();
  @Output() addProduct = new EventEmitter<Product>();

  private readonly fb = inject(FormBuilder);

  readonly searchForm = this.fb.nonNullable.group({
    term: [''],
  });

  onSubmit(): void {
    const { term } = this.searchForm.getRawValue();
    this.search.emit(term.trim());
  }

  onAdd(product: Product): void {
    this.addProduct.emit(product);
  }
}
