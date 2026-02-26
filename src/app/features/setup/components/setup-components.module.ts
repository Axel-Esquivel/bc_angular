import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { FloatLabel } from 'primeng/floatlabel';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';

import { CreateCountryFormComponent } from './create-country-form/create-country-form.component';
import { CreateCurrencyFormComponent } from './create-currency-form/create-currency-form.component';
import { SetupStepBranchesByCompanyComponent } from './setup-step-branches-by-company/setup-step-branches-by-company.component';
import { SetupStepCompaniesByCountryComponent } from './setup-step-companies-by-country/setup-step-companies-by-country.component';
import { SetupStepCountriesCurrenciesComponent } from './setup-step-countries-currencies/setup-step-countries-currencies.component';
import { SetupStepOrganizationFormComponent } from './setup-step-organization-form/setup-step-organization-form.component';

@NgModule({
  declarations: [
    CreateCountryFormComponent,
    CreateCurrencyFormComponent,
    SetupStepOrganizationFormComponent,
    SetupStepCountriesCurrenciesComponent,
    SetupStepCompaniesByCountryComponent,
    SetupStepBranchesByCompanyComponent,
  ],
  imports: [CommonModule, ReactiveFormsModule, Button, Dialog, FloatLabel, InputText, Select],
  exports: [
    CreateCountryFormComponent,
    CreateCurrencyFormComponent,
    SetupStepOrganizationFormComponent,
    SetupStepCountriesCurrenciesComponent,
    SetupStepCompaniesByCountryComponent,
    SetupStepBranchesByCompanyComponent,
  ],
})
export class SetupComponentsModule {}
