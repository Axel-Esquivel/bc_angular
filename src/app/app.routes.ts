import { Routes } from '@angular/router';

import { LoginPageComponent } from './features/auth/login-page/login-page.component';
import { RegisterPageComponent } from './features/auth/register-page/register-page.component';
import { InitialSetupPageComponent } from './features/setup/initial-setup-page/initial-setup-page.component';
import { MainLayoutComponent } from './layout/main-layout/main-layout.component';
import { AuthGuard } from './core/auth/auth.guard';
import { SetupGuard } from './core/setup/setup.guard';
import { WorkspaceShellComponent } from './features/workspaces/pages/workspace-shell/workspace-shell.component';

export const routes: Routes = [
  { path: 'login', redirectTo: 'auth/login', pathMatch: 'full' },
  { path: 'register', redirectTo: 'auth/register', pathMatch: 'full' },
  { path: 'auth/login', component: LoginPageComponent, canActivate: [SetupGuard], data: { setupMode: 'requireInstalled' } },
  { path: 'auth/register', component: RegisterPageComponent, canActivate: [SetupGuard], data: { setupMode: 'requireInstalled' } },
  {
    path: 'setup/initial',
    component: InitialSetupPageComponent,
    canActivate: [SetupGuard],
    data: { setupMode: 'requireSetup' },
  },
  {
    path: 'setup/modules',
    loadComponent: () =>
      import('./features/setup/modules-setup-page/modules-setup-page.component').then(
        (m) => m.ModulesSetupPageComponent
      ),
    canActivate: [SetupGuard],
    data: { setupMode: 'requireSetup' },
  },
  {
    path: 'workspaces',
    redirectTo: 'workspaces/select',
    pathMatch: 'full',
  },
  {
    path: 'workspaces/select',
    loadComponent: () =>
      import('./features/workspaces/pages/workspace-select-page/workspace-select-page.component').then(
        (m) => m.WorkspaceSelectPageComponent
      ),
    canActivate: [SetupGuard, AuthGuard],
    data: { setupMode: 'requireInstalled' },
  },
  {
    path: 'w/:workspaceId',
    component: WorkspaceShellComponent,
    canActivate: [SetupGuard, AuthGuard],
    data: { setupMode: 'requireInstalled' },
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/workspaces/pages/workspace-launcher/workspace-launcher.component').then(
            (m) => m.WorkspaceLauncherComponent
          ),
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard-page.component').then((m) => m.DashboardPageComponent),
      },
      {
        path: 'settings/modules',
        loadComponent: () =>
          import('./features/workspaces/pages/workspace-modules-page/workspace-modules-page.component').then(
            (m) => m.WorkspaceModulesPageComponent
          ),
      },
    ],
  },
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [SetupGuard, AuthGuard],
    data: { setupMode: 'requireInstalled' },
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard-page.component').then((m) => m.DashboardPageComponent),
      },
      {
        path: 'products/new',
        loadComponent: () =>
          import('./features/products/pages/product-form-page/product-form-page.component').then(
            (m) => m.ProductFormPageComponent
          ),
      },
      {
        path: 'products/:id',
        loadComponent: () =>
          import('./features/products/pages/product-form-page/product-form-page.component').then(
            (m) => m.ProductFormPageComponent
          ),
      },
      {
        path: 'products',
        loadComponent: () =>
          import('./features/products/pages/products-list-page/products-list-page.component').then(
            (m) => m.ProductsListPageComponent
          ),
      },
      {
        path: 'inventory/stock',
        loadComponent: () =>
          import('./features/inventory/pages/stock-list-page/stock-list-page.component').then(
            (m) => m.StockListPageComponent
          ),
      },
      {
        path: 'reports',
        loadComponent: () =>
          import('./features/reports/pages/reports-dashboard-page/reports-dashboard-page.component').then(
            (m) => m.ReportsDashboardPageComponent
          ),
      },
      {
        path: 'pos',
        loadComponent: () =>
          import('./features/pos/pages/pos-terminal-page/pos-terminal-page.component').then(
            (m) => m.PosTerminalPageComponent
          ),
      },
      {
        path: 'settings/modules',
        loadComponent: () =>
          import('./features/settings/pages/modules-page/modules-page.component').then(
            (m) => m.ModulesPageComponent
          ),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
