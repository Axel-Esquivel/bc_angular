import { OrganizationModuleState } from './Organization-modules.model';
import { OrganizationCoreSettings } from './organization-core-settings.model';
import { OrganizationStructureSettings } from './organization-structure-settings.model';

export interface Organization {
  _id?: string;
  id?: string;
  name: string;
  description?: string;
  code?: string;
  organizationId?: string;
  countryId?: string;
  baseCurrencyId?: string;
  ownerUserId?: string;
  ownerId?: string;
  members?: OrganizationMember[];
  enabledModules?: { key: string; enabled: boolean; enabledAt?: string; enabledBy?: string }[];
  moduleStates?: OrganizationModuleState[];
  setupCompleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface OrganizationMember {
  userId: string;
  role?: 'admin' | 'member';
  roleKey?: string;
  status?: 'active' | 'invited' | 'disabled';
}

export interface OrganizationListResult {
  Organizations: Organization[];
  defaultOrganizationId?: string;
}

export type IOrganizationCoreSettings = OrganizationCoreSettings & OrganizationStructureSettings;
