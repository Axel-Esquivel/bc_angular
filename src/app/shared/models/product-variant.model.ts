export interface ProductVariant {
  id: string;
  productId: string;
  name: string;
  sku: string;
  barcodes: string[];
  uomCategoryId?: string;
  minStock?: number;
  uomId: string;
  quantity?: number;
  sellable?: boolean;
  OrganizationId?: string;
  companyId?: string;
  enterpriseId?: string;
}
