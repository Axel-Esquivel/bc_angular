export type PosPaymentMethod = 'CASH' | 'CARD' | 'TRANSFER' | 'VOUCHER';

export type PosDenominationType = 'bill' | 'coin';

export interface PosSessionDenomination {
  currencyId: string;
  denominationValue: number;
  denominationType: PosDenominationType;
  quantity: number;
  subtotal: number;
}

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

export type PosSessionStatus = 'DRAFT' | 'OPEN' | 'CLOSING_PENDING' | 'CLOSED' | 'CANCELLED';

export interface PosSession {
  id: string;
  posConfigId: string;
  OrganizationId: string;
  companyId: string;
  enterpriseId: string;
  warehouseId: string;
  cashierUserId: string;
  openedByUserId: string;
  closedByUserId?: string;
  status: PosSessionStatus;
  openingAmount: number;
  expectedClosingAmount?: number;
  countedClosingAmount?: number;
  differenceAmount?: number;
  openingDenominations?: PosSessionDenomination[];
  closingDenominations?: PosSessionDenomination[];
  openedAt: string;
  closedAt?: string;
  notes?: string;
}

export interface PosSessionSummary {
  sessionId: string;
  currency: string;
  openingAmount: number;
  expectedClosingAmount: number;
  totalSales: number;
  cashPayments: number;
  cashMovements: number;
  paymentsByMethod: Record<PosPaymentMethod, number>;
  openingDenominations?: PosSessionDenomination[];
}

export type PosCashMovementType = 'income' | 'expense' | 'withdrawal' | 'float' | 'adjustment';

export interface PosCashMovement {
  id: string;
  sessionId: string;
  type: PosCashMovementType;
  amount: number;
  currencyId: string;
  paymentMethod: PosPaymentMethod;
  reason: string;
  notes?: string;
  createdByUserId: string;
  createdAt: string;
}
