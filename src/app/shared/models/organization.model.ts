export interface IOrganizationMember {
  userId: string;
  email?: string;
  roleKey: string;
  status: 'pending' | 'active';
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

export interface IOrganization {
  id?: string;
  name: string;
  code?: string;
  ownerUserId?: string;
  createdBy?: string;
  members?: IOrganizationMember[];
  roles?: IOrganizationRole[];
  createdAt?: string;
}

export interface IOrganizationOverview {
  totalWorkspaces: number;
  totalCompanies: number;
  totalBranches: number;
  totalWarehouses: number;
  workspaces: Array<{
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
  status: 'pending' | 'active';
}
