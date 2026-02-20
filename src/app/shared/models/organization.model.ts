import { AuthUser } from './auth.model';
import { OrganizationCoreSettings } from './organization-core.model';

export type OrganizationMembershipStatus = 'pending' | 'active';

export interface IOrganizationMember {
  userId: string;
  email?: string;
  roleKey: string;
  status: OrganizationMembershipStatus;
  invitedBy?: string;
  requestedBy?: string;
  invitedAt?: string;
  requestedAt?: string;
  activatedAt?: string;
  createdAt?: string;
}

export const OWNER_ROLE_KEY = 'owner' as const;

export interface IOrganizationRole {
  key: string;
  name: string;
  permissions?: string[];
  isSystem?: boolean;
}

export interface IOrganizationInstalledModule {
  key: string;
  version: string;
  installedAt: string;
}

export interface IOrganization {
  id?: string;
  name: string;
  code?: string;
  eanPrefix?: string;
  ownerUserId?: string;
  createdBy?: string;
  setupStatus?: 'pending' | 'completed';
  countryIds?: string[];
  currencyIds?: string[];
  coreSettings?: OrganizationCoreSettings;
  members?: IOrganizationMember[];
  roles?: IOrganizationRole[];
  installedModules?: IOrganizationInstalledModule[];
  moduleSettings?: Record<string, unknown>;
  createdAt?: string;
}

export interface IOrganizationOverview {
  totalOrganizations: number;
  totalCompanies: number;
  totalBranches: number;
  totalWarehouses: number;
  Organizations: Array<{
    id: string;
    name?: string;
    activeModules: Array<{ key: string; status: string }>;
  }>;
}

export interface IOrganizationMembership {
  organizationId: string;
  name: string;
  code: string;
  roleKey: string;
  status: OrganizationMembershipStatus;
}

export interface CreateOrganizationRequest {
  name: string;
  countryIds?: string[];
  currencyIds?: string[];
}

export interface UpdateOrganizationRequest {
  name?: string;
  countryIds?: string[];
  currencyIds?: string[];
}

export interface OrganizationDefaultResult {
  user: AuthUser;
}

export interface OrganizationDeleteResult {
  success: true;
}

export type Organization = IOrganization;
