import { HttpClient, HttpParams } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';

import { APP_CONFIG_TOKEN, AppConfig } from '../../../core/config/app-config';
import { ApiResponse } from '../../../shared/models/api-response.model';
import { PosProduct } from '../models/pos-product.model';

export interface PosProductSearchQuery {
  OrganizationId: string;
  enterpriseId: string;
  companyId?: string;
  q: string;
}

export interface PosProductCodeQuery {
  OrganizationId: string;
  enterpriseId: string;
  companyId?: string;
  code: string;
}

interface PosProductResponse {
  _id: string;
  name: string;
  sku: string;
  barcode?: string;
  price: number;
  isActive: boolean;
}

@Injectable({ providedIn: 'root' })
export class PosProductsService {
  private readonly baseUrl: string;

  constructor(@Inject(APP_CONFIG_TOKEN) private readonly config: AppConfig, private readonly http: HttpClient) {
    const apiBase = this.config.apiBaseUrl.replace(/\/$/, '');
    this.baseUrl = `${apiBase}/pos/variants`;
  }

  search(query: PosProductSearchQuery): Observable<PosProduct[]> {
    let params = new HttpParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params = params.set(key, value);
      }
    });
    return this.http
      .get<ApiResponse<PosProductResponse[]>>(`${this.baseUrl}/search`, { params })
      .pipe(map((response) => (response.result ?? []).map((item) => this.mapProduct(item))));
  }

  findByCode(query: PosProductCodeQuery): Observable<PosProduct | null> {
    let params = new HttpParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params = params.set(key, value);
      }
    });
    return this.http
      .get<ApiResponse<PosProductResponse | null>>(`${this.baseUrl}/by-code`, { params })
      .pipe(map((response) => (response.result ? this.mapProduct(response.result) : null)));
  }

  private mapProduct(input: PosProductResponse): PosProduct {
    return {
      id: input._id,
      name: input.name,
      sku: input.sku,
      barcode: input.barcode,
      price: input.price,
      isActive: input.isActive,
    };
  }
}
