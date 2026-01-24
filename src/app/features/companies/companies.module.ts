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
import { TableModule } from 'primeng/table';
import { Toast } from 'primeng/toast';

import { CompaniesPageComponent } from './pages/companies-page/companies-page.component';

const routes: Routes = [{ path: '', component: CompaniesPageComponent }];

@NgModule({
  declarations: [CompaniesPageComponent],
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
    TableModule,
    Toast,
  ],
  providers: [MessageService],
})
export class CompaniesModule {}
