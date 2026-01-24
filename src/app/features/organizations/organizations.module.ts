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
import { TableModule } from 'primeng/table';
import { Toast } from 'primeng/toast';

import { OrganizationsPageComponent } from './pages/organizations-page/organizations-page.component';

const routes: Routes = [{ path: '', component: OrganizationsPageComponent }];

@NgModule({
  declarations: [OrganizationsPageComponent],
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
    TableModule,
    Toast,
  ],
  providers: [MessageService],
})
export class OrganizationsModule {}
