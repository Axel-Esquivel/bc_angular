import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { AutoComplete } from 'primeng/autocomplete';
import { Select } from 'primeng/select';
import { TableModule } from 'primeng/table';

import { ProductsApiService } from '../../../../core/api/products-api.service';
import { ActiveContextStateService } from '../../../../core/context/active-context-state.service';
import { ActiveEnterpriseLabelService } from '../../../../core/context/active-enterprise-label.service';
import { ActiveContext } from '../../../../shared/models/active-context.model';
import { Product } from '../../../../shared/models/product.model';
import { distinctUntilChanged, map } from 'rxjs';
import {
  InventoryStockService,
  StockItem,
} from '../../services/inventory-stock.service';
import {
  WarehousesService,
  Warehouse,
  LocationNode,
} from '../../../warehouses/services/warehouses.service';

interface SelectOption {
  label: string;
  value: string;
}

interface StockRow {
  productId: string;
  onHand: number;
  reserved: number;
  available: number;
  warehouse: string;
  location: string;
}

@Component({
  selector: 'app-stock-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, Card, TableModule, Select, AutoComplete, Button],
  templateUrl: './stock-page.component.html',
  styleUrl: './stock-page.component.scss',
  providers: [MessageService],
})
export class StockPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly stockService = inject(InventoryStockService);
  private readonly warehousesService = inject(WarehousesService);
  private readonly productsApi = inject(ProductsApiService);
  private readonly activeContextState = inject(ActiveContextStateService);
  private readonly enterpriseLabelService = inject(ActiveEnterpriseLabelService);
  private readonly messageService = inject(MessageService);

  readonly filtersForm = this.fb.group({
    warehouseId: this.fb.nonNullable.control(''),
    locationId: this.fb.nonNullable.control(''),
    productSearch: this.fb.control<Product | string | null>(null),
    productId: this.fb.nonNullable.control(''),
  });

  context: ActiveContext | null = null;
  readonly enterpriseId$ = this.activeContextState.activeContext$.pipe(
    map((context) => context.enterpriseId ?? null),
    distinctUntilChanged(),
  );
  readonly enterpriseName$ = this.enterpriseLabelService.enterpriseName$;
  warehouses: Warehouse[] = [];
  warehouseOptions: SelectOption[] = [{ label: 'Todas', value: '' }];
  locationOptions: SelectOption[] = [{ label: 'Todas', value: '' }];
  productSuggestions: Product[] = [];

  loading = false;
  rows: StockRow[] = [];

  private warehouseIndex = new Map<string, string>();
  private locationIndex = new Map<string, string>();

  ngOnInit(): void {
    const context = this.activeContextState.getActiveContext();
    if (!this.activeContextState.isComplete(context)) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Contexto incompleto',
        detail: 'Selecciona organizacion y empresa antes de consultar stock.',
      });
      return;
    }
    this.context = context;
    this.loadWarehouses();
    this.loadStock();
  }

  onWarehouseChange(): void {
    const warehouseId = this.filtersForm.controls.warehouseId.value;
    if (!warehouseId) {
      this.locationOptions = [{ label: 'Todas', value: '' }];
      this.locationIndex.clear();
      this.filtersForm.controls.locationId.setValue('');
      return;
    }
    this.loadLocations(warehouseId);
  }

  onApplyFilters(): void {
    this.loadStock();
  }

  onReset(): void {
    this.filtersForm.reset({ warehouseId: '', locationId: '', productSearch: null, productId: '' });
    this.locationOptions = [{ label: 'Todas', value: '' }];
    this.locationIndex.clear();
    this.productSuggestions = [];
    this.loadStock();
  }

  searchProducts(event: { query: string }): void {
    const query = event.query?.trim() ?? '';
    if (!query || !this.context?.enterpriseId) {
      this.productSuggestions = [];
      return;
    }

    this.productsApi
      .getProducts({ enterpriseId: this.context.enterpriseId, search: query, limit: 10 })
      .subscribe({
        next: (response) => {
          this.productSuggestions = response?.result?.items ?? [];
        },
        error: () => {
          this.productSuggestions = [];
        },
      });
  }

  onProductSelect(event: { value: Product }): void {
    const product = event.value;
    this.filtersForm.controls.productSearch.setValue(this.formatProductLabel(product));
    this.filtersForm.controls.productId.setValue(product.id);
  }

  onProductClear(): void {
    this.filtersForm.controls.productSearch.setValue(null);
    this.filtersForm.controls.productId.setValue('');
  }

  private loadWarehouses(): void {
    if (!this.context?.organizationId || !this.context.enterpriseId) {
      return;
    }

    this.warehousesService.getAll(this.context.organizationId, this.context.enterpriseId).subscribe({
      next: ({ result }) => {
        const list = result ?? [];
        this.warehouses = list;
        this.warehouseIndex.clear();
        this.warehouseOptions = [{ label: 'Todas', value: '' }];
        list.forEach((warehouse) => {
          this.warehouseIndex.set(warehouse.id, warehouse.name);
          this.warehouseOptions.push({ label: warehouse.name, value: warehouse.id });
        });
      },
      error: () => {
        this.warehouses = [];
        this.warehouseOptions = [{ label: 'Todas', value: '' }];
      },
    });
  }

  private loadLocations(warehouseId: string): void {
    this.warehousesService.getLocationsTree(warehouseId).subscribe({
      next: ({ result }) => {
        const nodes = result ?? [];
        this.locationIndex.clear();
        const options: SelectOption[] = [{ label: 'Todas', value: '' }];
        this.flattenLocations(nodes, options, '');
        this.locationOptions = options;
      },
      error: () => {
        this.locationOptions = [{ label: 'Todas', value: '' }];
        this.locationIndex.clear();
      },
    });
  }

  private flattenLocations(nodes: LocationNode[], options: SelectOption[], prefix: string): void {
    nodes.forEach((node) => {
      const label = prefix ? `${prefix} / ${node.name}` : node.name;
      options.push({ label, value: node.id });
      this.locationIndex.set(node.id, node.name);
      if (node.children.length > 0) {
        this.flattenLocations(node.children, options, label);
      }
    });
  }

  private loadStock(): void {
    const context = this.context;
    if (!context?.organizationId || !context.enterpriseId) {
      return;
    }

    const { warehouseId, locationId, productId } = this.filtersForm.getRawValue();

    this.loading = true;
    this.stockService
      .getStock({
        organizationId: context.organizationId,
        enterpriseId: context.enterpriseId,
        warehouseId: warehouseId || undefined,
        locationId: locationId || undefined,
        productId: productId?.trim() || undefined,
      })
      .subscribe({
        next: ({ result }) => {
          const items = Array.isArray(result) ? result : result?.items ?? [];
          this.rows = items.map((item) => this.mapRow(item));
          this.loading = false;
        },
        error: () => {
          this.rows = [];
          this.loading = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Stock',
            detail: 'No se pudo cargar el stock.',
          });
        },
      });
  }

  private formatProductLabel(product: Product): string {
    const sku = product.sku ? ` (${product.sku})` : '';
    return `${product.name}${sku}`;
  }

  private mapRow(item: StockItem): StockRow {
    const warehouseLabel = this.warehouseIndex.get(item.warehouseId) ?? item.warehouseId;
    const locationLabel = this.locationIndex.get(item.locationId) ?? item.locationId;
    const reserved = item.reserved ?? 0;
    const onHand = item.onHand ?? 0;
    return {
      productId: item.productId,
      onHand,
      reserved,
      available: onHand - reserved,
      warehouse: warehouseLabel,
      location: locationLabel,
    };
  }
}
