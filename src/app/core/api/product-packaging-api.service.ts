import { HttpClient } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { APP_CONFIG_TOKEN, AppConfig } from '../config/app-config';
import { ApiResponse } from '../../shared/models/api-response.model';

export interface ProductPackaging {
  id: string;
  variantId: string;
  name: string;
  unitsPerPack: number;
  barcode?: string;
  internalBarcode?: string;
  price: number;
  isActive: boolean;
  systemCreated?: boolean;
  OrganizationId?: string;
  companyId?: string;
  enterpriseId?: string;
}

export interface CreateProductPackagingRequest {
  OrganizationId: string;
  companyId: string;
  enterpriseId: string;
  name: string;
  unitsPerPack: number;
  price: number;
  barcode?: string;
  internalBarcode?: string;
  isActive: boolean;
}

export interface UpdatePackagingPayload {
  name?: string;
  unitsPerPack?: number;
  barcode?: string;
  internalBarcode?: string;
  price?: number;
  isActive?: boolean;
}

@Injectable({ providedIn: 'root' })
export class ProductPackagingApiService {
  private readonly baseUrl: string;

  constructor(@Inject(APP_CONFIG_TOKEN) private readonly config: AppConfig, private readonly http: HttpClient) {
    this.baseUrl = `${this.config.apiBaseUrl}/products`;
  }

  listByVariant(variantId: string): Observable<ApiResponse<ProductPackaging[]>> {
    return this.http.get<ApiResponse<ProductPackaging[]>>(`${this.baseUrl}/${variantId}/packaging`);
  }

  create(variantId: string, payload: CreateProductPackagingRequest): Observable<ApiResponse<ProductPackaging>> {
    return this.http.post<ApiResponse<ProductPackaging>>(`${this.baseUrl}/${variantId}/packaging`, payload);
  }

  update(id: string, payload: UpdatePackagingPayload): Observable<ApiResponse<ProductPackaging>> {
    return this.http.patch<ApiResponse<ProductPackaging>>(`${this.baseUrl}/packaging/${id}`, payload);
  }

  remove(id: string): Observable<ApiResponse<{ id: string }>> {
    return this.http.delete<ApiResponse<{ id: string }>>(`${this.baseUrl}/packaging/${id}`);
  }

  generateInternalBarcode(organizationId: string): Observable<ApiResponse<{ internalBarcode: string }>> {
    return this.http.post<ApiResponse<{ internalBarcode: string }>>(
      `${this.baseUrl}/packaging/internal-barcode`,
      { organizationId },
    );
  }
}
