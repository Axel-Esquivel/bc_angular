import { HttpClient, HttpParams } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { APP_CONFIG_TOKEN, AppConfig } from '../config/app-config';
import { ApiResponse, PaginatedResponse } from '../../shared/models/api-response.model';
import { VariantStock } from '../../shared/models/product.model';

@Injectable({ providedIn: 'root' })
export class InventoryApiService {
  private readonly baseUrl: string;

  constructor(@Inject(APP_CONFIG_TOKEN) private readonly config: AppConfig, private readonly http: HttpClient) {
    this.baseUrl = `${this.config.apiBaseUrl}/inventory`;
  }

  getStockByWarehouse(params?: {
    enterpriseId?: string;
    warehouseId?: string;
    productId?: string;
    category?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Observable<ApiResponse<PaginatedResponse<VariantStock>>> {
    let httpParams = new HttpParams();
    if (params?.enterpriseId) httpParams = httpParams.set('enterpriseId', params.enterpriseId);
    if (params?.warehouseId) httpParams = httpParams.set('warehouseId', params.warehouseId);
    if (params?.productId) httpParams = httpParams.set('productId', params.productId);
    if (params?.category) httpParams = httpParams.set('category', params.category);
    if (params?.search) httpParams = httpParams.set('search', params.search);
    if (params?.page) httpParams = httpParams.set('page', params.page);
    if (params?.limit) httpParams = httpParams.set('limit', params.limit);

    return this.http.get<ApiResponse<PaginatedResponse<VariantStock>>>(`${this.baseUrl}/stock`, { params: httpParams });
  }

  // TODO: Endpoint para registrar ajustes o movimientos de inventario cuando el backend lo exponga
}
