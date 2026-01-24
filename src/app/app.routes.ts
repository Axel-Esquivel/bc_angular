import { Routes } from '@angular/router';

import { LoginPageComponent } from './features/auth/login-page/login-page.component';
import { RegisterPageComponent } from './features/auth/register-page/register-page.component';
import { AuthGuard } from './core/auth/auth.guard';
import { WorkspaceShellComponent } from './features/workspaces/pages/workspace-shell/workspace-shell.component';
import { CompanyAccessGuard } from './core/company/company-access.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginPageComponent },
  { path: 'register', component: RegisterPageComponent },
  { path: 'organizations', canActivate: [AuthGuard], loadChildren: () => import('./features/organizations/organizations.module').then((m) => m.OrganizationsModule) },
  { path: 'organizations/:orgId/companies', canActivate: [AuthGuard], loadChildren: () => import('./features/companies/companies.module').then((m) => m.CompaniesModule) },
  { path: 'companies/select', canActivate: [AuthGuard], loadChildren: () => import('./features/companies/company-selector.module').then((m) => m.CompanySelectorModule) },
  { path: 'workspaces', redirectTo: 'companies/select', pathMatch: 'full' },
  { path: 'settings/countries', canActivate: [AuthGuard], loadChildren: () => import('./features/settings/pages/countries-page/countries-page.module').then((m) => m.CountriesPageModule) },
  { path: 'workspaces/onboarding', redirectTo: 'companies/select', pathMatch: 'full' },
  { path: 'workspaces/select', redirectTo: 'companies/select', pathMatch: 'full' },
  { path: 'workspaces/setup', redirectTo: 'companies/select', pathMatch: 'full' },
  { path: 'workspaces/:id/setup', redirectTo: 'company/:id/setup', pathMatch: 'full' },
  { path: 'company/:id/setup', canActivate: [AuthGuard], loadComponent: () => import('./features/workspaces/pages/workspace-setup/workspace-setup.component').then((m) => m.WorkspaceSetupComponent) },
  { path: 'workspace/:id', redirectTo: 'company/:id', pathMatch: 'full' },
  {
    path: 'company/:id', component: WorkspaceShellComponent, canActivate: [AuthGuard, CompanyAccessGuard], 
    children: [
      { path: 'dashboard', loadComponent: () => import('./features/dashboard/dashboard-page.component').then((m) => m.DashboardPageComponent) },
      { path: 'products/new', loadComponent: () => import('./features/products/pages/product-form-page/product-form-page.component').then((m) => m.ProductFormPageComponent) },
      { path: 'products/:id', loadComponent: () => import('./features/products/pages/product-form-page/product-form-page.component').then((m) => m.ProductFormPageComponent) },
      { path: 'products', loadComponent: () => import('./features/products/pages/products-list-page/products-list-page.component').then((m) => m.ProductsListPageComponent) },
      { path: 'inventory/stock', loadComponent: () => import('./features/inventory/pages/stock-list-page/stock-list-page.component').then((m) => m.StockListPageComponent) },
      { path: 'reports', loadComponent: () => import('./features/reports/pages/reports-dashboard-page/reports-dashboard-page.component').then((m) => m.ReportsDashboardPageComponent) },
      { path: 'pos', loadComponent: () => import('./features/pos/pages/pos-terminal-page/pos-terminal-page.component').then((m) => m.PosTerminalPageComponent) },
      { path: 'settings/accounting', loadComponent: () => import('./features/workspaces/pages/module-settings/module-settings.component').then((m) => m.ModuleSettingsComponent), data: { moduleId: 'accounting' } },
      { path: 'settings/inventory', loadComponent: () => import('./features/workspaces/pages/module-settings/module-settings.component').then((m) => m.ModuleSettingsComponent), data: { moduleId: 'inventory' } },
      { path: 'settings/pos', loadComponent: () => import('./features/workspaces/pages/module-settings/module-settings.component').then((m) => m.ModuleSettingsComponent), data: { moduleId: 'pos' } },
      { path: 'settings/core', loadChildren: () => import('./features/workspaces/pages/workspace-core-settings-page/workspace-core-settings-page.module').then((m) => m.WorkspaceCoreSettingsPageModule) },
      { path: 'settings/roles', loadChildren: () => import('./features/workspaces/pages/workspace-roles-page/workspace-roles-page.module').then((m) => m.WorkspaceRolesPageModule) },
      { path: 'settings/branches', loadChildren: () => import('./features/companies/pages/branches-page/branches-page.module').then((m) => m.BranchesPageModule) },
      { path: 'settings/warehouses', loadChildren: () => import('./features/companies/pages/warehouses-page/warehouses-page.module').then((m) => m.WarehousesPageModule) },
      { path: 'settings/modules', loadComponent: () => import('./features/workspaces/pages/workspace-modules-page/workspace-modules-page.component').then((m) => m.WorkspaceModulesPageComponent) },
      { path: 'settings/:moduleId', loadComponent: () => import('./features/workspaces/pages/module-settings/module-settings.component').then((m) => m.ModuleSettingsComponent) },
      { path: 'apps', loadComponent: () => import('./features/workspaces/pages/workspace-launcher/workspace-launcher.component').then((m) => m.WorkspaceLauncherComponent) },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ],
  },
  { path: '**', redirectTo: 'login' },
];
