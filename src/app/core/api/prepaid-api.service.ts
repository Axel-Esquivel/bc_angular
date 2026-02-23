import { HttpClient, HttpParams } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { APP_CONFIG_TOKEN, AppConfig } from '../config/app-config';
import { ApiResponse } from '../../shared/models/api-response.model';
import {
  PrepaidDeposit,
  PrepaidProvider,
  PrepaidVariantConfig,
  PrepaidWallet,
} from '../../shared/models/prepaid.model';

export interface CreatePrepaidProviderPayload {
  name: string;
  isActive?: boolean;
  OrganizationId: string;
  companyId: string;
  enterpriseId: string;
}

export interface UpdatePrepaidProviderPayload {
  name?: string;
  isActive?: boolean;
}

export interface CreatePrepaidDepositPayload {
  providerId: string;
  depositAmount: number;
  creditedAmount: number;
  reference?: string;
  OrganizationId: string;
  companyId: string;
  enterpriseId: string;
}

export interface CreatePrepaidVariantConfigPayload {
  variantId: string;
  providerId: string;
  denomination: number;
  isActive?: boolean;
  OrganizationId: string;
  companyId: string;
  enterpriseId: string;
}

export interface UpdatePrepaidVariantConfigPayload {
  providerId?: string;
  denomination?: number;
  isActive?: boolean;
}

@Injectable({ providedIn: 'root' })
export class PrepaidApiService {
  private readonly baseUrl: string;

  constructor(@Inject(APP_CONFIG_TOKEN) private readonly config: AppConfig, private readonly http: HttpClient) {
    this.baseUrl = `${this.config.apiBaseUrl}/prepaid`;
  }

  listProviders(params: { organizationId: string; enterpriseId: string }): Observable<ApiResponse<PrepaidProvider[]>> {
    const httpParams = new HttpParams()
      .set('organizationId', params.organizationId)
      .set('enterpriseId', params.enterpriseId);
    return this.http.get<ApiResponse<PrepaidProvider[]>>(`${this.baseUrl}/providers`, { params: httpParams });
  }

  createProvider(payload: CreatePrepaidProviderPayload): Observable<ApiResponse<PrepaidProvider>> {
    return this.http.post<ApiResponse<PrepaidProvider>>(`${this.baseUrl}/providers`, payload);
  }

  updateProvider(
    id: string,
    organizationId: string,
    payload: UpdatePrepaidProviderPayload,
  ): Observable<ApiResponse<PrepaidProvider>> {
    const httpParams = new HttpParams().set('organizationId', organizationId);
    return this.http.patch<ApiResponse<PrepaidProvider>>(
      `${this.baseUrl}/providers/${id}`,
      payload,
      { params: httpParams },
    );
  }

  listBalances(params: {
    OrganizationId: string;
    enterpriseId: string;
    providerId?: string;
  }): Observable<ApiResponse<PrepaidWallet[]>> {
    let httpParams = new HttpParams()
      .set('OrganizationId', params.OrganizationId)
      .set('enterpriseId', params.enterpriseId);
    if (params.providerId) {
      httpParams = httpParams.set('providerId', params.providerId);
    }
    return this.http.get<ApiResponse<PrepaidWallet[]>>(`${this.baseUrl}/balances`, { params: httpParams });
  }

  createDeposit(payload: CreatePrepaidDepositPayload): Observable<ApiResponse<PrepaidDeposit>> {
    return this.http.post<ApiResponse<PrepaidDeposit>>(`${this.baseUrl}/deposits`, payload);
  }

  listDeposits(params: {
    organizationId: string;
    enterpriseId: string;
    providerId?: string;
  }): Observable<ApiResponse<PrepaidDeposit[]>> {
    let httpParams = new HttpParams()
      .set('organizationId', params.organizationId)
      .set('enterpriseId', params.enterpriseId);
    if (params.providerId) {
      httpParams = httpParams.set('providerId', params.providerId);
    }
    return this.http.get<ApiResponse<PrepaidDeposit[]>>(`${this.baseUrl}/deposits`, { params: httpParams });
  }

  listVariantConfigs(params: {
    organizationId: string;
    enterpriseId: string;
  }): Observable<ApiResponse<PrepaidVariantConfig[]>> {
    const httpParams = new HttpParams()
      .set('organizationId', params.organizationId)
      .set('enterpriseId', params.enterpriseId);
    return this.http.get<ApiResponse<PrepaidVariantConfig[]>>(`${this.baseUrl}/variant-configs`, { params: httpParams });
  }

  createVariantConfig(payload: CreatePrepaidVariantConfigPayload): Observable<ApiResponse<PrepaidVariantConfig>> {
    return this.http.post<ApiResponse<PrepaidVariantConfig>>(`${this.baseUrl}/variant-configs`, payload);
  }

  updateVariantConfig(
    id: string,
    organizationId: string,
    payload: UpdatePrepaidVariantConfigPayload,
  ): Observable<ApiResponse<PrepaidVariantConfig>> {
    const httpParams = new HttpParams().set('organizationId', organizationId);
    return this.http.patch<ApiResponse<PrepaidVariantConfig>>(
      `${this.baseUrl}/variant-configs/${id}`,
      payload,
      { params: httpParams },
    );
  }
}
