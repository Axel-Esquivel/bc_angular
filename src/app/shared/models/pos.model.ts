export interface PosCart {
  id: string;
  lines: PosCartLine[];
  total: number;
  status: 'draft' | 'confirmed' | 'paid';
}

export interface PosCartLine {
  variantId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  prepaid?: {
    phoneNumber?: string;
    denomination?: number;
    providerId?: string;
  };
}

export type PosPaymentMethod = 'CASH' | 'CARD' | 'VOUCHER' | 'TRANSFER';

export interface PosPayment {
  method: PosPaymentMethod;
  amount: number;
  received?: number;
  change?: number;
}
