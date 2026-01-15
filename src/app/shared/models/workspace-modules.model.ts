export interface WorkspaceModuleCatalogEntry {
  key: string;
  name: string;
  description?: string;
  version: string;
}

export interface WorkspaceModuleState {
  key: string;
  enabled: boolean;
  enabledAt?: string;
  enabledBy?: string;
}

export type WorkspaceRole = 'admin' | 'member';

export interface WorkspaceModulesOverview {
  availableModules: WorkspaceModuleCatalogEntry[];
  enabledModules: WorkspaceModuleState[];
  userRole: WorkspaceRole;
}
