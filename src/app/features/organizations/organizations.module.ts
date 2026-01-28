import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';
import { Checkbox } from 'primeng/checkbox';
import { Select } from 'primeng/select';
import { MultiSelect } from 'primeng/multiselect';
import { TableModule } from 'primeng/table';
import { Toast } from 'primeng/toast';

import { OrganizationsPageComponent } from './pages/organizations-page/organizations-page.component';
import { OrganizationCreatePageComponent } from './pages/organization-create-page/organization-create-page.component';
import { OrganizationCreateWizardComponent } from './pages/organization-create-wizard/organization-create-wizard.component';
import { OrganizationEntryPageComponent } from './pages/organization-entry-page/organization-entry-page.component';
import { OrganizationJoinPageComponent } from './pages/organization-join-page/organization-join-page.component';
import { OrganizationPendingPageComponent } from './pages/organization-pending-page/organization-pending-page.component';

const routes: Routes = [
  { path: '', component: OrganizationsPageComponent },
  { path: 'entry', component: OrganizationEntryPageComponent },
  { path: 'create', component: OrganizationCreateWizardComponent },
  { path: 'join', component: OrganizationJoinPageComponent },
  { path: 'pending', component: OrganizationPendingPageComponent },
];

@NgModule({
  declarations: [
    OrganizationsPageComponent,
    OrganizationCreatePageComponent,
    OrganizationCreateWizardComponent,
    OrganizationEntryPageComponent,
    OrganizationJoinPageComponent,
    OrganizationPendingPageComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule.forChild(routes),
    Card,
    Button,
    DialogModule,
    InputText,
    Checkbox,
    Select,
    MultiSelect,
    TableModule,
    Toast,
  ],
  providers: [MessageService],
})
export class OrganizationsModule {}
