export interface PosProduct {
  id: string;
  name: string;
  sku: string;
  barcode?: string;
  price: number;
  isActive: boolean;
  taxRate?: number;
}
