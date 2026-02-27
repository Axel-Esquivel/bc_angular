import { HttpClient, HttpParams } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { APP_CONFIG_TOKEN, AppConfig } from '../../../core/config/app-config';
import { ApiResponse } from '../../../shared/models/api-response.model';

export interface Warehouse {
  id: string;
  organizationId: string;
  enterpriseId: string;
  code: string;
  name: string;
  active: boolean;
}

export type LocationType =
  | 'internal'
  | 'supplier'
  | 'customer'
  | 'inventory_loss'
  | 'transit'
  | 'production';

export type LocationUsage =
  | 'storage'
  | 'picking'
  | 'receiving'
  | 'shipping'
  | 'scrap'
  | 'transit'
  | 'virtual';

export interface LocationNode {
  id: string;
  name: string;
  code: string;
  type: LocationType;
  usage: LocationUsage;
  active: boolean;
  parentLocationId: string | null;
  children: LocationNode[];
}

export interface WarehouseCreatePayload {
  organizationId: string;
  enterpriseId: string;
  code: string;
  name: string;
  active: boolean;
}

export interface WarehouseUpdatePayload {
  organizationId: string;
  enterpriseId: string;
  code: string;
  name: string;
  active: boolean;
}

export interface LocationCreatePayload {
  organizationId: string;
  enterpriseId: string;
  warehouseId: string;
  parentLocationId: string | null;
  code: string;
  name: string;
  type: LocationType;
  usage: LocationUsage;
  active: boolean;
}

export interface LocationUpdatePayload {
  code: string;
  name: string;
  type: LocationType;
  usage: LocationUsage;
  active: boolean;
}

@Injectable({ providedIn: 'root' })
export class WarehousesService {
  private readonly baseUrl: string;

  constructor(
    @Inject(APP_CONFIG_TOKEN) private readonly config: AppConfig,
    private readonly http: HttpClient,
  ) {
    this.baseUrl = this.config.apiBaseUrl;
  }

  getAll(organizationId: string, enterpriseId?: string): Observable<ApiResponse<Warehouse[]>> {
    let params = new HttpParams().set('organizationId', organizationId);
    if (enterpriseId) {
      params = params.set('enterpriseId', enterpriseId);
    }
    return this.http.get<ApiResponse<Warehouse[]>>(`${this.baseUrl}/warehouses`, { params });
  }

  create(payload: WarehouseCreatePayload): Observable<ApiResponse<Warehouse>> {
    return this.http.post<ApiResponse<Warehouse>>(`${this.baseUrl}/warehouses`, payload);
  }

  update(id: string, payload: WarehouseUpdatePayload): Observable<ApiResponse<Warehouse>> {
    return this.http.patch<ApiResponse<Warehouse>>(`${this.baseUrl}/warehouses/${id}`, payload);
  }

  remove(id: string): Observable<ApiResponse<{ id: string }>> {
    return this.http.delete<ApiResponse<{ id: string }>>(`${this.baseUrl}/warehouses/${id}`);
  }

  getLocationsTree(warehouseId: string): Observable<ApiResponse<LocationNode[]>> {
    return this.http.get<ApiResponse<LocationNode[]>>(
      `${this.baseUrl}/warehouses/${warehouseId}/locations/tree`,
    );
  }

  createLocation(payload: LocationCreatePayload): Observable<ApiResponse<LocationNode>> {
    const body: Record<string, string | boolean | null> = {
      organizationId: payload.organizationId,
      enterpriseId: payload.enterpriseId,
      warehouseId: payload.warehouseId,
      code: payload.code,
      name: payload.name,
      type: payload.type,
      usage: payload.usage,
      active: payload.active,
      parentLocationId: payload.parentLocationId,
    };
    if (!payload.parentLocationId) {
      delete body['parentLocationId'];
    }
    return this.http.post<ApiResponse<LocationNode>>(`${this.baseUrl}/locations`, body);
  }

  updateLocation(id: string, payload: LocationUpdatePayload): Observable<ApiResponse<LocationNode>> {
    return this.http.patch<ApiResponse<LocationNode>>(`${this.baseUrl}/locations/${id}`, payload);
  }
}
