export interface ActiveContext {
  organizationId: string | null;
  companyId: string | null;
  countryId: string | null;
  /** Branch id selected as "empresa" in context. */
  enterpriseId: string | null;
  currencyId: string | null;
}

export type ActiveContextState = Pick<
  ActiveContext,
  'organizationId' | 'enterpriseId' | 'companyId' | 'countryId' | 'currencyId'
>;

export const createEmptyActiveContext = (): ActiveContext => ({
  organizationId: null,
  companyId: null,
  countryId: null,
  enterpriseId: null,
  currencyId: null,
});
