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

export interface Company {
  id?: string;
  organizationId: string;
  name: string;
  legalName?: string;
  taxId?: string;
  baseCountryId: string;
  baseCurrencyId: string;
  currencies?: string[];
  members?: CompanyMember[];
  roles?: CompanyRole[];
  moduleStates?: CompanyModuleStates;
  moduleSettings?: Record<string, any>;
  createdAt?: string;
}
