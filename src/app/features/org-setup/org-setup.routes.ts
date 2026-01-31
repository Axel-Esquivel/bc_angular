import { Routes } from '@angular/router';

import { OrgSetupShellComponent } from './shell/org-setup-shell.component';
import { OrgEntryPageComponent } from './pages/org-entry-page/org-entry-page.component';
import { OrgCreatePageComponent } from './pages/org-create-page/org-create-page.component';
import { OrgJoinPageComponent } from './pages/org-join-page/org-join-page.component';
import { OrgBootstrapPageComponent } from './pages/org-bootstrap-page/org-bootstrap-page.component';
import { OrgModulesPageComponent } from './pages/org-modules-page/org-modules-page.component';

export const orgSetupRoutes: Routes = [
  {
    path: '',
    component: OrgSetupShellComponent,
    children: [
      { path: '', component: OrgEntryPageComponent },
      { path: 'create', component: OrgCreatePageComponent },
      { path: 'join', component: OrgJoinPageComponent },
      { path: 'bootstrap', component: OrgBootstrapPageComponent },
      { path: 'modules', component: OrgModulesPageComponent },
    ],
  },
];
