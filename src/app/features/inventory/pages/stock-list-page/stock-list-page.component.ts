import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';

import { InventoryApiService } from '../../../../core/api/inventory-api.service';
import { VariantStock } from '../../../../shared/models/product.model';
import { StockFiltersComponent, StockFilterValues } from '../../components/stock-filters/stock-filters.component';

@Component({
  selector: 'app-stock-list-page',
  standalone: true,
  imports: [CommonModule, CardModule, TableModule, StockFiltersComponent],
  templateUrl: './stock-list-page.component.html',
  styleUrl: './stock-list-page.component.scss',
})
export class StockListPageComponent implements OnInit {
  private readonly inventoryApi = inject(InventoryApiService);

  stock: VariantStock[] = [];
  loading = false;

  ngOnInit(): void {
    this.loadStock();
  }

  onApplyFilters(filters: StockFilterValues): void {
    this.loadStock(filters);
  }

  private loadStock(filters?: StockFilterValues): void {
    this.loading = true;
    this.inventoryApi
      .getStockByWarehouse({
        search: filters?.search?.trim() || undefined,
        warehouseId: filters?.warehouseId || undefined,
        category: filters?.category || undefined,
      })
      .subscribe({
        next: (response) => {
          this.stock = response.result.items ?? [];
          this.loading = false;
        },
        error: () => {
          this.stock = [];
          this.loading = false;
        },
      });
  }
}
