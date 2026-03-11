import { Component, EventEmitter, Input, Output } from '@angular/core';

export interface PosWarehouseOption {
  id: string;
  name: string;
}

@Component({
  standalone: false,
  selector: 'bc-pos-session-controls',
  templateUrl: './pos-session-controls.component.html',
  styleUrl: './pos-session-controls.component.scss',
})
export class PosSessionControlsComponent {
  @Input() warehouses: PosWarehouseOption[] = [];
  @Input() selectedWarehouseId: string | null = null;
  @Input() sessionId: string | null = null;
  @Input() status: 'OPEN' | 'CLOSED' | null = null;
  @Input() openedAt: string | null = null;
  @Input() loading = false;
  @Input() openingAmount = 0;

  @Output() warehouseChange = new EventEmitter<string>();
  @Output() openingAmountChange = new EventEmitter<number>();
  @Output() openSession = new EventEmitter<void>();
  @Output() closeSession = new EventEmitter<void>();

  onWarehouseChange(value: string | null): void {
    if (value) {
      this.warehouseChange.emit(value);
    }
  }

  onOpeningAmountChange(value: number | null): void {
    this.openingAmountChange.emit(value ?? 0);
  }
}
