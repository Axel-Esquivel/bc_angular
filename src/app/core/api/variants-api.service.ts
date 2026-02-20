import { HttpClient } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { APP_CONFIG_TOKEN, AppConfig } from '../config/app-config';
import { ApiResponse } from '../../shared/models/api-response.model';
import { ProductVariant } from '../../shared/models/product-variant.model';

export interface CreateProductVariantPayload {
  name: string;
  sku?: string;
  barcodes?: string[];
  minStock?: number;
  uomId: string;
  uomCategoryId?: string;
  quantity?: number;
  sellable?: boolean;
}

export interface UpdateVariantPayload {
  name?: string;
  sku?: string;
  barcodes?: string[];
  minStock?: number;
  uomId?: string;
  uomCategoryId?: string;
  quantity?: number;
  sellable?: boolean;
}

@Injectable({ providedIn: 'root' })
export class VariantsApiService {
  private readonly baseUrl: string;

  constructor(@Inject(APP_CONFIG_TOKEN) private readonly config: AppConfig, private readonly http: HttpClient) {
    this.baseUrl = `${this.config.apiBaseUrl}/variants`;
  }

  getByProduct(productId: string): Observable<ApiResponse<ProductVariant[]>> {
    return this.http.get<ApiResponse<ProductVariant[]>>(
      `${this.config.apiBaseUrl}/products/${productId}/variants`,
    );
  }

  createForProduct(
    productId: string,
    payload: CreateProductVariantPayload,
  ): Observable<ApiResponse<ProductVariant>> {
    return this.http.post<ApiResponse<ProductVariant>>(
      `${this.config.apiBaseUrl}/products/${productId}/variants`,
      payload,
    );
  }

  updateVariant(id: string, payload: UpdateVariantPayload): Observable<ApiResponse<ProductVariant>> {
    return this.http.patch<ApiResponse<ProductVariant>>(`${this.baseUrl}/${id}`, payload);
  }

  deleteVariant(id: string): Observable<ApiResponse<{ id: string }>> {
    return this.http.delete<ApiResponse<{ id: string }>>(`${this.baseUrl}/${id}`);
  }
}
