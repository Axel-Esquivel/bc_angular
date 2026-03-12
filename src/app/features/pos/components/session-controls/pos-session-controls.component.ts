import { Component, EventEmitter, Input, Output } from '@angular/core';
import { PosConfig } from '../../models/pos-config.model';
import { PosSessionDenomination } from '../../models/pos.model';

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
  @Input() posConfigs: PosConfig[] = [];
  @Input() selectedPosConfigId: string | null = null;
  @Input() warehouses: PosWarehouseOption[] = [];
  @Input() selectedWarehouseId: string | null = null;
  @Input() sessionId: string | null = null;
  @Input() status: 'OPEN' | 'CLOSED' | null = null;
  @Input() openedAt: string | null = null;
  @Input() loading = false;
  @Input() openingAmount = 0;
  @Input() denominations: PosSessionDenomination[] = [];
  @Input() canOpenSession = true;
  @Input() canCloseSession = true;

  @Output() posConfigChange = new EventEmitter<string>();
  @Output() openingAmountChange = new EventEmitter<number>();
  @Output() denominationsChange = new EventEmitter<PosSessionDenomination[]>();
  @Output() openSession = new EventEmitter<void>();
  @Output() closeSession = new EventEmitter<void>();

  onPosConfigChange(value: string | null): void {
    if (value) {
      this.posConfigChange.emit(value);
    }
  }

  onOpeningAmountChange(value: number | null): void {
    this.openingAmountChange.emit(value ?? 0);
  }

  onDenominationQuantityChange(denomination: PosSessionDenomination, quantity: number | null): void {
    const safeQuantity = Math.max(0, Math.floor(quantity ?? 0));
    const next = this.denominations.map((item) =>
      item.denominationValue === denomination.denominationValue && item.denominationType === denomination.denominationType
        ? {
            ...item,
            quantity: safeQuantity,
            subtotal: safeQuantity * item.denominationValue,
          }
        : item,
    );
    this.denominationsChange.emit(next);
    const total = next.reduce((acc, item) => acc + item.subtotal, 0);
    this.openingAmountChange.emit(total);
  }

  get selectedConfig(): PosConfig | null {
    return this.posConfigs.find((config) => config.id === this.selectedPosConfigId) ?? null;
  }

  get warehouseName(): string {
    if (!this.selectedWarehouseId) {
      return 'Sin almacén';
    }
    return this.warehouses.find((warehouse) => warehouse.id === this.selectedWarehouseId)?.name ?? 'Sin almacén';
  }

  get denominationsTotal(): number {
    return this.denominations.reduce((acc, item) => acc + item.subtotal, 0);
  }
}
