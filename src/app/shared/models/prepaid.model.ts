export interface PrepaidProvider {
  id: string;
  name: string;
  pin?: string;
  isActive: boolean;
  minimumBalance?: number;
  OrganizationId: string;
  companyId: string;
  enterpriseId: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PrepaidWallet {
  id: string;
  providerId: string;
  balance: number;
  OrganizationId: string;
  companyId: string;
  enterpriseId: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PrepaidDeposit {
  id: string;
  providerId: string;
  depositAmount: number;
  creditedAmount: number;
  reference?: string;
  OrganizationId: string;
  companyId: string;
  enterpriseId: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PrepaidVariantConfig {
  id: string;
  variantId?: string;
  name: string;
  providerId: string;
  denomination: number;
  durationDays?: number;
  requestCodeTemplate: string;
  isActive: boolean;
  OrganizationId: string;
  companyId: string;
  enterpriseId: string;
  createdAt?: string;
  updatedAt?: string;
}
