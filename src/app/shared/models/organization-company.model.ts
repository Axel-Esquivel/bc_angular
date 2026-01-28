export interface CreateOrganizationCompanyDto {
  name: string;
  baseCountryId: string;
  baseCurrencyId: string;
  legalName?: string;
  taxId?: string;
  currencies?: string[];
}
