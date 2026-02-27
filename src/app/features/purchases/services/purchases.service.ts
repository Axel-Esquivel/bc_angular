import { HttpClient, HttpParams } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { APP_CONFIG_TOKEN, AppConfig } from '../../../core/config/app-config';
import { ApiResponse } from '../../../shared/models/api-response.model';
import {
  CreateSupplierCatalogDto,
  SupplierProductVariantItem,
  SupplierCatalogItem,
  UpdateSupplierCatalogDto,
} from '../../../shared/models/supplier-catalog.model';

export interface SupplierCatalogListParams {
  OrganizationId: string;
  companyId: string;
  supplierId: string;
}

export interface CreateSupplierCatalogPayload extends CreateSupplierCatalogDto {
  OrganizationId: string;
  companyId: string;
}

@Injectable({ providedIn: 'root' })
export class PurchasesService {
  private readonly baseUrl: string;

  constructor(
    @Inject(APP_CONFIG_TOKEN) private readonly config: AppConfig,
    private readonly http: HttpClient,
  ) {
    this.baseUrl = `${this.config.apiBaseUrl}/purchases`;
  }

  getSupplierProducts(params: SupplierCatalogListParams): Observable<ApiResponse<SupplierProductVariantItem[]>> {
    const httpParams = new HttpParams()
      .set('OrganizationId', params.OrganizationId)
      .set('companyId', params.companyId);
    return this.http.get<ApiResponse<SupplierProductVariantItem[]>>(
      `${this.baseUrl}/suppliers/${params.supplierId}/products`,
      { params: httpParams },
    );
  }

  listSupplierCatalog(params: SupplierCatalogListParams): Observable<ApiResponse<SupplierCatalogItem[]>> {
    const httpParams = new HttpParams()
      .set('OrganizationId', params.OrganizationId)
      .set('companyId', params.companyId)
      .set('supplierId', params.supplierId);
    return this.http.get<ApiResponse<SupplierCatalogItem[]>>(`${this.baseUrl}/supplier-catalog`, {
      params: httpParams,
    });
  }

  createSupplierCatalog(payload: CreateSupplierCatalogPayload): Observable<ApiResponse<SupplierCatalogItem>> {
    return this.http.post<ApiResponse<SupplierCatalogItem>>(`${this.baseUrl}/supplier-catalog`, payload);
  }

  updateSupplierCatalog(
    id: string,
    OrganizationId: string,
    companyId: string,
    payload: UpdateSupplierCatalogDto,
  ): Observable<ApiResponse<SupplierCatalogItem>> {
    const httpParams = new HttpParams().set('OrganizationId', OrganizationId).set('companyId', companyId);
    return this.http.patch<ApiResponse<SupplierCatalogItem>>(
      `${this.baseUrl}/supplier-catalog/${id}`,
      payload,
      { params: httpParams },
    );
  }
}
