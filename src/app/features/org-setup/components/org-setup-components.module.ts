import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { FloatLabel } from 'primeng/floatlabel';
import { InputText } from 'primeng/inputtext';

import { CreateCountryFormComponent } from './create-country-form/create-country-form.component';
import { CreateCurrencyFormComponent } from './create-currency-form/create-currency-form.component';

@NgModule({
  declarations: [CreateCountryFormComponent, CreateCurrencyFormComponent],
  imports: [CommonModule, ReactiveFormsModule, Button, Dialog, FloatLabel, InputText],
  exports: [CreateCountryFormComponent, CreateCurrencyFormComponent],
})
export class OrgSetupComponentsModule {}
