export type SupplierCatalogBonusType = 'none' | 'discount_percent' | 'bonus_qty';
export type SupplierCatalogStatus = 'active' | 'inactive';

export interface SupplierCatalogItem {
  id: string;
  supplierId: string;
  variantId: string;
  unitCost: number;
  currency?: string;
  freightCost?: number;
  bonusType?: SupplierCatalogBonusType;
  bonusValue?: number;
  minQty?: number;
  leadTimeDays?: number;
  validFrom?: string | Date;
  validTo?: string | Date;
  status: SupplierCatalogStatus;
  OrganizationId: string;
  companyId: string;
  lastReceiptCost?: number;
}

export interface SupplierProductVariantItem {
  supplierId: string;
  variantId: string;
  active: boolean;
  lastCost: number | null;
  lastCurrency: string | null;
  lastRecordedAt: string | null;
}

export interface CreateSupplierCatalogDto {
  supplierId: string;
  variantId: string;
  unitCost: number;
  currency?: string;
  freightCost?: number;
  bonusType?: SupplierCatalogBonusType;
  bonusValue?: number;
  minQty?: number;
  leadTimeDays?: number;
  validFrom?: string;
  validTo?: string;
  status?: SupplierCatalogStatus;
}

export interface UpdateSupplierCatalogDto {
  supplierId?: string;
  variantId?: string;
  unitCost?: number;
  currency?: string;
  freightCost?: number;
  bonusType?: SupplierCatalogBonusType;
  bonusValue?: number;
  minQty?: number;
  leadTimeDays?: number;
  validFrom?: string;
  validTo?: string;
  status?: SupplierCatalogStatus;
}
