export interface OrganizationCompanyEnterpriseInput {
  id?: string;
  name: string;
  countryId: string;
  currencyIds?: string[];
  defaultCurrencyId?: string;
}

export interface CompanyUnitInput {
  name: string;
  allowedCurrencyIds: string[];
  baseCurrencyId: string;
}

export interface CompanyEnterprisesByCountryInput {
  countryId: string;
  enterprises: CompanyUnitInput[];
}

export interface CompanyDefaultEnterpriseKey {
  countryId: string;
  enterpriseIndex: number;
}

export interface CreateOrganizationCompanyDto {
  name: string;
  countryId?: string;
  baseCountryId?: string;
  baseCurrencyId?: string;
  legalName?: string;
  taxId?: string;
  currencies?: string[];
  operatingCountryIds?: string[];
  currencyIds?: string[];
  enterprises?: OrganizationCompanyEnterpriseInput[];
  enterprisesByCountry?: CompanyEnterprisesByCountryInput[];
  defaultEnterpriseKey?: CompanyDefaultEnterpriseKey;
  defaultEnterpriseId?: string | null;
  defaultCurrencyId?: string | null;
}
