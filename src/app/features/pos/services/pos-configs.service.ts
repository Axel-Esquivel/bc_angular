import { HttpClient, HttpParams } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';

import { APP_CONFIG_TOKEN, AppConfig } from '../../../core/config/app-config';
import { ApiResponse } from '../../../shared/models/api-response.model';
import { PosConfig } from '../models/pos-config.model';

export interface PosConfigListQuery {
  OrganizationId?: string;
  companyId?: string;
  enterpriseId?: string;
  warehouseId?: string;
  active?: boolean;
}

export interface CreatePosConfigPayload {
  name: string;
  code: string;
  OrganizationId: string;
  companyId: string;
  enterpriseId: string;
  warehouseId: string;
  currencyId: string;
  active?: boolean;
  allowedPaymentMethods: string[];
  allowedUserIds: string[];
  requiresOpening?: boolean;
  allowOtherUsersClose?: boolean;
  notes?: string;
}

export interface UpdatePosConfigPayload {
  name?: string;
  code?: string;
  warehouseId?: string;
  currencyId?: string;
  active?: boolean;
  allowedPaymentMethods?: string[];
  allowedUserIds?: string[];
  requiresOpening?: boolean;
  allowOtherUsersClose?: boolean;
  notes?: string;
}

@Injectable({ providedIn: 'root' })
export class PosConfigsService {
  private readonly baseUrl: string;

  constructor(@Inject(APP_CONFIG_TOKEN) private readonly config: AppConfig, private readonly http: HttpClient) {
    const apiBase = this.config.apiBaseUrl.replace(/\/$/, '');
    this.baseUrl = `${apiBase}/pos/configs`;
  }

  list(query: PosConfigListQuery = {}): Observable<PosConfig[]> {
    let params = new HttpParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params = params.set(key, String(value));
      }
    });
    return this.http
      .get<ApiResponse<PosConfig[]>>(`${this.baseUrl}`, { params })
      .pipe(map((response) => response.result ?? []));
  }

  listAvailableForMe(query: PosConfigListQuery = {}): Observable<PosConfig[]> {
    let params = new HttpParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params = params.set(key, String(value));
      }
    });
    return this.http
      .get<ApiResponse<PosConfig[]>>(`${this.baseUrl}/available/me`, { params })
      .pipe(map((response) => response.result ?? []));
  }

  getById(id: string): Observable<PosConfig> {
    return this.http
      .get<ApiResponse<PosConfig>>(`${this.baseUrl}/${id}`)
      .pipe(map((response) => response.result as PosConfig));
  }

  create(payload: CreatePosConfigPayload): Observable<PosConfig> {
    return this.http
      .post<ApiResponse<PosConfig>>(`${this.baseUrl}`, payload)
      .pipe(map((response) => response.result as PosConfig));
  }

  update(id: string, payload: UpdatePosConfigPayload): Observable<PosConfig> {
    return this.http
      .patch<ApiResponse<PosConfig>>(`${this.baseUrl}/${id}`, payload)
      .pipe(map((response) => response.result as PosConfig));
  }

  remove(id: string): Observable<{ id: string }> {
    return this.http
      .delete<ApiResponse<{ id: string }>>(`${this.baseUrl}/${id}`)
      .pipe(map((response) => response.result ?? { id }));
  }
}
