import { HttpClient, HttpParams } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

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
    return this.http.get<ApiResponse<DailySalesReport[]>>(`${this.baseUrl}/sales/daily`, {
      params: httpParams,
    });
  }

  getInventorySnapshot(params?: ReportFilterParams): Observable<ApiResponse<InventoryReportItem[]>> {
    let httpParams = this.buildDateParams(params);
    if (params?.warehouseId) httpParams = httpParams.set('warehouseId', params.warehouseId);
    if (params?.search) httpParams = httpParams.set('search', params.search);

    return this.http.get<ApiResponse<InventoryReportItem[]>>(`${this.baseUrl}/inventory/snapshot`, {
      params: httpParams,
    });
  }

  getTopProducts(params?: ReportFilterParams & { limit?: number }): Observable<ApiResponse<DailySalesReport[]>> {
    let httpParams = this.buildDateParams(params);
    if (params?.limit) httpParams = httpParams.set('limit', params.limit);

    return this.http.get<ApiResponse<DailySalesReport[]>>(`${this.baseUrl}/sales/top-products`, {
      params: httpParams,
    });
  }

  private buildDateParams(params?: ReportFilterParams): HttpParams {
    let httpParams = new HttpParams();
    if (params?.startDate) httpParams = httpParams.set('startDate', params.startDate);
    if (params?.endDate) httpParams = httpParams.set('endDate', params.endDate);
    return httpParams;
  }
}
