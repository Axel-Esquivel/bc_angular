import { HttpClient, HttpParams } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { APP_CONFIG_TOKEN, AppConfig } from '../../../core/config/app-config';
import { ApiResponse } from '../../../shared/models/api-response.model';

export interface StockItem {
  organizationId: string;
  enterpriseId: string;
  productId: string;
  warehouseId: string;
  locationId: string;
  onHand: number;
  reserved: number;
  avgCost: number;
  updatedAt?: string;
}

export type StockMovementType = 'in' | 'out' | 'internal' | 'adjust' | 'return' | 'scrap';

export interface StockMovementReference {
  module: string;
  entity: string;
  entityId: string;
  lineId: string;
}

export interface StockMovement {
  id: string;
  organizationId: string;
  enterpriseId: string;
  type: StockMovementType;
  productId: string;
  qty: number;
  fromLocationId: string | null;
  toLocationId: string | null;
  unitCost: number;
  reference: StockMovementReference;
  status: 'posted' | 'reversed';
  createdAt: string;
}

export interface StockQueryFilters {
  organizationId: string;
  enterpriseId: string;
  warehouseId?: string;
  locationId?: string;
  productId?: string;
}

export interface MovementQueryFilters {
  organizationId: string;
  enterpriseId: string;
  warehouseId?: string;
  locationId?: string;
  productId?: string;
  startDate?: string;
  endDate?: string;
}

type StockResponse = StockItem[] | { items: StockItem[]; total?: number };

type MovementResponse = StockMovement[] | { items: StockMovement[]; total?: number };

@Injectable({ providedIn: 'root' })
export class InventoryStockService {
  private readonly baseUrl: string;

  constructor(@Inject(APP_CONFIG_TOKEN) private readonly config: AppConfig, private readonly http: HttpClient) {
    this.baseUrl = this.config.apiBaseUrl;
  }

  getStock(filters: StockQueryFilters): Observable<ApiResponse<StockResponse>> {
    let params = new HttpParams()
      .set('organizationId', filters.organizationId)
      .set('enterpriseId', filters.enterpriseId);

    if (filters.warehouseId) params = params.set('warehouseId', filters.warehouseId);
    if (filters.locationId) params = params.set('locationId', filters.locationId);
    if (filters.productId) params = params.set('productId', filters.productId);

    return this.http.get<ApiResponse<StockResponse>>(`${this.baseUrl}/stock`, { params });
  }

  getMovements(filters: MovementQueryFilters): Observable<ApiResponse<MovementResponse>> {
    let params = new HttpParams()
      .set('organizationId', filters.organizationId)
      .set('enterpriseId', filters.enterpriseId);

    if (filters.warehouseId) params = params.set('warehouseId', filters.warehouseId);
    if (filters.locationId) params = params.set('locationId', filters.locationId);
    if (filters.productId) params = params.set('productId', filters.productId);
    if (filters.startDate) params = params.set('startDate', filters.startDate);
    if (filters.endDate) params = params.set('endDate', filters.endDate);

    return this.http.get<ApiResponse<MovementResponse>>(`${this.baseUrl}/stock-movements`, { params });
  }
}
