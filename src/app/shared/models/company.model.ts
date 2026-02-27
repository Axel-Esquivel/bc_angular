export interface CompanyMember {
  userId: string;
  roleKey: string;
  status?: 'active' | 'invited' | 'disabled';
}

export interface CompanyRole {
  key: string;
  name: string;
  permissions: string[];
}

export interface CompanyModuleStates {
  [moduleKey: string]: 'inactive' | 'enabled' | 'pendingConfig' | 'ready' | 'error';
}

export interface CompanyEnterprise {
  id: string;
  _id?: string;
  name: string;
  countryId: string;
  currencyIds: string[];
  defaultCurrencyId: string;
}

export interface Company {
  id?: string;
  _id?: string;
  organizationId: string;
  name: string;
  legalName?: string;
  taxId?: string;
  baseCountryId: string;
  baseCurrencyId: string;
  currencies?: string[];
  operatingCountryIds?: string[];
  enterprises?: CompanyEnterprise[];
  defaultEnterpriseId?: string | null;
  defaultCurrencyId?: string | null;
  members?: CompanyMember[];
  roles?: CompanyRole[];
  moduleStates?: CompanyModuleStates;
  moduleSettings?: Record<string, unknown>;
  createdAt?: string;
}
