export interface OrganizationCompanyEnterpriseInput {
  id?: string;
  name: string;
  countryId: string;
  currencyIds?: string[];
  defaultCurrencyId?: string;
}

export interface CreateOrganizationCompanyDto {
  name: string;
  baseCountryId: string;
  baseCurrencyId: string;
  legalName?: string;
  taxId?: string;
  currencies?: string[];
  operatingCountryIds?: string[];
  enterprises?: OrganizationCompanyEnterpriseInput[];
  defaultEnterpriseId?: string | null;
  defaultCurrencyId?: string | null;
}
