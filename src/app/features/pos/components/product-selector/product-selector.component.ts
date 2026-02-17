import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { PosProduct } from '../../models/pos-product.model';

@Component({
  standalone: false,
  selector: 'bc-pos-product-selector',
  templateUrl: './product-selector.component.html',
  styleUrl: './product-selector.component.scss',
})
export class ProductSelectorComponent {
  @Input() products: PosProduct[] = [];
  @Input() loading = false;

  @Output() search = new EventEmitter<string>();
  @Output() addProduct = new EventEmitter<PosProduct>();

  readonly searchForm: FormGroup;

  constructor(private readonly fb: FormBuilder) {
    this.searchForm = this.fb.nonNullable.group({
      term: [''],
    });
  }

  onSubmit(): void {
    const { term } = this.searchForm.getRawValue();
    this.search.emit(term.trim());
  }

  onAdd(product: PosProduct): void {
    this.addProduct.emit(product);
  }
}
