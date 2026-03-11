import { Component, EventEmitter, Input, Output } from '@angular/core';
import { PosCartLine } from '../../models/pos.model';

@Component({
  standalone: false,
  selector: 'bc-pos-cart-lines',
  templateUrl: './pos-cart-lines.component.html',
  styleUrl: './pos-cart-lines.component.scss',
})
export class PosCartLinesComponent {
  @Input() lines: PosCartLine[] = [];

  @Output() quantityChange = new EventEmitter<{ variantId: string; quantity: number }>();
  @Output() remove = new EventEmitter<string>();

  onQtyChange(line: PosCartLine, value: number | null): void {
    const next = value && value > 0 ? value : 1;
    this.quantityChange.emit({ variantId: line.variantId, quantity: next });
  }

  onRemove(line: PosCartLine): void {
    this.remove.emit(line.variantId);
  }
}
