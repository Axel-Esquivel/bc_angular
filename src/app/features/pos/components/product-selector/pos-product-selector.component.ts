import { Component, EventEmitter, Input, Output } from '@angular/core';
import { PosProduct } from '../../models/pos-product.model';

@Component({
  standalone: false,
  selector: 'bc-pos-product-selector',
  templateUrl: './pos-product-selector.component.html',
  styleUrl: './pos-product-selector.component.scss',
})
export class PosProductSelectorComponent {
  @Input() products: PosProduct[] = [];
  @Input() loading = false;

  @Output() search = new EventEmitter<string>();
  @Output() add = new EventEmitter<PosProduct>();

  query = '';

  onSearch(): void {
    this.search.emit(this.query.trim());
  }

  onAdd(product: PosProduct): void {
    this.add.emit(product);
  }
}
