export type OrganizationModuleStatus = 'disabled' | 'enabled_unconfigured' | 'configured';

export interface OrganizationModuleState {
  status: OrganizationModuleStatus;
  configuredAt?: string;
  configuredBy?: string;
}

export interface OrganizationModuleOverviewItem {
  key: string;
  name: string;
  dependencies: string[];
  isSystem: boolean;
  state: OrganizationModuleState;
  visibility?: 'app' | 'internal';
}

export interface OrganizationModulesOverviewResponse {
  modules: OrganizationModuleOverviewItem[];
}

export type OrganizationModulesOverview = OrganizationModuleOverviewItem[];
