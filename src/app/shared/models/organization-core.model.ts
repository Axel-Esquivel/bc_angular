export interface CoreCountry {
  id: string;
  name: string;
  code: string;
}

export interface CoreCurrency {
  id: string;
  name: string;
  code: string;
  symbol?: string;
}

export interface CoreCompany {
  id: string;
  name: string;
  countryId: string;
}

export interface CoreCountryCreatePayload {
  name: string;
  code: string;
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
  countryId: string;
}

export interface OrganizationCoreSettings {
  countries: CoreCountry[];
  currencies: CoreCurrency[];
  companies: CoreCompany[];
}

export interface OrganizationCoreSettingsUpdatePayload {
  countries?: CoreCountryUpdatePayload[];
  currencies?: CoreCurrencyUpdatePayload[];
  companies?: CoreCompanyUpdatePayload[];
}
