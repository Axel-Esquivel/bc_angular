import { HttpClient, HttpParams } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { Observable, catchError, of } from 'rxjs';

import { APP_CONFIG_TOKEN, AppConfig } from '../config/app-config';
import { ApiResponse } from '../../shared/models/api-response.model';
import { DailySalesReport, InventoryReportItem, ReportFilterParams } from '../../shared/models/report.model';

@Injectable({ providedIn: 'root' })
export class ReportsApiService {
  private readonly baseUrl: string;

  constructor(@Inject(APP_CONFIG_TOKEN) private readonly config: AppConfig, private readonly http: HttpClient) {
    this.baseUrl = `${this.config.apiBaseUrl}/reports`;
  }

  getSalesByDay(params?: ReportFilterParams): Observable<ApiResponse<DailySalesReport[]>> {
    const httpParams = this.buildDateParams(params);
    return this.http
      .get<ApiResponse<DailySalesReport[]>>(`${this.baseUrl}/sales/daily`, { params: httpParams })
      .pipe(catchError(() => of(this.buildMockSalesResponse())));
  }

  getInventorySnapshot(params?: ReportFilterParams): Observable<ApiResponse<InventoryReportItem[]>> {
    let httpParams = this.buildDateParams(params);
    if (params?.warehouseId) httpParams = httpParams.set('warehouseId', params.warehouseId);
    if (params?.search) httpParams = httpParams.set('search', params.search);

    return this.http
      .get<ApiResponse<InventoryReportItem[]>>(`${this.baseUrl}/inventory/snapshot`, { params: httpParams })
      .pipe(catchError(() => of(this.buildMockInventoryResponse())));
  }

  getTopProducts(params?: ReportFilterParams & { limit?: number }): Observable<ApiResponse<DailySalesReport[]>> {
    let httpParams = this.buildDateParams(params);
    if (params?.limit) httpParams = httpParams.set('limit', params.limit);

    return this.http
      .get<ApiResponse<DailySalesReport[]>>(`${this.baseUrl}/sales/top-products`, { params: httpParams })
      .pipe(catchError(() => of(this.buildMockSalesResponse())));
  }

  private buildDateParams(params?: ReportFilterParams): HttpParams {
    let httpParams = new HttpParams();
    if (params?.startDate) httpParams = httpParams.set('startDate', params.startDate);
    if (params?.endDate) httpParams = httpParams.set('endDate', params.endDate);
    return httpParams;
  }

  private buildMockSalesResponse(): ApiResponse<DailySalesReport[]> {
    const today = new Date();
    const format = (d: Date) => d.toISOString().slice(0, 10);
    return {
      status: 'success',
      message:
        'Datos simulados mientras se confirman los endpoints de reportes en el backend (ver docs/04_API_BACKEND_MAPPING.md).',
      result: [
        { date: format(today), totalSales: 1250, totalOrders: 18, averageTicket: 69.44 },
        {
          date: format(new Date(today.getTime() - 24 * 60 * 60 * 1000)),
          totalSales: 980,
          totalOrders: 15,
          averageTicket: 65.33,
        },
      ],
      error: null,
    };
  }

  private buildMockInventoryResponse(): ApiResponse<InventoryReportItem[]> {
    return {
      status: 'success',
      message:
        'Datos simulados mientras se confirman los endpoints de reportes en el backend (ver docs/04_API_BACKEND_MAPPING.md).',
      result: [
        {
          productId: 'demo-1',
          productName: 'Producto demo',
          sku: 'DEMO-001',
          warehouseName: 'Principal',
          currentStock: 120,
          reservedStock: 10,
          availableStock: 110,
        },
        {
          productId: 'demo-2',
          productName: 'Café en grano',
          sku: 'CAFE-500',
          warehouseName: 'Sucursal Centro',
          currentStock: 45,
          reservedStock: 5,
          availableStock: 40,
        },
      ],
      error: null,
    };
  }
}
