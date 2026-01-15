import { Routes } from '@angular/router';

import { LoginPageComponent } from './features/auth/login-page/login-page.component';
import { RegisterPageComponent } from './features/auth/register-page/register-page.component';
import { MainLayoutComponent } from './layout/main-layout/main-layout.component';
import { AuthGuard } from './core/auth/auth.guard';
import { WorkspaceShellComponent } from './features/workspaces/pages/workspace-shell/workspace-shell.component';
import { WorkspaceBootstrapGuard } from './core/workspace/workspace-bootstrap.guard';
import { WorkspaceAccessGuard } from './core/workspace/workspace-access.guard';

export const routes: Routes = [
  { path: 'login', redirectTo: 'auth/login', pathMatch: 'full' },
  { path: 'register', redirectTo: 'auth/register', pathMatch: 'full' },
  { path: 'auth/login', component: LoginPageComponent },
  { path: 'auth/register', component: RegisterPageComponent },
  { path: '', redirectTo: 'workspaces', pathMatch: 'full' },
  {
    path: 'workspaces',
    canActivate: [AuthGuard, WorkspaceBootstrapGuard],
    pathMatch: 'full',
    loadComponent: () =>
      import('./features/workspaces/pages/workspace-entry/workspace-entry.component').then(
        (m) => m.WorkspaceEntryComponent
      ),
  },
  {
    path: 'workspaces/onboarding',
    loadComponent: () =>
      import('./features/workspaces/pages/workspace-onboarding/workspace-onboarding.component').then(
        (m) => m.WorkspaceOnboardingComponent
      ),
    canActivate: [AuthGuard],
  },
  {
    path: 'workspaces/select',
    loadComponent: () =>
      import('./features/workspaces/pages/workspace-select-page/workspace-select-page.component').then(
        (m) => m.WorkspaceSelectPageComponent
      ),
    canActivate: [AuthGuard],
  },
  {
    path: 'workspaces/:workspaceId',
    component: WorkspaceShellComponent,
    canActivate: [AuthGuard, WorkspaceAccessGuard],
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
    canActivate: [AuthGuard],
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
