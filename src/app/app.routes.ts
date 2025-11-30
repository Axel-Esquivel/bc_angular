import { Routes } from '@angular/router';

import { LoginPageComponent } from './features/auth/login-page/login-page.component';
import { RegisterPageComponent } from './features/auth/register-page/register-page.component';
import { InitialSetupPageComponent } from './features/setup/initial-setup-page/initial-setup-page.component';
import { MainLayoutComponent } from './layout/main-layout/main-layout.component';
import { AuthGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  { path: 'login', component: LoginPageComponent },
  { path: 'register', component: RegisterPageComponent },
  { path: 'setup/initial', component: InitialSetupPageComponent },
  {
    path: 'workspaces/select',
    loadComponent: () =>
      import('./features/workspaces/pages/workspace-select-page/workspace-select-page.component').then(
        (m) => m.WorkspaceSelectPageComponent
      ),
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
