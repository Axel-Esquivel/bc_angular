import { HttpClient } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';

import { APP_CONFIG_TOKEN, AppConfig } from '../../../core/config/app-config';
import { ApiResponse } from '../../../shared/models/api-response.model';
import { PosPaymentMethod } from '../models/pos.model';

export interface PosSession {
  id: string;
  OrganizationId: string;
  companyId: string;
  enterpriseId: string;
  warehouseId: string;
  status: 'OPEN' | 'CLOSED';
  openingAmount: number;
  openedAt: string;
  closedAt?: string;
  closingAmount?: number;
}

export interface PosSaleLineInput {
  variantId: string;
  qty: number;
  unitPrice: number;
}

export interface PosPaymentInput {
  method: PosPaymentMethod;
  amount: number;
  received?: number;
  change?: number;
}

export interface CreatePosSalePayload {
  OrganizationId: string;
  companyId: string;
  enterpriseId: string;
  warehouseId: string;
  sessionId: string;
  cashierUserId: string;
  customerId?: string;
  currency?: string;
  lines: PosSaleLineInput[];
  payments?: PosPaymentInput[];
}

export interface PosSaleActionPayload {
  OrganizationId: string;
  companyId: string;
  enterpriseId: string;
}

export interface PosSale {
  id: string;
  OrganizationId: string;
  companyId: string;
  enterpriseId: string;
  warehouseId: string;
  sessionId: string;
  status: 'DRAFT' | 'COMPLETED' | 'CANCELLED';
  subtotal: number;
  discountTotal: number;
  total: number;
  createdAt: string;
  updatedAt: string;
}

@Injectable({ providedIn: 'root' })
export class PosHttpService {
  private readonly baseUrl: string;

  constructor(@Inject(APP_CONFIG_TOKEN) private readonly config: AppConfig, private readonly http: HttpClient) {
    this.baseUrl = `${this.config.apiBaseUrl}/pos`;
  }

  openSession(payload: {
    OrganizationId: string;
    companyId: string;
    enterpriseId: string;
    warehouseId: string;
    cashierUserId: string;
    openingAmount: number;
  }): Observable<PosSession> {
    return this.http
      .post<ApiResponse<PosSession>>(`${this.baseUrl}/sessions/open`, payload)
      .pipe(map((response) => response.result));
  }

  getActiveSession(payload: {
    OrganizationId: string;
    companyId: string;
    enterpriseId: string;
    cashierUserId: string;
  }): Observable<PosSession | null> {
    return this.http
      .get<ApiResponse<PosSession | null>>(`${this.baseUrl}/sessions/active`, { params: payload })
      .pipe(map((response) => response.result));
  }

  closeSession(payload: {
    OrganizationId: string;
    companyId: string;
    enterpriseId: string;
    sessionId: string;
    cashierUserId: string;
    closingAmount: number;
  }): Observable<PosSession> {
    return this.http
      .post<ApiResponse<PosSession>>(`${this.baseUrl}/sessions/close`, payload)
      .pipe(map((response) => response.result));
  }

  createSale(payload: CreatePosSalePayload): Observable<PosSale> {
    return this.http
      .post<ApiResponse<PosSale>>(`${this.baseUrl}/sales`, payload)
      .pipe(map((response) => response.result));
  }

  postSale(saleId: string, payload: PosSaleActionPayload): Observable<PosSale> {
    return this.http
      .post<ApiResponse<PosSale>>(`${this.baseUrl}/sales/${saleId}/post`, payload)
      .pipe(map((response) => response.result));
  }
}
