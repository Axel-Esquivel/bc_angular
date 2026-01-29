import { OrganizationMembershipStatus } from '../../../shared/models/organization.model';

export interface OrganizationSelectionRow {
  id: string;
  name: string;
  code?: string;
  countryIds?: string[];
  currencyIds?: string[];
  roleKey?: string;
  status: OrganizationMembershipStatus;
  isDefault: boolean;
  isOwner: boolean;
  canLeave: boolean;
}
