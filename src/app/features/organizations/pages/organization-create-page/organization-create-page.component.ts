import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';

import { CountriesApiService } from '../../../../core/api/countries-api.service';
import { CurrenciesApiService } from '../../../../core/api/currencies-api.service';
import { OrganizationsService } from '../../../../core/api/organizations-api.service';

interface SelectOption {
  id: string;
  name: string;
}

type IdObject = { _id: string };
type IdLike = string | IdObject | null | undefined;
type IdLikeList = IdLike | IdLike[];

@Component({
  selector: 'app-organization-create-page',
  templateUrl: './organization-create-page.component.html',
  styleUrl: './organization-create-page.component.scss',
  providers: [MessageService],
  standalone: false,
})
export class OrganizationCreatePageComponent implements OnInit {
  submitting = false;
  countryOptions: SelectOption[] = [];
  currencyOptions: SelectOption[] = [];
  createCountryDialogOpen = false;
  createCurrencyDialogOpen = false;
  savingCountry = false;
  savingCurrency = false;

  form!: FormGroup<{
    name: FormControl<string>;
    countryIds: FormControl<string[]>;
    currencyIds: FormControl<string[]>;
  }>;

  createCountryForm: FormGroup<{
    code: FormControl<string>;
    name: FormControl<string>;
  }>;

  createCurrencyForm: FormGroup<{
    code: FormControl<string>;
    name: FormControl<string>;
    symbol: FormControl<string>;
  }>;

  constructor(
    private readonly organizationsApi: OrganizationsService,
    private readonly countriesApi: CountriesApiService,
    private readonly currenciesApi: CurrenciesApiService,
    private readonly fb: FormBuilder,
    private readonly router: Router,
    private readonly messageService: MessageService,
  ) {
    this.form = this.fb.nonNullable.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      countryIds: this.fb.nonNullable.control<string[]>([]),
      currencyIds: this.fb.nonNullable.control<string[]>([]),
    });

    this.createCountryForm = this.fb.nonNullable.group({
      code: ['', [Validators.required, Validators.minLength(2)]],
      name: ['', [Validators.required, Validators.minLength(2)]],
    });

    this.createCurrencyForm = this.fb.nonNullable.group({
      code: ['', [Validators.required, Validators.minLength(2)]],
      name: ['', [Validators.required, Validators.minLength(2)]],
      symbol: [''],
    });
  }

  ngOnInit(): void {
    this.loadCountries();
    this.loadCurrencies();
  }

  submit(): void {
    if (this.form.invalid || this.submitting) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting = true;
    const payload = this.form.getRawValue();
    this.organizationsApi.create({
      name: payload.name.trim(),
      countryIds: this.normalizeIdList(payload.countryIds),
      currencyIds: this.normalizeIdList(payload.currencyIds),
    }).subscribe({
      next: () => {
        this.submitting = false;
        this.router.navigateByUrl('/organizations');
      },
      error: () => {
        this.submitting = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Organizacion',
          detail: 'No se pudo crear la organizacion.',
        });
      },
    });
  }

  cancel(): void {
    this.router.navigateByUrl('/organizations');
  }

  openCreateCountryDialog(): void {
    this.createCountryForm.reset({ code: '', name: '' });
    this.createCountryDialogOpen = true;
  }

  saveCountry(): void {
    if (this.createCountryForm.invalid || this.savingCountry) {
      this.createCountryForm.markAllAsTouched();
      return;
    }

    this.savingCountry = true;
    const payload = this.createCountryForm.getRawValue();
    this.countriesApi.create({
      code: payload.code.trim().toUpperCase(),
      name: payload.name.trim(),
    }).subscribe({
      next: (res) => {
        const country = res?.result;
        const id = country?.id ?? country?.iso2 ?? payload.code.trim().toUpperCase();
        this.loadCountries(id);
        this.createCountryDialogOpen = false;
        this.savingCountry = false;
      },
      error: () => {
        this.savingCountry = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Paises',
          detail: 'No se pudo crear el pais.',
        });
      },
    });
  }

  openCreateCurrencyDialog(): void {
    this.createCurrencyForm.reset({ code: '', name: '', symbol: '' });
    this.createCurrencyDialogOpen = true;
  }

  saveCurrency(): void {
    if (this.createCurrencyForm.invalid || this.savingCurrency) {
      this.createCurrencyForm.markAllAsTouched();
      return;
    }

    this.savingCurrency = true;
    const payload = this.createCurrencyForm.getRawValue();
    this.currenciesApi.create({
      code: payload.code.trim().toUpperCase(),
      name: payload.name.trim(),
      symbol: payload.symbol.trim() || undefined,
    }).subscribe({
      next: (res) => {
        const currency = res?.result;
        const id = currency?.id ?? currency?.code ?? payload.code.trim().toUpperCase();
        this.loadCurrencies(id);
        this.createCurrencyDialogOpen = false;
        this.savingCurrency = false;
      },
      error: () => {
        this.savingCurrency = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Monedas',
          detail: 'No se pudo crear la moneda.',
        });
      },
    });
  }

  private loadCountries(selectId?: string): void {
    const current = this.form.controls.countryIds.value;
    this.countriesApi.list().subscribe({
      next: ({ result }) => {
        const countries = result ?? [];
        this.countryOptions = countries.map((country) => {
          const label = country.nameEs || country.nameEn || country.iso2;
          const suffix = country.iso2 && label !== country.iso2 ? ` (${country.iso2})` : '';
          return {
            id: country.id ?? country.iso2,
            name: `${label}${suffix}`,
          };
        });
        if (selectId) {
          const next = this.normalizeIdList([...current, selectId]);
          this.form.controls.countryIds.setValue(next);
        }
      },
      error: () => {
        this.countryOptions = [];
        this.messageService.add({
          severity: 'error',
          summary: 'Paises',
          detail: 'No se pudieron cargar los paises.',
        });
      },
    });
  }

  private loadCurrencies(selectId?: string): void {
    const current = this.form.controls.currencyIds.value;
    this.currenciesApi.list().subscribe({
      next: ({ result }) => {
        const currencies = result ?? [];
        this.currencyOptions = currencies.map((currency) => ({
          id: currency.id ?? currency.code,
          name: currency.code && currency.name ? `${currency.code} - ${currency.name}` : currency.code || currency.name,
        }));
        if (selectId) {
          const next = this.normalizeIdList([...current, selectId]);
          this.form.controls.currencyIds.setValue(next);
        }
      },
      error: () => {
        this.currencyOptions = [];
        this.messageService.add({
          severity: 'error',
          summary: 'Monedas',
          detail: 'No se pudieron cargar las monedas.',
        });
      },
    });
  }

  private normalizeIdList(input: IdLikeList): string[] {
    if (!input) {
      return [];
    }
    const list = Array.isArray(input) ? input : [input];
    const normalized = list
      .map((item) => {
        if (typeof item === 'string') {
          return item.trim();
        }
        if (item && typeof item === 'object' && '_id' in item) {
          const value = item._id;
          return typeof value === 'string' ? value.trim() : '';
        }
        return '';
      })
      .filter((item) => item.length > 0);
    return Array.from(new Set(normalized));
  }
}
