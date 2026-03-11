export type PosPaymentMethod = 'CASH' | 'CARD' | 'VOUCHER' | 'TRANSFER';

export interface PosCartLine {
  variantId: string;
  productName: string;
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
