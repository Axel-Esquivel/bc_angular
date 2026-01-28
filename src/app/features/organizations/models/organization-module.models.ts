export type OrganizationModuleStatus = 'disabled' | 'enabled_unconfigured' | 'configured';

export interface OrganizationModuleState {
  status: OrganizationModuleStatus;
  configuredAt?: string;
  configuredBy?: string;
}

export interface OrganizationModuleDefinition {
  key: string;
  name: string;
  dependencies: string[];
  isSystem: boolean;
}

export interface OrganizationModuleOverviewItem extends OrganizationModuleDefinition {
  state: OrganizationModuleState;
}

export interface OrganizationModulesOverviewResponse {
  modules: OrganizationModuleOverviewItem[];
}

export interface OrganizationModulesUpdatePayload {
  modules: string[];
}
