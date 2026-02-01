export interface OrganizationModuleCatalogEntry {
  key: string;
  name: string;
  description?: string;
  version: string;
  dependencies?: string[];
  requiresConfig?: boolean;
}

export interface OrganizationModuleState {
  key: string;
  enabled: boolean;
  configured?: boolean;
  status?: 'inactive' | 'enabled' | 'pendingConfig' | 'configured' | 'ready' | 'error';
  enabledAt?: string;
  enabledBy?: string;
}

export type OrganizationRole = string;

export interface OrganizationModulesOverview {
  availableModules: OrganizationModuleCatalogEntry[];
  enabledModules: OrganizationModuleState[];
  userRole: OrganizationRole;
}
