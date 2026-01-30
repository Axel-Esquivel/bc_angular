import { Routes } from '@angular/router';

import { AuthGuard } from './core/auth/auth.guard';
import { LoginPageComponent } from './features/auth/login-page/login-page.component';
import { RegisterPageComponent } from './features/auth/register-page/register-page.component';
import { OrganizationBootstrapGuard } from './core/organization/organization-bootstrap.guard';

const companyShellChildren: Routes = [
  { path: 'dashboard', loadComponent: () => import('./features/dashboard/dashboard-page.component').then((m) => m.DashboardPageComponent) },
  { path: 'products/new', loadComponent: () => import('./features/products/pages/product-form-page/product-form-page.component').then((m) => m.ProductFormPageComponent) },
  { path: 'products/:id', loadComponent: () => import('./features/products/pages/product-form-page/product-form-page.component').then((m) => m.ProductFormPageComponent) },
  { path: 'products', loadComponent: () => import('./features/products/pages/products-list-page/products-list-page.component').then((m) => m.ProductsListPageComponent) },
  { path: 'inventory/stock', loadComponent: () => import('./features/inventory/pages/stock-list-page/stock-list-page.component').then((m) => m.StockListPageComponent) },
  { path: 'reports', loadComponent: () => import('./features/reports/pages/reports-dashboard-page/reports-dashboard-page.component').then((m) => m.ReportsDashboardPageComponent) },
  { path: 'pos', loadComponent: () => import('./features/pos/pages/pos-terminal-page/pos-terminal-page.component').then((m) => m.PosTerminalPageComponent) },
  { path: 'settings/branches', loadChildren: () => import('./features/companies/pages/branches-page/branches-page.module').then((m) => m.BranchesPageModule) },
  { path: 'settings/warehouses', loadChildren: () => import('./features/companies/pages/warehouses-page/warehouses-page.module').then((m) => m.WarehousesPageModule) },
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
];

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginPageComponent },
  { path: 'register', component: RegisterPageComponent },
  { path: 'setup/modules', canActivate: [AuthGuard, OrganizationBootstrapGuard], loadChildren: () => import('./features/organizations/pages/organization-modules-setup/organization-modules-setup.module').then((m) => m.OrganizationModulesSetupModule) },
  { path: 'organizations/modules', canActivate: [AuthGuard, OrganizationBootstrapGuard], loadChildren: () => import('./features/organizations/pages/organization-modules-setup/organization-modules-setup.module').then((m) => m.OrganizationModulesSetupModule) },
  { path: 'organizations/modules/locations/setup', canActivate: [AuthGuard, OrganizationBootstrapGuard], loadChildren: () => import('./features/organizations/pages/organization-locations-setup-page/organization-locations-setup-page.module').then((m) => m.OrganizationLocationsSetupPageModule) },
  { path: 'organizations/setup', canActivate: [AuthGuard], loadChildren: () => import('./features/organizations/pages/organization-setup-page/organization-setup-page.module').then((m) => m.OrganizationSetupPageModule) },
  { path: 'organizations', canActivate: [AuthGuard], loadChildren: () => import('./features/organizations/organizations.module').then((m) => m.OrganizationsModule) },
  { path: 'organizations/:orgId/companies', canActivate: [AuthGuard], loadChildren: () => import('./features/companies/companies.module').then((m) => m.CompaniesModule) },
  { path: 'companies/select', canActivate: [AuthGuard], loadChildren: () => import('./features/companies/company-selector.module').then((m) => m.CompanySelectorModule) },
  { path: 'settings/countries', canActivate: [AuthGuard], loadChildren: () => import('./features/settings/pages/countries-page/countries-page.module').then((m) => m.CountriesPageModule) },
  { path: '**', redirectTo: 'login' },
];