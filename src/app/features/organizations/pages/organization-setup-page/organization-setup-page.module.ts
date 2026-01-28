import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { Toast } from 'primeng/toast';

import { OrganizationSetupPageComponent } from './organization-setup-page.component';

const routes: Routes = [{ path: '', component: OrganizationSetupPageComponent }];

@NgModule({
  declarations: [OrganizationSetupPageComponent],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule.forChild(routes),
    Card,
    Button,
    DialogModule,
    InputText,
    Select,
    Toast,
  ],
  providers: [MessageService],
})
export class OrganizationSetupPageModule {}
