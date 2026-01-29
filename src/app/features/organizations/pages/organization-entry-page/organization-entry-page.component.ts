import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';

import { AuthService } from '../../../../core/auth/auth.service';
import { CountriesApiService } from '../../../../core/api/countries-api.service';
import { CurrenciesApiService } from '../../../../core/api/currencies-api.service';
import { OrganizationsService } from '../../../../core/api/organizations-api.service';
import { IOrganization } from '../../../../shared/models/organization.model';

interface SelectOption {
  id: string;
  name: string;
}

type IdObject = { _id: string };
type IdLike = string | IdObject | null | undefined;
type IdLikeList = IdLike | IdLike[];

@Component({
  selector: 'app-organization-entry-page',
  templateUrl: './organization-entry-page.component.html',
  styleUrl: './organization-entry-page.component.scss',
  standalone: false,
  providers: [MessageService],
})
export class OrganizationEntryPageComponent implements OnInit {
  joinForm: FormGroup<{
    email: FormControl<string>;
    orgCode: FormControl<string>;
  }>;
  createForm: FormGroup<{
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
  organizations: IOrganization[] = [];
  submitting = false;
  createDialogOpen = false;
  createCountryDialogOpen = false;
  createCurrencyDialogOpen = false;
  savingCountry = false;
  savingCurrency = false;
  countryOptions: SelectOption[] = [];
  currencyOptions: SelectOption[] = [];

  constructor(
    private readonly organizationsApi: OrganizationsService,
    private readonly countriesApi: CountriesApiService,
    private readonly currenciesApi: CurrenciesApiService,
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly fb: FormBuilder,
    private readonly messageService: MessageService,
  ) {
    this.joinForm = this.fb.nonNullable.group({
      email: ['', [Validators.required, Validators.email]],
      orgCode: ['', [Validators.required, Validators.minLength(4)]],
    });
    this.createForm = this.fb.nonNullable.group({
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
    const email = this.authService.getCurrentUser()?.email ?? '';
    if (email) {
      this.joinForm.patchValue({ email });
    }

    this.organizationsApi.list().subscribe({
      next: (res) => {
        this.organizations = res?.result ?? [];
      },
      error: () => {
        this.organizations = [];
      },
    });

    this.loadCountries();
    this.loadCurrencies();
  }

  openCreateDialog(): void {
    this.createForm.reset({ name: '', countryIds: [], currencyIds: [] });
    this.createDialogOpen = true;
  }

  submitJoinRequest(): void {
    if (this.joinForm.invalid || this.submitting) {
      this.joinForm.markAllAsTouched();
      return;
    }

    this.submitting = true;
    const payload = this.joinForm.getRawValue();
    this.organizationsApi.joinRequest({
      email: payload.email.trim(),
      orgCode: payload.orgCode.trim().toUpperCase(),
    }).subscribe({
      next: () => {
        this.submitting = false;
        this.router.navigateByUrl('/organizations/pending');
      },
      error: (error) => {
        this.submitting = false;
        const message = error?.error?.message;
        const detail =
          message === 'Organization not found'
            ? 'No encontramos una organizacion con ese codigo.'
            : message === 'Email does not match requester'
              ? 'El correo no coincide con tu usuario.'
              : 'No se pudo enviar la solicitud.';
        this.messageService.add({
          severity: 'error',
          summary: 'Unirse a organizacion',
          detail,
        });
      },
    });
  }

  createOrganization(): void {
    if (this.createForm.invalid || this.submitting) {
      this.createForm.markAllAsTouched();
      return;
    }

    this.submitting = true;
    const payload = this.createForm.getRawValue();
    this.organizationsApi.create({
      name: payload.name.trim(),
      countryIds: this.normalizeIdList(payload.countryIds),
      currencyIds: this.normalizeIdList(payload.currencyIds),
    }).subscribe({
      next: (res) => {
        const organization = res?.result ?? null;
        if (!organization?.id) {
          this.submitting = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Organizaciones',
            detail: 'No se pudo crear la organizacion.',
          });
          return;
        }

        this.organizations = [organization, ...this.organizations.filter((item) => item.id !== organization.id)];
        this.organizationsApi.setDefaultOrganization(organization.id).subscribe({
          next: () => {
            this.authService.refreshToken().subscribe({
              next: () => {
                this.submitting = false;
                this.createDialogOpen = false;
                this.router.navigateByUrl('/onboarding');
              },
              error: () => {
                this.submitting = false;
                this.createDialogOpen = false;
                this.router.navigateByUrl('/onboarding');
              },
            });
          },
          error: () => {
            this.submitting = false;
            this.createDialogOpen = false;
            this.router.navigateByUrl('/onboarding');
          },
        });
      },
      error: (error) => {
        this.submitting = false;
        const status = error?.status;
        const message = error?.error?.message ?? 'No se pudo crear la organizacion.';
        const detail = status ? `${status} - ${message}` : message;
        this.messageService.add({
          severity: 'error',
          summary: 'Organizaciones',
          detail,
        });
      },
    });
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
    const current = this.createForm.controls.countryIds.value;
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
          this.createForm.controls.countryIds.setValue(next);
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
    const current = this.createForm.controls.currencyIds.value;
    this.currenciesApi.list().subscribe({
      next: ({ result }) => {
        const currencies = result ?? [];
        this.currencyOptions = currencies.map((currency) => ({
          id: currency.id ?? currency.code,
          name: currency.code && currency.name ? `${currency.code} - ${currency.name}` : currency.code || currency.name,
        }));
        if (selectId) {
          const next = this.normalizeIdList([...current, selectId]);
          this.createForm.controls.currencyIds.setValue(next);
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
