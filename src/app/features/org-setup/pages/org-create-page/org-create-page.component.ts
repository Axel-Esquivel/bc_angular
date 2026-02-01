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
import { OrganizationsService } from '../../../../core/api/organizations-api.service';
import { Country } from '../../../../shared/models/country.model';
import { Currency } from '../../../../shared/models/currency.model';
import { OrgSetupComponentsModule } from '../../components/org-setup-components.module';

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
  private readonly countriesApi = inject(CountriesApiService);
  private readonly currenciesApi = inject(CurrenciesApiService);
  private readonly organizationsApi = inject(OrganizationsService);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);

  countries: SelectOption[] = [];
  currencies: SelectOption[] = [];

  readonly form = this.fb.group({
    name: this.fb.nonNullable.control('', [Validators.required, Validators.minLength(2)]),
    countryId: this.fb.control<string | null>(null),
    currencyId: this.fb.control<string | null>(null),
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
              symbol: currency.symbol,
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
    if (this.isSubmitting) {
      return;
    }

    if (!this.form.value.name?.trim()) {
      this.form.controls.name.markAsTouched();
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'El nombre de la organizacion es obligatorio.',
      });
      return;
    }

    if (this.countries.length === 0) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Debes crear al menos un pais antes de crear la organizacion.',
      });
      return;
    }

    if (this.currencies.length === 0) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Debes crear al menos una moneda antes de crear la organizacion.',
      });
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    const formValue = this.form.getRawValue();
    const payload = {
      name: formValue.name.trim(),
      countryIds: formValue.countryId ? [formValue.countryId] : undefined,
      currencyIds: formValue.currencyId ? [formValue.currencyId] : undefined,
    };

    this.organizationsApi
      .create(payload)
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.isSubmitting = false;
          this.form.reset({ name: '', countryId: null, currencyId: null });
          this.messageService.add({
            severity: 'success',
            summary: 'Listo',
            detail: 'Organizacion creada.',
          });
          this.router.navigateByUrl('/org/setup', { state: { refresh: true } });
        },
        error: () => {
          this.isSubmitting = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo crear la organizacion.',
          });
        },
      });
  }
}

interface SelectOption {
  id: string;
  name: string;
  code?: string;
  symbol?: string;
}
