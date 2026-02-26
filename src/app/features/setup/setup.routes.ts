import { Routes } from '@angular/router';

import { SetupShellComponent } from './shell/setup-shell.component';
import { SetupEntryPageComponent } from './pages/setup-entry-page/setup-entry-page.component';
import { SetupCreatePageComponent } from './pages/setup-create-page/setup-create-page.component';
import { SetupJoinPageComponent } from './pages/setup-join-page/setup-join-page.component';
import { SetupBootstrapPageComponent } from './pages/setup-bootstrap-page/setup-bootstrap-page.component';
import { SetupModulesPageComponent } from './pages/setup-modules-page/setup-modules-page.component';
import { ModuleStorePageComponent } from './pages/module-store-page/module-store-page.component';

export const SETUP_ROUTES: Routes = [
  {
    path: '',
    component: SetupShellComponent,
    children: [
      { path: '', component: SetupEntryPageComponent },
      { path: 'create', component: SetupCreatePageComponent },
      { path: 'join', component: SetupJoinPageComponent },
      { path: 'bootstrap', component: SetupBootstrapPageComponent },
      { path: 'modules', component: SetupModulesPageComponent },
      { path: 'modules/store', component: ModuleStorePageComponent },
    ],
  },
];
