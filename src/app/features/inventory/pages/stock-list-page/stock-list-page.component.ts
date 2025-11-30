import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';

import { InventoryApiService } from '../../../../core/api/inventory-api.service';
import { VariantStock } from '../../../../shared/models/product.model';

@Component({
  selector: 'app-stock-list-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TableModule, DropdownModule, InputTextModule, ButtonModule],
  templateUrl: './stock-list-page.component.html',
  styleUrl: './stock-list-page.component.scss',
})
export class StockListPageComponent implements OnInit {
  private readonly inventoryApi = inject(InventoryApiService);
  private readonly fb = inject(FormBuilder);

  stocks: VariantStock[] = [];
  loading = false;

  warehouses = [
    { label: 'Todas', value: '' },
    { label: 'Central', value: 'central' },
    { label: 'Secundaria', value: 'secondary' },
  ];

  readonly filtersForm = this.fb.nonNullable.group({
    warehouseId: [''],
    search: [''],
  });

  ngOnInit(): void {
    this.loadStock();
  }

  loadStock(): void {
    this.loading = true;
    const filters = this.filtersForm.getRawValue();
    this.inventoryApi
      .getStockByWarehouse({
        warehouseId: filters.warehouseId || undefined,
        search: filters.search || undefined,
      })
      .subscribe({
        next: (response) => {
          this.stocks = response.result.items ?? [];
          this.loading = false;
        },
        error: () => {
          this.loading = false;
        },
      });
  }

  resetFilters(): void {
    this.filtersForm.reset({ warehouseId: '', search: '' });
    this.loadStock();
  }
}
