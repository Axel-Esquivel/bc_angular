export interface PosCart {
  id: string;
  lines: PosCartLine[];
  total: number;
  status: 'draft' | 'confirmed' | 'paid';
}

export interface PosCartLine {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export type PosPaymentMethod = 'CASH';

export interface PosPayment {
  method: PosPaymentMethod;
  amount: number;
  received?: number;
  change?: number;
}
