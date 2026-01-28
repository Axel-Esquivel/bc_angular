import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { Toast } from 'primeng/toast';

import { OrganizationLocationsSetupPageComponent } from './organization-locations-setup-page.component';

const routes: Routes = [{ path: '', component: OrganizationLocationsSetupPageComponent }];

@NgModule({
  declarations: [OrganizationLocationsSetupPageComponent],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule.forChild(routes),
    Card,
    Button,
    InputText,
    Select,
    Toast,
  ],
  providers: [MessageService],
})
export class OrganizationLocationsSetupPageModule {}
