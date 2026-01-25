import { WorkspaceModuleState } from './workspace-modules.model';

export interface Workspace {
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
  members?: WorkspaceMember[];
  enabledModules?: { key: string; enabled: boolean; enabledAt?: string; enabledBy?: string }[];
  moduleStates?: WorkspaceModuleState[];
  setupCompleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface WorkspaceMember {
  userId: string;
  role?: 'admin' | 'member';
  roleKey?: string;
  status?: 'active' | 'invited' | 'disabled';
}

export interface WorkspaceListResult {
  workspaces: Workspace[];
  defaultWorkspaceId?: string;
}

export interface IWorkspaceCoreSettings {
  countryId?: string;
  baseCurrencyId?: string;
  currencyIds: string[];
  companies: Array<{ id: string; name: string }>;
  branches: Array<{ id: string; companyId: string; name: string }>;
  warehouses: Array<{ id: string; branchId: string; name: string; type?: string }>;
}
