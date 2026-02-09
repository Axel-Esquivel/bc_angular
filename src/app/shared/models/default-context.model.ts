export interface DefaultContext {
  organizationId?: string;
  countryId?: string;
  companyId?: string;
  enterpriseId?: string;
  currencyId?: string;
}

export interface DefaultContextValidationResult {
  isComplete: boolean;
  isValid: boolean;
  missing: string[];
  sanitizedContext?: DefaultContext;
}
