import { HttpClient, HttpParams } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';

import { APP_CONFIG_TOKEN, AppConfig } from '../../../core/config/app-config';
import { ApiResponse } from '../../../shared/models/api-response.model';
import { PosProduct } from '../models/pos-product.model';

interface PosProductLookupDto {
  _id: string;
  name: string;
  sku: string;
  barcode?: string;
  price: number;
  isActive: boolean;
  taxRate?: number;
}

export interface PosProductSearchQuery {
  enterpriseId: string;
  q: string;
  OrganizationId?: string;
  companyId?: string;
}

export interface PosProductByCodeQuery {
  enterpriseId: string;
  code: string;
  OrganizationId?: string;
  companyId?: string;
}

@Injectable({ providedIn: 'root' })
export class PosProductsService {
  private readonly baseUrl: string;

  constructor(@Inject(APP_CONFIG_TOKEN) private readonly config: AppConfig, private readonly http: HttpClient) {
    this.baseUrl = `${this.config.apiBaseUrl}/products`;
  }

  search(query: PosProductSearchQuery): Observable<PosProduct[]> {
    let params = new HttpParams().set('enterpriseId', query.enterpriseId).set('q', query.q);
    if (query.OrganizationId) params = params.set('OrganizationId', query.OrganizationId);
    if (query.companyId) params = params.set('companyId', query.companyId);

    return this.http
      .get<ApiResponse<PosProductLookupDto[]>>(`${this.baseUrl}/search`, { params })
      .pipe(map((response) => (response.result ?? []).map((item) => this.mapToPosProduct(item))));
  }

  findByCode(query: PosProductByCodeQuery): Observable<PosProduct | null> {
    let params = new HttpParams().set('enterpriseId', query.enterpriseId).set('code', query.code);
    if (query.OrganizationId) params = params.set('OrganizationId', query.OrganizationId);
    if (query.companyId) params = params.set('companyId', query.companyId);

    return this.http
      .get<ApiResponse<PosProductLookupDto | null>>(`${this.baseUrl}/by-code`, { params })
      .pipe(map((response) => (response.result ? this.mapToPosProduct(response.result) : null)));
  }

  private mapToPosProduct(input: PosProductLookupDto): PosProduct {
    return {
      id: input._id,
      name: input.name,
      sku: input.sku,
      barcode: input.barcode,
      price: input.price,
      isActive: input.isActive,
      taxRate: input.taxRate,
    };
  }
}
