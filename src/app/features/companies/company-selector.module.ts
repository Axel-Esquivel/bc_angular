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
import { ToastModule } from 'primeng/toast';

import { CompanySelectorComponent } from './pages/company-selector/company-selector.component';

const routes: Routes = [{ path: '', component: CompanySelectorComponent }];

@NgModule({
  declarations: [CompanySelectorComponent],
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
    ToastModule,
  ],
  providers: [MessageService],
})
export class CompanySelectorModule {}


