export type BranchType = 'retail' | 'wholesale';

export interface Branch {
  id?: string;
  companyId: string;
  countryId: string;
  name: string;
  type: BranchType;
  currencyIds?: string[];
  settings?: Record<string, any>;
  createdAt?: string;
}
