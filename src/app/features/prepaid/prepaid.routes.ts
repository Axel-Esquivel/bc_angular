import { Routes } from '@angular/router';

import { PrepaidShellComponent } from './pages/prepaid-shell/prepaid-shell.component';
import { PrepaidProvidersPageComponent } from './pages/prepaid-providers-page/prepaid-providers-page.component';
import { PrepaidDepositsPageComponent } from './pages/prepaid-deposits-page/prepaid-deposits-page.component';
import { PrepaidBalancesPageComponent } from './pages/prepaid-balances-page/prepaid-balances-page.component';
import { PrepaidConfigsPageComponent } from './pages/prepaid-configs-page/prepaid-configs-page.component';

export const prepaidRoutes: Routes = [
  {
    path: '',
    component: PrepaidShellComponent,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'providers' },
      { path: 'providers', component: PrepaidProvidersPageComponent },
      { path: 'deposits', component: PrepaidDepositsPageComponent },
      { path: 'balances', component: PrepaidBalancesPageComponent },
      { path: 'configs', component: PrepaidConfigsPageComponent },
    ],
  },
];
