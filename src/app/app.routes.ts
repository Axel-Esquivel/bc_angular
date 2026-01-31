import { Routes } from '@angular/router';

import { AuthGuard } from './core/guards/auth.guard';
import { HasOrganizationGuard } from './core/guards/has-organization.guard';
import { NoOrganizationGuard } from './core/guards/no-organization.guard';
import { RequireContextGuard } from './core/guards/require-context.guard';
import { RootRedirectGuard } from './core/guards/root-redirect.guard';
import { RootRedirectPageComponent } from './core/guards/root-redirect-page.component';

export const routes: Routes = [
  { path: '', pathMatch: 'full', canActivate: [RootRedirectGuard], component: RootRedirectPageComponent },
  { path: 'auth', loadChildren: () => import('./features/auth/auth.routes').then((m) => m.authRoutes) },
  {
    path: 'org',
    children: [
      {
        path: 'setup',
        canActivate: [AuthGuard, NoOrganizationGuard],
        loadChildren: () => import('./features/org-setup/org-setup.routes').then((m) => m.orgSetupRoutes),
      },
    ],
  },
  {
    path: 'context',
    canActivate: [AuthGuard, HasOrganizationGuard],
    loadChildren: () => import('./features/context/context.routes').then((m) => m.contextRoutes),
  },
  {
    path: 'app',
    canActivate: [AuthGuard, RequireContextGuard],
    loadChildren: () => import('./features/app/app.routes').then((m) => m.appRoutes),
  },
  { path: '**', canActivate: [RootRedirectGuard], component: RootRedirectPageComponent },
];
