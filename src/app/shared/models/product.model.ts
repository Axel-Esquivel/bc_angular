export interface Product {
  id: string;
  name: string;
  sku?: string;
  category?: string;
  price?: number;
  description?: string;
  isActive?: boolean;
}

export interface VariantStock {
  variantId: string;
  variantName: string;
  sku?: string;
  warehouseId: string;
  warehouseName: string;
  quantity: number;
  available?: number;
  onHand?: number;
  reserved?: number;
}
