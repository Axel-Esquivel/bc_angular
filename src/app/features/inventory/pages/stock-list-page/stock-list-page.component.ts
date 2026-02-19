import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { MessageService } from 'primeng/api';
import { Card } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { InventoryApiService } from '../../../../core/api/inventory-api.service';
import { VariantStock } from '../../../../shared/models/product.model';
import { StockFiltersComponent, StockFilterValues } from '../../components/stock-filters/stock-filters.component';
import { ActiveContextStateService } from '../../../../core/context/active-context-state.service';
import { RealtimeService } from '../../../../core/realtime/realtime.service';
import { ActiveContext } from '../../../../shared/models/active-context.model';

interface InventoryRow {
  variantId: string;
  productName: string;
  sku: string;
  quantity: number;
}

@Component({
  selector: 'app-stock-list-page',
  standalone: true,
  imports: [CommonModule, Card, TableModule, StockFiltersComponent],
  templateUrl: './stock-list-page.component.html',
  styleUrl: './stock-list-page.component.scss',
})
export class StockListPageComponent implements OnInit {
  private readonly inventoryApi = inject(InventoryApiService);
  private readonly activeContextState = inject(ActiveContextStateService);
  private readonly realtimeService = inject(RealtimeService);
  private readonly messageService = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);

  stock: InventoryRow[] = [];
  loading = false;
  private context: ActiveContext | null = null;
  private readonly stockIndex = new Map<string, InventoryRow>();

  ngOnInit(): void {
    const context = this.activeContextState.getActiveContext();
    if (!this.activeContextState.isComplete(context)) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Contexto incompleto',
        detail: 'Selecciona organizaci?n, empresa y sucursal antes de ver inventario.',
      });
      return;
    }
    this.context = context;
    this.realtimeService.joinContext(context.organizationId!, context.enterpriseId!);
    this.loadStock();

    this.realtimeService.inventoryStockChanged$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((payload) => {
        const existing = this.stockIndex.get(payload.variantId);
        if (existing) {
          existing.quantity = payload.available;
          this.stock = [...this.stockIndex.values()];
        } else {
          const row: InventoryRow = {
            variantId: payload.variantId,
            productName: payload.variantId,
            sku: payload.variantId,
            quantity: payload.available,
          };
          this.stockIndex.set(payload.variantId, row);
          this.stock = [...this.stockIndex.values()];
        }
      });
  }

  onApplyFilters(filters: StockFilterValues): void {
    this.loadStock(filters);
  }

  private loadStock(filters?: StockFilterValues): void {
    if (!this.context?.enterpriseId) {
      return;
    }
    this.loading = true;
    this.inventoryApi
      .getStockByWarehouse({
        enterpriseId: this.context.enterpriseId,
        search: filters?.search?.trim() || undefined,
        warehouseId: filters?.warehouseId || undefined,
        category: filters?.category || undefined,
      })
      .subscribe({
        next: (response) => {
          const items = response.result.items ?? [];
          this.stock = items.map((item) => this.mapStock(item));
          this.stockIndex.clear();
          this.stock.forEach((row) => this.stockIndex.set(row.variantId, row));
          this.loading = false;
        },
        error: () => {
          this.stock = [];
          this.stockIndex.clear();
          this.loading = false;
        },
      });
  }

  private mapStock(item: VariantStock): InventoryRow {
    const name = item.variantName ?? item.variantId;
    const sku = item.sku ?? item.variantId;
    const quantity = item.quantity ?? item.available ?? item.onHand ?? 0;
    return {
      variantId: item.variantId,
      productName: name,
      sku,
      quantity,
    };
  }
}
