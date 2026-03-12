import { HttpClient, HttpParams } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';

import { APP_CONFIG_TOKEN, AppConfig } from '../../../core/config/app-config';
import { ApiResponse } from '../../../shared/models/api-response.model';
import {
  PosCashMovement,
  PosCashMovementType,
  PosPaymentMethod,
  PosPayment,
  PosSession,
  PosSessionDenomination,
  PosSessionSummary,
} from '../models/pos.model';

export interface OpenPosSessionPayload {
  posConfigId: string;
  OrganizationId: string;
  companyId: string;
  enterpriseId: string;
  warehouseId: string;
  cashierUserId: string;
  openingAmount?: number;
  openingDenominations?: PosSessionDenomination[];
  notes?: string;
}

export interface ClosePosSessionPayload {
  OrganizationId: string;
  companyId: string;
  enterpriseId: string;
  sessionId: string;
  cashierUserId: string;
  posConfigId?: string;
  closingAmount?: number;
  countedClosingAmount?: number;
  closingDenominations?: PosSessionDenomination[];
  notes?: string;
}

export interface ActivePosSessionQuery {
  OrganizationId: string;
  companyId: string;
  enterpriseId: string;
  cashierUserId: string;
  posConfigId?: string;
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

export interface CreatePosCashMovementPayload {
  sessionId: string;
  OrganizationId: string;
  companyId: string;
  enterpriseId: string;
  type: PosCashMovementType;
  amount: number;
  currencyId: string;
  paymentMethod: PosPaymentMethod;
  reason: string;
  notes?: string;
  createdByUserId: string;
}

export interface PosSale {
  id: string;
  status: 'DRAFT' | 'COMPLETED' | 'CANCELLED';
}

@Injectable({ providedIn: 'root' })
export class PosHttpService {
  private readonly baseUrl: string;

  constructor(@Inject(APP_CONFIG_TOKEN) private readonly config: AppConfig, private readonly http: HttpClient) {
    const apiBase = this.config.apiBaseUrl.replace(/\/$/, '');
    this.baseUrl = `${apiBase}/pos`;
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

  getSessionSummary(sessionId: string, query: { OrganizationId: string; companyId: string; enterpriseId: string }): Observable<PosSessionSummary | null> {
    let params = new HttpParams();
    Object.entries(query).forEach(([key, value]) => {
      params = params.set(key, value);
    });
    return this.http
      .get<ApiResponse<PosSessionSummary | null>>(`${this.baseUrl}/sessions/${sessionId}/summary`, { params })
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

  createCashMovement(sessionId: string, payload: CreatePosCashMovementPayload): Observable<PosCashMovement> {
    return this.http
      .post<ApiResponse<PosCashMovement>>(`${this.baseUrl}/sessions/${sessionId}/movements`, payload)
      .pipe(map((response) => response.result as PosCashMovement));
  }

  listCashMovements(
    sessionId: string,
    query: { OrganizationId: string; companyId: string; enterpriseId: string },
  ): Observable<PosCashMovement[]> {
    let params = new HttpParams();
    Object.entries(query).forEach(([key, value]) => {
      params = params.set(key, value);
    });
    return this.http
      .get<ApiResponse<PosCashMovement[]>>(`${this.baseUrl}/sessions/${sessionId}/movements`, { params })
      .pipe(map((response) => response.result ?? []));
  }
}
