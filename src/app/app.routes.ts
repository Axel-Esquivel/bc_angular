import { Routes } from '@angular/router';

import { LoginPageComponent } from './features/auth/login-page/login-page.component';
import { RegisterPageComponent } from './features/auth/register-page/register-page.component';
import { AuthGuard } from './core/auth/auth.guard';
import { WorkspaceShellComponent } from './features/workspaces/pages/workspace-shell/workspace-shell.component';
import { WorkspaceBootstrapGuard } from './core/workspace/workspace-bootstrap.guard';
import { WorkspaceAccessGuard } from './core/workspace/workspace-access.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginPageComponent },
  { path: 'register', component: RegisterPageComponent },
  { path: 'workspaces', component: WorkspaceShellComponent, canActivate: [AuthGuard, WorkspaceBootstrapGuard], 
    children: [
      { path: 'onboarding', loadComponent: () => import('./features/workspaces/pages/workspace-onboarding/workspace-onboarding.component').then((m) => m.WorkspaceOnboardingComponent) },
      { path: 'select', loadComponent: () => import('./features/workspaces/pages/workspace-select-page/workspace-select-page.component').then((m) => m.WorkspaceSelectPageComponent) },
      { path: '', redirectTo: 'onboarding', pathMatch: 'full' },
    ],
  },
  {
    path: 'workspace/:id', component: WorkspaceShellComponent, canActivate: [AuthGuard, WorkspaceAccessGuard], 
    children: [
      { path: 'dashboard', loadComponent: () => import('./features/dashboard/dashboard-page.component').then((m) => m.DashboardPageComponent) },
      { path: 'products/new', loadComponent: () => import('./features/products/pages/product-form-page/product-form-page.component').then((m) => m.ProductFormPageComponent) },
      { path: 'products/:id', loadComponent: () => import('./features/products/pages/product-form-page/product-form-page.component').then((m) => m.ProductFormPageComponent) },
      { path: 'products', loadComponent: () => import('./features/products/pages/products-list-page/products-list-page.component').then((m) => m.ProductsListPageComponent) },
      { path: 'inventory/stock', loadComponent: () => import('./features/inventory/pages/stock-list-page/stock-list-page.component').then((m) => m.StockListPageComponent) },
      { path: 'reports', loadComponent: () => import('./features/reports/pages/reports-dashboard-page/reports-dashboard-page.component').then((m) => m.ReportsDashboardPageComponent) },
      { path: 'setup', loadComponent: () => import('./features/workspaces/pages/workspace-setup/workspace-setup.component').then((m) => m.WorkspaceSetupComponent) },
      { path: 'pos', loadComponent: () => import('./features/pos/pages/pos-terminal-page/pos-terminal-page.component').then((m) => m.PosTerminalPageComponent) },
      { path: 'settings/accounting', loadComponent: () => import('./features/workspaces/pages/module-settings/module-settings.component').then((m) => m.ModuleSettingsComponent), data: { moduleId: 'accounting' } },
      { path: 'settings/inventory', loadComponent: () => import('./features/workspaces/pages/module-settings/module-settings.component').then((m) => m.ModuleSettingsComponent), data: { moduleId: 'inventory' } },
      { path: 'settings/pos', loadComponent: () => import('./features/workspaces/pages/module-settings/module-settings.component').then((m) => m.ModuleSettingsComponent), data: { moduleId: 'pos' } },
      { path: 'settings/:moduleId', loadComponent: () => import('./features/workspaces/pages/module-settings/module-settings.component').then((m) => m.ModuleSettingsComponent) },
      { path: 'settings/modules', loadComponent: () => import('./features/workspaces/pages/workspace-modules-page/workspace-modules-page.component').then((m) => m.WorkspaceModulesPageComponent) },
      { path: 'apps', loadComponent: () => import('./features/workspaces/pages/workspace-launcher/workspace-launcher.component').then((m) => m.WorkspaceLauncherComponent) },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ],
  },
  { path: '**', redirectTo: 'login' },
];
