import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { AutoComplete } from 'primeng/autocomplete';
import { DatePicker } from 'primeng/datepicker';
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
  StockMovement,
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

interface MovementRow {
  date: string;
  type: string;
  productId: string;
  qty: number;
  from: string;
  to: string;
  reference: string;
}

@Component({
  selector: 'app-movements-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, Card, TableModule, Select, AutoComplete, DatePicker, Button],
  templateUrl: './movements-page.component.html',
  styleUrl: './movements-page.component.scss',
  providers: [MessageService],
})
export class MovementsPageComponent implements OnInit {
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
    startDate: this.fb.nonNullable.control(new Date()),
    endDate: this.fb.nonNullable.control(new Date()),
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
  rows: MovementRow[] = [];

  private warehouseIndex = new Map<string, string>();
  private locationIndex = new Map<string, string>();

  ngOnInit(): void {
    const context = this.activeContextState.getActiveContext();
    if (!this.activeContextState.isComplete(context)) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Contexto incompleto',
        detail: 'Selecciona organizacion y empresa antes de consultar movimientos.',
      });
      return;
    }
    this.context = context;
    this.loadWarehouses();
    this.loadMovements();
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
    this.loadMovements();
  }

  onReset(): void {
    this.filtersForm.reset({
      warehouseId: '',
      locationId: '',
      productSearch: null,
      productId: '',
      startDate: new Date(),
      endDate: new Date(),
    });
    this.locationOptions = [{ label: 'Todas', value: '' }];
    this.locationIndex.clear();
    this.productSuggestions = [];
    this.loadMovements();
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

  private loadMovements(): void {
    const context = this.context;
    if (!context?.organizationId || !context.enterpriseId) {
      return;
    }

    const { warehouseId, locationId, productId, startDate, endDate } = this.filtersForm.getRawValue();

    this.loading = true;
    this.stockService
      .getMovements({
        organizationId: context.organizationId,
        enterpriseId: context.enterpriseId,
        warehouseId: warehouseId || undefined,
        locationId: locationId || undefined,
        productId: productId?.trim() || undefined,
        startDate: startDate ? startDate.toISOString().slice(0, 10) : undefined,
        endDate: endDate ? endDate.toISOString().slice(0, 10) : undefined,
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
            summary: 'Movimientos',
            detail: 'No se pudieron cargar los movimientos.',
          });
        },
      });
  }

  private formatProductLabel(product: Product): string {
    const sku = product.sku ? ` (${product.sku})` : '';
    return `${product.name}${sku}`;
  }

  private mapRow(item: StockMovement): MovementRow {
    const warehouseFrom = item.fromLocationId ? this.locationIndex.get(item.fromLocationId) : null;
    const warehouseTo = item.toLocationId ? this.locationIndex.get(item.toLocationId) : null;
    const fromLabel = warehouseFrom ?? item.fromLocationId ?? '-';
    const toLabel = warehouseTo ?? item.toLocationId ?? '-';
    const reference = `${item.reference.module}:${item.reference.entity} ${item.reference.entityId}`;

    return {
      date: item.createdAt,
      type: item.type,
      productId: item.productId,
      qty: item.qty,
      from: fromLabel,
      to: toLabel,
      reference,
    };
  }
}
