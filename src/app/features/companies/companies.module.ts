import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { MessageService } from 'primeng/api';
import { AccordionModule } from 'primeng/accordion';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { MultiSelectModule } from 'primeng/multiselect';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';

import { CompaniesPageComponent } from './pages/companies-page/companies-page.component';

const routes: Routes = [{ path: '', component: CompaniesPageComponent }];

@NgModule({
  declarations: [CompaniesPageComponent],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule.forChild(routes),
    AccordionModule,
    ButtonModule,
    CardModule,
    DialogModule,
    InputTextModule,
    MultiSelectModule,
    SelectModule,
    TableModule,
  ],
  providers: [MessageService],
})
export class CompaniesModule {}
