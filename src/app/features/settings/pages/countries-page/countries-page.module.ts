import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';

import { CountriesPageComponent } from './countries-page.component';

const routes: Routes = [{ path: '', component: CountriesPageComponent }];

@NgModule({
  declarations: [CountriesPageComponent],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule.forChild(routes),
    Card,
    Button,
    DialogModule,
    InputText,
    TableModule,
  ],
  providers: [MessageService],
})
export class CountriesPageModule {}
