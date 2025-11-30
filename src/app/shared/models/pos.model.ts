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

export interface PosPayment {
  method: string;
  amount: number;
}
