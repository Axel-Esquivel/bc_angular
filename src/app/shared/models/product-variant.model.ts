export interface ProductVariant {
  id: string;
  productId: string;
  name: string;
  sku: string;
  barcodes: string[];
  baseUomId: string;
  sellable?: boolean;
  OrganizationId?: string;
  companyId?: string;
  enterpriseId?: string;
}
