export interface CoreCountry {
  id: string;
  name: string;
  code: string;
  companies?: CoreCompanyConfig[];
}

export interface CoreCurrency {
  id: string;
  name: string;
  code: string;
  symbol?: string;
}

export interface CoreCompanyConfig {
  id: string;
  name: string;
  currencyIds: string[];
  enterprises: CoreEnterprise[];
}

export interface CoreCompany {
  id: string;
  name: string;
  countryId: string;
}

export interface CoreEnterprise {
  id: string;
  name: string;
}

export interface CoreCountryCreatePayload {
  name: string;
  code: string;
  companies?: CoreCompanyConfigInput[];
}

export interface CoreCurrencyCreatePayload {
  name: string;
  code: string;
  symbol?: string;
}

export interface CoreCompanyCreatePayload {
  name: string;
  countryId: string;
}

export interface CoreCountryUpdatePayload {
  id?: string;
  name: string;
  code: string;
  companies?: CoreCompanyConfigInput[];
}

export interface CoreCurrencyUpdatePayload {
  id?: string;
  name: string;
  code: string;
  symbol?: string;
}

export interface CoreCompanyUpdatePayload {
  id?: string;
  name: string;
  currencyIds?: string[];
  enterprises?: CoreEnterpriseInput[];
}

export interface CoreCompanyConfigInput {
  id?: string;
  name: string;
  currencyIds?: string[];
  enterprises?: CoreEnterpriseInput[];
}

export interface CoreEnterpriseInput {
  id?: string;
  name: string;
}

export interface OrganizationCoreSettings {
  countries: CoreCountry[];
  currencies: CoreCurrency[];
}

export interface OrganizationCoreSettingsUpdatePayload {
  countries?: CoreCountryUpdatePayload[];
  currencies?: CoreCurrencyUpdatePayload[];
}
