import { HttpClient, HttpParams } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';

import { APP_CONFIG_TOKEN, AppConfig } from '../../../core/config/app-config';
import { ApiResponse } from '../../../shared/models/api-response.model';
import { PosPayment, PosSession } from '../models/pos.model';

export interface OpenPosSessionPayload {
  OrganizationId: string;
  companyId: string;
  enterpriseId: string;
  warehouseId: string;
  cashierUserId: string;
  openingAmount?: number;
}

export interface ClosePosSessionPayload {
  OrganizationId: string;
  companyId: string;
  enterpriseId: string;
  sessionId: string;
  cashierUserId: string;
  closingAmount?: number;
}

export interface ActivePosSessionQuery {
  OrganizationId: string;
  companyId: string;
  enterpriseId: string;
  cashierUserId: string;
}

export interface PosSaleLinePayload {
  variantId: string;
  qty: number;
  unitPrice: number;
}

export interface PosSalePayload {
  OrganizationId: string;
  companyId: string;
  enterpriseId: string;
  warehouseId: string;
  sessionId: string;
  cashierUserId: string;
  currency?: string;
  customerId?: string;
  lines: PosSaleLinePayload[];
  payments: PosPayment[];
}

export interface PosSaleActionPayload {
  OrganizationId: string;
  companyId: string;
  enterpriseId: string;
}

export interface PosSale {
  id: string;
  status: 'DRAFT' | 'COMPLETED' | 'CANCELLED';
}

@Injectable({ providedIn: 'root' })
export class PosHttpService {
  private readonly baseUrl: string;

  constructor(@Inject(APP_CONFIG_TOKEN) private readonly config: AppConfig, private readonly http: HttpClient) {
    this.baseUrl = `${this.config.apiBaseUrl}/pos`;
  }

  openSession(payload: OpenPosSessionPayload): Observable<PosSession> {
    return this.http
      .post<ApiResponse<PosSession>>(`${this.baseUrl}/sessions/open`, payload)
      .pipe(map((response) => response.result as PosSession));
  }

  closeSession(payload: ClosePosSessionPayload): Observable<PosSession> {
    return this.http
      .post<ApiResponse<PosSession>>(`${this.baseUrl}/sessions/close`, payload)
      .pipe(map((response) => response.result as PosSession));
  }

  getActiveSession(query: ActivePosSessionQuery): Observable<PosSession | null> {
    let params = new HttpParams();
    Object.entries(query).forEach(([key, value]) => {
      params = params.set(key, value);
    });
    return this.http
      .get<ApiResponse<PosSession | null>>(`${this.baseUrl}/sessions/active`, { params })
      .pipe(map((response) => response.result ?? null));
  }

  createSale(payload: PosSalePayload): Observable<PosSale> {
    return this.http
      .post<ApiResponse<PosSale>>(`${this.baseUrl}/sales`, payload)
      .pipe(map((response) => response.result as PosSale));
  }

  postSale(saleId: string, payload: PosSaleActionPayload): Observable<PosSale> {
    return this.http
      .post<ApiResponse<PosSale>>(`${this.baseUrl}/sales/${saleId}/post`, payload)
      .pipe(map((response) => response.result as PosSale));
  }

  listRecentSales(query: { OrganizationId?: string; companyId?: string; enterpriseId?: string; limit?: number }): Observable<PosSale[]> {
    let params = new HttpParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params = params.set(key, String(value));
      }
    });
    return this.http
      .get<ApiResponse<PosSale[]>>(`${this.baseUrl}/sales/recent`, { params })
      .pipe(map((response) => response.result ?? []));
  }
}
