import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { Dialog } from 'primeng/dialog';
import { Divider } from 'primeng/divider';
import { FloatLabel } from 'primeng/floatlabel';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { Toast } from 'primeng/toast';
import { take } from 'rxjs';

import { CountriesApiService } from '../../../../core/api/countries-api.service';
import { CurrenciesApiService } from '../../../../core/api/currencies-api.service';
import { Country } from '../../../../shared/models/country.model';
import { Currency } from '../../../../shared/models/currency.model';
import { OrgSetupComponentsModule } from '../../components/org-setup-components.module';
import { SetupStateService } from '../../services/setup-state.service';

@Component({
  selector: 'app-org-create-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    Button,
    Card,
    Dialog,
    Divider,
    FloatLabel,
    InputText,
    OrgSetupComponentsModule,
    Select,
    Toast,
  ],
  templateUrl: './org-create-page.component.html',
  styleUrl: './org-create-page.component.scss',
})
export class OrgCreatePageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly setupState = inject(SetupStateService);
  private readonly countriesApi = inject(CountriesApiService);
  private readonly currenciesApi = inject(CurrenciesApiService);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);

  countries: SelectOption[] = [];
  currencies: SelectOption[] = [];

  readonly form = this.fb.group({
    name: this.fb.nonNullable.control('', [Validators.required, Validators.minLength(2)]),
    countryId: this.fb.control<string | null>(null, [Validators.required]),
    currencyId: this.fb.control<string | null>(null, [Validators.required]),
  });

  isSubmitting = false;
  isCountryDialogOpen = false;
  isCurrencyDialogOpen = false;

  ngOnInit(): void {
    this.loadCountries();
    this.loadCurrencies();
  }

  private loadCountries(selectId?: string): void {
    this.countriesApi
      .list()
      .pipe(take(1))
      .subscribe({
        next: (response) => {
          const items = Array.isArray(response?.result) ? response.result : [];
          this.countries = items
            .map((country) => ({
              id: (country.id ?? country.iso2 ?? '').toString(),
              name: country.nameEs || country.nameEn || country.iso2,
              code: country.iso2,
            }))
            .filter((item) => item.id);
          if (selectId) {
            const match = this.countries.find((country) => country.id === selectId);
            this.form.controls.countryId.setValue(match?.id ?? selectId);
          }
        },
        error: () => {
          this.countries = [];
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudieron cargar los paises.',
          });
        },
      });
  }

  private loadCurrencies(selectId?: string): void {
    this.currenciesApi
      .list()
      .pipe(take(1))
      .subscribe({
        next: (response) => {
          const items = Array.isArray(response?.result) ? response.result : [];
          this.currencies = items
            .map((currency) => ({
              id: (currency.id ?? currency.code ?? '').toString(),
              name: currency.name,
              code: currency.code,
            }))
            .filter((item) => item.id);
          if (selectId) {
            const match = this.currencies.find((currency) => currency.id === selectId);
            this.form.controls.currencyId.setValue(match?.id ?? selectId);
          }
        },
        error: () => {
          this.currencies = [];
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudieron cargar las monedas.',
          });
        },
      });
  }

  openCreateCountryDialog(): void {
    this.isCountryDialogOpen = true;
  }

  openCreateCurrencyDialog(): void {
    this.isCurrencyDialogOpen = true;
  }

  onCountryCreated(country: Country): void {
    const id = (country?.id ?? country?.iso2 ?? '').toString();
    this.loadCountries(id || undefined);
    this.messageService.add({ severity: 'success', summary: 'Listo', detail: 'Pais creado.' });
  }

  onCurrencyCreated(currency: Currency): void {
    const id = (currency?.id ?? currency?.code ?? '').toString();
    this.loadCurrencies(id || undefined);
    this.messageService.add({ severity: 'success', summary: 'Listo', detail: 'Moneda creada.' });
  }

  onDialogError(message: string): void {
    this.messageService.add({ severity: 'error', summary: 'Error', detail: message });
  }

  submit(): void {
    if (this.form.invalid || this.isSubmitting) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    const formValue = this.form.getRawValue();
    this.setupState.clear();
    this.setupState.setOrganizationDraft({
      name: formValue.name.trim(),
      countryId: formValue.countryId ?? '',
      currencyId: formValue.currencyId ?? '',
    });
    this.isSubmitting = false;
    this.router.navigate(['/org/setup/bootstrap']);
  }
}

interface SelectOption {
  id: string;
  name: string;
  code?: string;
}
