export type PosPaymentMethod = 'CASH' | 'CARD' | 'TRANSFER' | 'VOUCHER';

export interface PosCartLine {
  variantId: string;
  productName: string;
  sku?: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface PosPayment {
  method: PosPaymentMethod;
  amount: number;
  received?: number;
  change?: number;
}

export interface PosSession {
  id: string;
  OrganizationId: string;
  companyId: string;
  enterpriseId: string;
  warehouseId: string;
  cashierUserId: string;
  status: 'OPEN' | 'CLOSED';
  openingAmount: number;
  openedAt: string;
  closedAt?: string;
  closingAmount?: number;
}
