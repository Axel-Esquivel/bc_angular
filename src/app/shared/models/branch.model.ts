export interface Branch {
  id?: string;
  companyId: string;
  countryId: string;
  name: string;
  currencyIds?: string[];
  settings?: Record<string, any>;
  createdAt?: string;
}
