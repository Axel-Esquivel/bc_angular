import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Button } from 'primeng/button';
import { InputNumber } from 'primeng/inputnumber';
import { TableModule } from 'primeng/table';

import { PosCartLine } from '../../../../shared/models/pos.model';

@Component({
  selector: 'bc-pos-cart-lines',
  standalone: true,
  imports: [CommonModule, FormsModule, Button, InputNumber, TableModule],
  templateUrl: './cart-lines-panel.component.html',
  styleUrl: './cart-lines-panel.component.scss',
})
export class CartLinesPanelComponent {
  @Input() lines: PosCartLine[] = [];

  @Output() quantityChange = new EventEmitter<{ lineId: string; quantity: number }>();
  @Output() remove = new EventEmitter<string>();

  onQuantityChange(line: PosCartLine, value: number | null): void {
    const quantity = value && value > 0 ? value : 1;
    this.quantityChange.emit({ lineId: line.productId, quantity });
  }

  onRemove(line: PosCartLine): void {
    this.remove.emit(line.productId);
  }
}
