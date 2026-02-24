import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { DatePicker } from 'primeng/datepicker';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { TableModule } from 'primeng/table';

import { ActiveContextStateService } from '../../../../core/context/active-context-state.service';
import { ActiveContext } from '../../../../shared/models/active-context.model';
import { CompaniesApiService } from '../../../../core/api/companies-api.service';
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
  imports: [CommonModule, ReactiveFormsModule, Card, TableModule, Select, InputText, DatePicker, Button],
  templateUrl: './movements-page.component.html',
  styleUrl: './movements-page.component.scss',
  providers: [MessageService],
})
export class MovementsPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly stockService = inject(InventoryStockService);
  private readonly warehousesService = inject(WarehousesService);
  private readonly companiesApi = inject(CompaniesApiService);
  private readonly activeContextState = inject(ActiveContextStateService);
  private readonly messageService = inject(MessageService);

  readonly filtersForm = this.fb.nonNullable.group({
    warehouseId: '',
    locationId: '',
    productId: '',
    startDate: new Date(),
    endDate: new Date(),
  });

  context: ActiveContext | null = null;
  enterpriseName = '';
  warehouses: Warehouse[] = [];
  warehouseOptions: SelectOption[] = [{ label: 'Todas', value: '' }];
  locationOptions: SelectOption[] = [{ label: 'Todas', value: '' }];

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
    this.loadEnterpriseName();
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
      productId: '',
      startDate: new Date(),
      endDate: new Date(),
    });
    this.locationOptions = [{ label: 'Todas', value: '' }];
    this.locationIndex.clear();
    this.loadMovements();
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

  private loadEnterpriseName(): void {
    const context = this.context;
    if (!context?.enterpriseId) {
      this.enterpriseName = '';
      return;
    }
    if (!context.companyId) {
      this.enterpriseName = context.enterpriseId;
      return;
    }
    this.companiesApi.getById(context.companyId).subscribe({
      next: ({ result }) => {
        const enterprise =
          result?.enterprises?.find((item) => item.id === context.enterpriseId) ?? null;
        this.enterpriseName = enterprise?.name ?? context.enterpriseId ?? '';
      },
      error: () => {
        this.enterpriseName = context.enterpriseId ?? '';
      },
    });
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
