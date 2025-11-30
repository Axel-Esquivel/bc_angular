import { Routes } from '@angular/router';

import { LoginPageComponent } from './features/auth/login-page/login-page.component';
import { RegisterPageComponent } from './features/auth/register-page/register-page.component';
import { InitialSetupPageComponent } from './features/setup/initial-setup-page/initial-setup-page.component';
import { MainLayoutComponent } from './features/layout/main-layout/main-layout.component';
import { AuthGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  { path: 'login', component: LoginPageComponent },
  { path: 'register', component: RegisterPageComponent },
  { path: 'setup/initial', component: InitialSetupPageComponent },
  {
    path: 'workspaces/select',
    loadComponent: () =>
      import('./features/workspaces/workspace-select-page/workspace-select-page.component').then(
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
    ],
  },
  { path: '**', redirectTo: '' },
];
