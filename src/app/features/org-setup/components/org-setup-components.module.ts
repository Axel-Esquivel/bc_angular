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
import { OrgStepBranchesByCompanyComponent } from './org-step-branches-by-company/org-step-branches-by-company.component';
import { OrgStepCompaniesByCountryComponent } from './org-step-companies-by-country/org-step-companies-by-country.component';
import { OrgStepCountriesCurrenciesComponent } from './org-step-countries-currencies/org-step-countries-currencies.component';
import { OrgStepOrganizationFormComponent } from './org-step-organization-form/org-step-organization-form.component';

@NgModule({
  declarations: [
    CreateCountryFormComponent,
    CreateCurrencyFormComponent,
    OrgStepOrganizationFormComponent,
    OrgStepCountriesCurrenciesComponent,
    OrgStepCompaniesByCountryComponent,
    OrgStepBranchesByCompanyComponent,
  ],
  imports: [CommonModule, ReactiveFormsModule, Button, Dialog, FloatLabel, InputText, Select],
  exports: [
    CreateCountryFormComponent,
    CreateCurrencyFormComponent,
    OrgStepOrganizationFormComponent,
    OrgStepCountriesCurrenciesComponent,
    OrgStepCompaniesByCountryComponent,
    OrgStepBranchesByCompanyComponent,
  ],
})
export class OrgSetupComponentsModule {}
