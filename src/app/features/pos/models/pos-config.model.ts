import { PosPaymentMethod } from './pos.model';

export interface PosConfig {
  id: string;
  name: string;
  code: string;
  OrganizationId: string;
  companyId: string;
  enterpriseId: string;
  warehouseId: string;
  currencyId: string;
  active: boolean;
  allowedPaymentMethods: PosPaymentMethod[];
  allowedUserIds: string[];
  requiresOpening: boolean;
  allowOtherUsersClose: boolean;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}
