import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { ToolbarModule } from 'primeng/toolbar';

import { ReportsApiService } from '../../../../core/api/reports-api.service';
import { DailySalesReport, InventoryReportItem } from '../../../../shared/models/report.model';

interface ReportColumn {
  field: string;
  header: string;
}

type ReportType = 'salesDaily' | 'inventorySnapshot';

type ReportRow = DailySalesReport | InventoryReportItem | Record<string, unknown>;

@Component({
  selector: 'app-reports-dashboard-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ToolbarModule, SelectModule, InputTextModule, TableModule, DatePickerModule, ButtonModule],
  templateUrl: './reports-dashboard-page.component.html',
  styleUrl: './reports-dashboard-page.component.scss',
})
export class ReportsDashboardPageComponent implements OnInit {
  private readonly reportsApi = inject(ReportsApiService);
  private readonly fb = inject(FormBuilder);

  @ViewChild('dataTable') dataTable?: import('primeng/table').Table;

  readonly reportOptions = [
    { label: 'Ventas por día', value: 'salesDaily' satisfies ReportType },
    { label: 'Inventario', value: 'inventorySnapshot' satisfies ReportType },
  ];

  readonly filtersForm = this.fb.nonNullable.group({
    reportType: this.reportOptions[0].value,
    startDate: new Date(),
    endDate: new Date(),
    warehouseId: '',
    search: '',
  });

  columns: ReportColumn[] = [];
  rows: ReportRow[] = [];
  loading = false;

  get globalFilterFields(): string[] {
    return this.columns.map((column) => column.field);
  }

  ngOnInit(): void {
    this.updateColumns();
    this.loadReport();
  }

  onReportTypeChange(): void {
    this.updateColumns();
    this.loadReport();
  }

  onApplyFilters(): void {
    this.loadReport();
  }

  onClearFilters(): void {
    const reportType = this.filtersForm.controls.reportType.value;
    this.filtersForm.reset({
      reportType,
      startDate: new Date(),
      endDate: new Date(),
      warehouseId: '',
      search: '',
    });
    this.dataTable?.clear();
    this.loadReport();
  }

  onGlobalFilter(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.dataTable?.filterGlobal(value, 'contains');
  }

  private loadReport(): void {
    this.loading = true;
    const { reportType, startDate, endDate, warehouseId, search } = this.filtersForm.getRawValue();
    const params = {
      startDate: startDate?.toISOString().slice(0, 10),
      endDate: endDate?.toISOString().slice(0, 10),
      warehouseId: warehouseId || undefined,
      search: search?.trim() || undefined,
    };

    if (reportType === 'salesDaily') {
      this.reportsApi.getSalesByDay(params).subscribe({
        next: (response) => {
          this.rows = response.result;
          this.loading = false;
        },
        error: () => {
          this.rows = [];
          this.loading = false;
        },
      });
      return;
    }

    this.reportsApi.getInventorySnapshot(params).subscribe({
      next: (response) => {
        this.rows = response.result;
        this.loading = false;
      },
      error: () => {
        this.rows = [];
        this.loading = false;
      },
    });
  }

  private updateColumns(): void {
    const reportType = this.filtersForm.controls.reportType.value;
    if (reportType === 'salesDaily') {
      this.columns = [
        { field: 'date', header: 'Fecha' },
        { field: 'totalOrders', header: 'Órdenes' },
        { field: 'totalSales', header: 'Ventas' },
        { field: 'averageTicket', header: 'Ticket promedio' },
      ];
      return;
    }

    this.columns = [
      { field: 'productName', header: 'Producto' },
      { field: 'sku', header: 'SKU' },
      { field: 'warehouseName', header: 'Almacén' },
      { field: 'currentStock', header: 'Stock actual' },
      { field: 'availableStock', header: 'Disponible' },
    ];
  }
}
