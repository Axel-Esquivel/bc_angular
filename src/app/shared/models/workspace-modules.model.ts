export interface WorkspaceModuleCatalogEntry {
  key: string;
  name: string;
  description?: string;
  version: string;
  dependencies?: string[];
  requiresConfig?: boolean;
}

export interface WorkspaceModuleState {
  key: string;
  enabled: boolean;
  configured?: boolean;
  status?: 'inactive' | 'enabled' | 'pendingConfig' | 'configured' | 'ready' | 'error';
  enabledAt?: string;
  enabledBy?: string;
}

export type WorkspaceRole = string;

export interface WorkspaceModulesOverview {
  availableModules: WorkspaceModuleCatalogEntry[];
  enabledModules: WorkspaceModuleState[];
  userRole: WorkspaceRole;
}
