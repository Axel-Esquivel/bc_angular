export interface ActiveContext {
  organizationId: string | null;
  companyId: string | null;
  countryId: string | null;
  enterpriseId: string | null;
  currencyId: string | null;
}

export const createEmptyActiveContext = (): ActiveContext => ({
  organizationId: null,
  companyId: null,
  countryId: null,
  enterpriseId: null,
  currencyId: null,
});
