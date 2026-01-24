export interface IOrganizationMember {
  userId: string;
  roleKey: string;
  status: 'pending' | 'active';
  invitedBy?: string;
  requestedBy?: string;
  invitedAt?: string;
  requestedAt?: string;
  activatedAt?: string;
}

export interface IOrganizationRole {
  key: string;
  name: string;
  permissions?: string[];
  system?: boolean;
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
