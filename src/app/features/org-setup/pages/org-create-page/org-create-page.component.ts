import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
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

  readonly countryForm = this.fb.nonNullable.group({
    iso2: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(2)]],
    iso3: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(3)]],
    nameEs: ['', [Validators.required, Validators.minLength(2)]],
    nameEn: ['', [Validators.required, Validators.minLength(2)]],
    phoneCode: [''],
  });

  readonly currencyForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    code: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(6)]],
    symbol: [''],
  });

  isSubmitting = false;
  isCountryDialogOpen = false;
  isCurrencyDialogOpen = false;

  ngOnInit(): void {
    this.loadCountries();
    this.loadCurrencies();
  }

  private loadCountries(): void {
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

  private loadCurrencies(): void {
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
    this.countryForm.reset({ iso2: '', iso3: '', nameEs: '', nameEn: '', phoneCode: '' });
    this.isCountryDialogOpen = true;
  }

  closeCountryDialog(): void {
    this.isCountryDialogOpen = false;
  }

  openCreateCurrencyDialog(): void {
    this.currencyForm.reset({ name: '', code: '', symbol: '' });
    this.isCurrencyDialogOpen = true;
  }

  closeCurrencyDialog(): void {
    this.isCurrencyDialogOpen = false;
  }

  createCountry(): void {
    if (this.countryForm.invalid) {
      this.countryForm.markAllAsTouched();
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Completa los datos del pais.' });
      return;
    }

    const { iso2, iso3, nameEs, nameEn, phoneCode } = this.countryForm.getRawValue();
    const trimmedIso2 = iso2.trim().toUpperCase();
    const trimmedIso3 = iso3.trim().toUpperCase();
    const trimmedNameEs = nameEs.trim();
    const trimmedNameEn = nameEn.trim();
    const trimmedPhoneCode = phoneCode.trim();
    if (trimmedIso2.length !== 2 || trimmedIso3.length !== 3) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'ISO2 debe tener 2 letras e ISO3 3 letras.' });
      return;
    }
    if (!trimmedNameEs || !trimmedNameEn) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Nombre ES y EN son obligatorios.' });
      return;
    }
    if (this.countries.some((country) => country.code?.toUpperCase() === trimmedIso2)) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'El codigo ISO2 ya existe.' });
      return;
    }

    this.countriesApi
      .create({
        iso2: trimmedIso2,
        iso3: trimmedIso3,
        nameEs: trimmedNameEs,
        nameEn: trimmedNameEn,
        phoneCode: trimmedPhoneCode || undefined,
      })
      .pipe(take(1))
      .subscribe({
        next: (response) => {
          const country = response?.result;
          if (country) {
            const option: SelectOption = {
              id: (country.id ?? country.iso2 ?? trimmedIso2).toString(),
              name: country.nameEs || country.nameEn || trimmedNameEs,
              code: country.iso2 || trimmedIso2,
            };
            this.countries = [...this.countries, option];
            this.form.controls.countryId.setValue(option.id);
          }
          this.messageService.add({ severity: 'success', summary: 'Listo', detail: 'Pais creado.' });
          this.isCountryDialogOpen = false;
        },
        error: (error) => {
          const status = error instanceof HttpErrorResponse ? error.status : null;
          if (status === 401 || status === 403) {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Sin permisos.' });
            return;
          }
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo crear el pais.' });
        },
      });
  }

  createCurrency(): void {
    if (this.currencyForm.invalid) {
      this.currencyForm.markAllAsTouched();
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Completa el nombre de la moneda.' });
      return;
    }

    const { name, code, symbol } = this.currencyForm.getRawValue();
    const trimmedName = name.trim();
    const trimmedCode = code.trim().toUpperCase();
    if (!trimmedName || trimmedCode.length < 2) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'El codigo debe tener al menos 2 letras.' });
      return;
    }
    if (this.currencies.some((currency) => currency.name.toLowerCase() === trimmedName.toLowerCase())) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'La moneda ya existe.' });
      return;
    }

    this.currenciesApi
      .create({ code: trimmedCode, name: trimmedName, symbol: symbol?.trim() || undefined })
      .pipe(take(1))
      .subscribe({
        next: (response) => {
          const currency = response?.result;
          if (currency) {
            const option: SelectOption = {
              id: (currency.id ?? currency.code ?? trimmedCode).toString(),
              name: currency.name || trimmedName,
              code: currency.code || trimmedCode,
            };
            this.currencies = [...this.currencies, option];
            this.form.controls.currencyId.setValue(option.id);
          }
          this.messageService.add({ severity: 'success', summary: 'Listo', detail: 'Moneda creada.' });
          this.isCurrencyDialogOpen = false;
        },
        error: (error) => {
          const status = error instanceof HttpErrorResponse ? error.status : null;
          if (status === 401 || status === 403) {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Sin permisos.' });
            return;
          }
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo crear la moneda.' });
        },
      });
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
