import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { FloatLabel } from 'primeng/floatlabel';
import { InputNumber } from 'primeng/inputnumber';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { Toolbar } from 'primeng/toolbar';

import { ProviderFormComponent } from './components/provider-form/provider-form.component';
import { ProvidersListPageComponent } from './pages/providers-list-page/providers-list-page.component';
import { providersRoutes } from './providers.routes';

@NgModule({
  declarations: [ProvidersListPageComponent, ProviderFormComponent],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule.forChild(providersRoutes),
    Button,
    Dialog,
    FloatLabel,
    InputNumber,
    InputText,
    Select,
    TableModule,
    Toolbar,
  ],
})
export class ProvidersModule {}
