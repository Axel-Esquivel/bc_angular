import { HttpClient } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { APP_CONFIG_TOKEN, AppConfig } from '../config/app-config';
import { ApiResponse } from '../../shared/models/api-response.model';

export interface Warehouse {
  id: string;
  name: string;
  code: string;
  OrganizationId: string;
  companyId: string;
  branchId?: string;
}

@Injectable({ providedIn: 'root' })
export class WarehousesApiService {
  private readonly baseUrl: string;

  constructor(@Inject(APP_CONFIG_TOKEN) private readonly config: AppConfig, private readonly http: HttpClient) {
    this.baseUrl = `${this.config.apiBaseUrl}/warehouses`;
  }

  list(): Observable<Warehouse[]> {
    return this.http.get<Warehouse[]>(this.baseUrl);
  }

  listByCompany(companyId: string): Observable<ApiResponse<Warehouse[]>> {
    return this.http.get<ApiResponse<Warehouse[]>>(
      `${this.config.apiBaseUrl}/companies/${companyId}/warehouses`,
    );
  }

  createForCompany(
    companyId: string,
    payload: { name: string; branchId: string; code?: string },
  ): Observable<ApiResponse<Warehouse>> {
    return this.http.post<ApiResponse<Warehouse>>(
      `${this.config.apiBaseUrl}/companies/${companyId}/warehouses`,
      payload,
    );
  }

  update(warehouseId: string, payload: Partial<Warehouse>): Observable<ApiResponse<Warehouse>> {
    return this.http.patch<ApiResponse<Warehouse>>(
      `${this.config.apiBaseUrl}/warehouses/${warehouseId}`,
      payload,
    );
  }
}
