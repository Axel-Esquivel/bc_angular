import { HttpClient } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';

import { APP_CONFIG_TOKEN, AppConfig } from '../../../core/config/app-config';
import { ApiResponse } from '../../../shared/models/api-response.model';
import { PosPaymentMethod } from '../../../shared/models/pos.model';

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
  productId: string;
  qty: number;
  unitPrice: number;
  taxRate?: number;
  phoneNumber?: string;
  denomination?: number;
  prepaidProviderId?: string;
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
  sessionId: string;
  warehouseId: string;
  customerId?: string;
  currency?: string;
  lines: PosSaleLineInput[];
  payments?: PosPaymentInput[];
}

export interface PosSaleActionPayload {
  OrganizationId: string;
  companyId: string;
  enterpriseId: string;
  cashierUserId?: string;
}

export interface PosSale {
  id: string;
  OrganizationId: string;
  companyId: string;
  enterpriseId: string;
  warehouseId: string;
  sessionId?: string;
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
    cashierUserId?: string;
    openingAmount: number;
  }): Observable<PosSession> {
    return this.http
      .post<ApiResponse<PosSession>>(`${this.baseUrl}/sessions/open`, payload)
      .pipe(map((response) => response.result));
  }

  closeSession(payload: {
    OrganizationId: string;
    companyId: string;
    enterpriseId: string;
    sessionId: string;
    cashierUserId?: string;
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

  voidSale(saleId: string, payload: PosSaleActionPayload): Observable<PosSale> {
    return this.http
      .post<ApiResponse<PosSale>>(`${this.baseUrl}/sales/${saleId}/void`, payload)
      .pipe(map((response) => response.result));
  }
}
