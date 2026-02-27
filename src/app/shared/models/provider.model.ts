export type ProviderStatus = 'active' | 'inactive';

export interface ProviderVariantCostEntry {
  variantId: string;
  cost: number;
  currency: string;
  recordedAt: string | Date;
}

export interface ProviderVariant {
  variantId: string;
  active: boolean;
  costHistory: ProviderVariantCostEntry[];
}

export interface Provider {
  id: string;
  name: string;
  nit?: string;
  address?: string;
  creditDays?: number;
  creditLimit?: number;
  status?: ProviderStatus;
  contactEmail?: string;
  contactPhone?: string;
  variants?: ProviderVariant[];
  OrganizationId: string;
  companyId: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface CreateOrUpdateProviderDto {
  name: string;
  nit?: string;
  address?: string;
  creditDays?: number;
  creditLimit?: number;
  status?: ProviderStatus;
}
