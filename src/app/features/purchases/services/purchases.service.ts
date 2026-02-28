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

export interface PurchaseOrderLinePayload {
  variantId: string;
  qty: number;
  unitCost: number;
  currency?: string;
}

export interface CreatePurchaseOrderPayload {
  OrganizationId: string;
  companyId: string;
  supplierId: string;
  lines: PurchaseOrderLinePayload[];
  warehouseId?: string;
}

export interface SupplierLastCostResult {
  lastCost: number | null;
  lastCurrency: string | null;
  lastRecordedAt: string | null;
}

export interface PurchaseOrderLine {
  id: string;
  variantId: string;
  quantity: number;
  receivedQuantity: number;
  unitCost: number;
  currency?: string;
  status: string;
}

export interface PurchaseOrder {
  id: string;
  supplierId: string;
  warehouseId?: string;
  status: string;
  OrganizationId: string;
  companyId: string;
  lines: PurchaseOrderLine[];
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

  getSupplierVariantLastCost(params: {
    OrganizationId: string;
    companyId: string;
    supplierId: string;
    variantId: string;
  }): Observable<ApiResponse<SupplierLastCostResult>> {
    const httpParams = new HttpParams()
      .set('OrganizationId', params.OrganizationId)
      .set('companyId', params.companyId);
    return this.http.get<ApiResponse<SupplierLastCostResult>>(
      `${this.baseUrl}/suppliers/${params.supplierId}/products/${params.variantId}/last-cost`,
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

  createPurchaseOrder(payload: CreatePurchaseOrderPayload): Observable<ApiResponse<PurchaseOrder>> {
    return this.http.post<ApiResponse<PurchaseOrder>>(`${this.baseUrl}/orders`, payload);
  }
}
