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
  packagingId: string;
  packagingMultiplier: number;
  qty: number;
  unitCost: number;
  currency?: string;
  freightCost?: number;
  extraCosts?: number;
  notes?: string;
  bonusQty?: number;
  discountType?: 'PERCENT' | 'AMOUNT';
  discountValue?: number;
}

export interface CreatePurchaseOrderPayload {
  OrganizationId: string;
  companyId: string;
  supplierId: string;
  lines: PurchaseOrderLinePayload[];
  warehouseId?: string;
  orderDate?: string;
  expectedDeliveryDate?: string;
  receivedAt?: string;
  status?: string;
  currencyId?: string;
  globalFreight?: number;
  globalExtraCosts?: number;
  notes?: string;
}

export interface SupplierLastCostResult {
  lastCost: number | null;
  lastCurrency: string | null;
  lastRecordedAt: string | null;
}

export interface GoodsReceiptLinePayload {
  variantId: string;
  productId?: string;
  quantity: number;
  quantityReceived?: number;
  unitCost: number;
  discountType?: 'percent' | 'amount' | 'PERCENT' | 'AMOUNT';
  discountValue?: number;
  bonusQty?: number;
  isBonus?: boolean;
  bonusSourceLineId?: string;
}

export interface CreateGoodsReceiptPayload {
  OrganizationId: string;
  companyId: string;
  purchaseOrderId?: string;
  warehouseId: string;
  lines: GoodsReceiptLinePayload[];
}

export interface GoodsReceiptValidationIssue {
  path: string;
  message: string;
}

export interface GoodsReceiptValidationResult {
  valid: boolean;
  errors: GoodsReceiptValidationIssue[];
  warnings: GoodsReceiptValidationIssue[];
}

export interface PurchaseOrderLine {
  id: string;
  variantId: string;
  packagingId: string;
  packagingMultiplier: number;
  packagingNameId?: string;
  packagingMultiplierSnapshot?: number;
  quantity: number;
  receivedQuantity: number;
  unitCost: number;
  currency?: string;
  freightCost?: number;
  extraCosts?: number;
  notes?: string;
  bonusQty?: number;
  discountType?: 'PERCENT' | 'AMOUNT';
  discountValue?: number;
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
  createdAt?: string | Date;
  expectedDeliveryDate?: string | Date;
  receivedAt?: string | Date;
  currencyId?: string;
  globalFreight?: number;
  globalExtraCosts?: number;
  notes?: string;
  total?: number;
}

export interface BestPriceItem {
  providerId: string;
  providerName: string;
  currency: string;
  unitCost: number;
  packagingId?: string;
  multiplierSnapshot?: number;
  date: string;
  source: 'purchase_order' | 'price_list';
  orderId?: string;
  bestInCurrency?: boolean;
}

export interface BestPriceResponse {
  items: BestPriceItem[];
  fxNote?: string;
}

export interface ReferenceCostsResult {
  averageCost: number | null;
  lastPurchaseCost: number | null;
  packagingBasePrice: number | null;
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

  deleteSupplierCatalog(
    id: string,
    OrganizationId: string,
    companyId: string,
  ): Observable<ApiResponse<{ id: string }>> {
    const httpParams = new HttpParams().set('OrganizationId', OrganizationId).set('companyId', companyId);
    return this.http.delete<ApiResponse<{ id: string }>>(`${this.baseUrl}/supplier-catalog/${id}`, {
      params: httpParams,
    });
  }

  createPurchaseOrder(payload: CreatePurchaseOrderPayload): Observable<ApiResponse<PurchaseOrder>> {
    return this.http.post<ApiResponse<PurchaseOrder>>(`${this.baseUrl}/orders`, payload);
  }

  updatePurchaseOrder(
    orderId: string,
    payload: CreatePurchaseOrderPayload,
  ): Observable<ApiResponse<PurchaseOrder>> {
    return this.http.patch<ApiResponse<PurchaseOrder>>(`${this.baseUrl}/orders/${orderId}`, payload);
  }

  listPurchaseOrders(params: { OrganizationId: string; companyId: string }): Observable<ApiResponse<PurchaseOrder[]>> {
    const httpParams = new HttpParams()
      .set('OrganizationId', params.OrganizationId)
      .set('companyId', params.companyId);
    return this.http.get<ApiResponse<PurchaseOrder[]>>(`${this.baseUrl}/orders`, { params: httpParams });
  }

  getBestPrices(params: {
    organizationId: string;
    productId: string;
    variantId?: string;
    packagingId?: string;
    limit?: number;
  }): Observable<ApiResponse<BestPriceResponse>> {
    let httpParams = new HttpParams()
      .set('organizationId', params.organizationId)
      .set('productId', params.productId);
    if (params.variantId) {
      httpParams = httpParams.set('variantId', params.variantId);
    }
    if (params.packagingId) {
      httpParams = httpParams.set('packagingId', params.packagingId);
    }
    if (typeof params.limit === 'number') {
      httpParams = httpParams.set('limit', String(params.limit));
    }
    return this.http.get<ApiResponse<BestPriceResponse>>(`${this.baseUrl}/orders/best-price`, {
      params: httpParams,
    });
  }

  getReferenceCosts(params: {
    OrganizationId: string;
    companyId: string;
    variantId: string;
    packagingId?: string;
    enterpriseId?: string;
  }): Observable<ApiResponse<ReferenceCostsResult>> {
    let httpParams = new HttpParams()
      .set('OrganizationId', params.OrganizationId)
      .set('companyId', params.companyId)
      .set('variantId', params.variantId);
    if (params.packagingId) {
      httpParams = httpParams.set('packagingId', params.packagingId);
    }
    if (params.enterpriseId) {
      httpParams = httpParams.set('enterpriseId', params.enterpriseId);
    }
    return this.http.get<ApiResponse<ReferenceCostsResult>>(`${this.baseUrl}/reference-costs`, {
      params: httpParams,
    });
  }

  validateGoodsReceipt(payload: CreateGoodsReceiptPayload): Observable<ApiResponse<GoodsReceiptValidationResult>> {
    return this.http.post<ApiResponse<GoodsReceiptValidationResult>>(`${this.baseUrl}/grn/validate`, payload);
  }

  createGoodsReceipt(payload: CreateGoodsReceiptPayload): Observable<ApiResponse<unknown>> {
    return this.http.post<ApiResponse<unknown>>(`${this.baseUrl}/grn`, payload);
  }
}
