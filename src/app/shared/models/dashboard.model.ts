export interface DashboardOverview {
  currentOrgId: string | null;
  currentOrgRoleKey: string | null;
  permissions: string[];
  modulesPendingConfig: string[];
}
