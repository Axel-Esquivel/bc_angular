import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { InputText } from 'primeng/inputtext';

import { OrgSetupEntryPageComponent } from './pages/org-setup-entry-page/org-setup-entry-page.component';
import { OrgSetupCreatePageComponent } from './pages/org-setup-create-page/org-setup-create-page.component';
import { OrgSetupJoinPageComponent } from './pages/org-setup-join-page/org-setup-join-page.component';
import { OrgSetupBootstrapPageComponent } from './pages/org-setup-bootstrap-page/org-setup-bootstrap-page.component';
import { OrgSetupModulesPageComponent } from './pages/org-setup-modules-page/org-setup-modules-page.component';

const routes: Routes = [
  { path: '', component: OrgSetupEntryPageComponent },
  { path: 'create', component: OrgSetupCreatePageComponent },
  { path: 'join', component: OrgSetupJoinPageComponent },
  { path: 'bootstrap', component: OrgSetupBootstrapPageComponent },
  { path: 'modules', component: OrgSetupModulesPageComponent },
];

@NgModule({
  declarations: [
    OrgSetupEntryPageComponent,
    OrgSetupCreatePageComponent,
    OrgSetupJoinPageComponent,
    OrgSetupBootstrapPageComponent,
    OrgSetupModulesPageComponent,
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule.forChild(routes),
    Card,
    Button,
    InputText,
  ],
})
export class OrgSetupModule {}
