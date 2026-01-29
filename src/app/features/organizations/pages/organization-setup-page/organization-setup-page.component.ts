import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';

import { CompaniesApiService } from '../../../../core/api/companies-api.service';
import { OrganizationsService } from '../../../../core/api/organizations-api.service';
import { ActiveContextStateService } from '../../../../core/context/active-context-state.service';
import {
  CreateOrganizationCompanyDto,
  OrganizationCompanyEnterpriseInput,
} from '../../../../shared/models/organization-company.model';
import { OrganizationCoreApiService } from '../../services/organization-core-api.service';
import {
  CoreCompany,
  CoreCountry,
  CoreCurrency,
  OrganizationCoreSettings,
  OrganizationCoreSettingsUpdatePayload,
} from '../../models/organization-core.models';

@Component({
  selector: 'app-organization-setup-page',
  templateUrl: './organization-setup-page.component.html',
  styleUrls: ['./organization-setup-page.component.scss'],
  standalone: false,
  providers: [MessageService],
})
export class OrganizationSetupPageComponent implements OnInit {
  organizationId: string | null = null;
  organizationName: string | null = null;
  coreSettings: OrganizationCoreSettings = {
    countries: [],
    currencies: [],
    companies: [],
  };
  selectedCountry: CoreCountry | null = null;
  selectedCurrency: CoreCurrency | null = null;
  selectedCompany: CoreCompany | null = null;

  loadingOrganization = false;
  loadingCoreSettings = false;

  createCountryDialogOpen = false;
  createCurrencyDialogOpen = false;
  createCompanyDialogOpen = false;
  submitting = false;

  createCountryForm: FormGroup<{
    code: FormControl<string>;
    name: FormControl<string>;
  }>;

  createCurrencyForm: FormGroup<{
    code: FormControl<string>;
    name: FormControl<string>;
    symbol: FormControl<string>;
  }>;

  createCompanyForm: FormGroup<{
    name: FormControl<string>;
    countryId: FormControl<string>;
    baseCurrencyId: FormControl<string>;
  }>;

  constructor(
    private readonly companiesApi: CompaniesApiService,
    private readonly organizationsApi: OrganizationsService,
    private readonly organizationCoreApi: OrganizationCoreApiService,
    private readonly activeContextState: ActiveContextStateService,
    private readonly router: Router,
    private readonly fb: FormBuilder,
    private readonly messageService: MessageService,
  ) {
    this.createCountryForm = this.fb.nonNullable.group({
      code: ['', [Validators.required, Validators.minLength(2)]],
      name: ['', [Validators.required, Validators.minLength(2)]],
    });

    this.createCurrencyForm = this.fb.nonNullable.group({
      code: ['', [Validators.required, Validators.minLength(2)]],
      name: ['', [Validators.required, Validators.minLength(2)]],
      symbol: [''],
    });

    this.createCompanyForm = this.fb.nonNullable.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      countryId: ['', [Validators.required]],
      baseCurrencyId: ['', [Validators.required]],
    });
  }

  ngOnInit(): void {
    const context = this.activeContextState.getActiveContext();
    this.organizationId = context.organizationId;
    if (!this.organizationId) {
      this.router.navigateByUrl('/organizations/select');
      return;
    }

    this.loadOrganization(this.organizationId);
    this.loadCoreSettings(this.organizationId);
  }

  openCreateCountryDialog(): void {
    this.createCountryForm.reset();
    this.createCountryDialogOpen = true;
  }

  saveCountry(): void {
    if (this.createCountryForm.invalid || this.submitting || !this.organizationId) {
      this.createCountryForm.markAllAsTouched();
      return;
    }

    this.submitting = true;
    const payload = this.createCountryForm.getRawValue();
    this.organizationCoreApi.addCountry(this.organizationId, {
      code: payload.code.trim().toUpperCase(),
      name: payload.name.trim(),
    }).subscribe({
      next: (res) => {
        const result = res?.result;
        if (result) {
          this.coreSettings = {
            ...this.coreSettings,
            countries: [result, ...this.coreSettings.countries],
          };
          this.selectedCountry = result;
        }
        this.createCountryDialogOpen = false;
        this.submitting = false;
      },
      error: () => {
        this.submitting = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Paises',
          detail: 'No se pudo crear el pais.',
        });
      },
    });
  }

  openCreateCurrencyDialog(): void {
    this.createCurrencyForm.reset();
    this.createCurrencyDialogOpen = true;
  }

  saveCurrency(): void {
    if (this.createCurrencyForm.invalid || this.submitting || !this.organizationId) {
      this.createCurrencyForm.markAllAsTouched();
      return;
    }

    this.submitting = true;
    const payload = this.createCurrencyForm.getRawValue();
    this.organizationCoreApi.addCurrency(this.organizationId, {
      code: payload.code.trim().toUpperCase(),
      name: payload.name.trim(),
      symbol: payload.symbol?.trim() || undefined,
    }).subscribe({
      next: (res) => {
        const result = res?.result;
        if (result) {
          this.coreSettings = {
            ...this.coreSettings,
            currencies: [result, ...this.coreSettings.currencies],
          };
          this.selectedCurrency = result;
        }
        this.createCurrencyDialogOpen = false;
        this.submitting = false;
      },
      error: () => {
        this.submitting = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Monedas',
          detail: 'No se pudo crear la moneda.',
        });
      },
    });
  }

  openCreateCompanyDialog(): void {
    if (!this.organizationId) {
      return;
    }
    const baseCountryId = this.selectedCountry?.id ?? this.coreSettings.countries[0]?.id ?? '';
    const baseCurrencyId = this.selectedCurrency?.id ?? this.coreSettings.currencies[0]?.id ?? '';
    this.createCompanyForm.reset({
      name: '',
      countryId: baseCountryId,
      baseCurrencyId,
    });
    this.createCompanyDialogOpen = true;
  }

  createCompany(): void {
    if (this.createCompanyForm.invalid || this.submitting || !this.organizationId) {
      this.createCompanyForm.markAllAsTouched();
      return;
    }

    this.submitting = true;
    const payload = this.createCompanyForm.getRawValue();
    const enterprisePayload: OrganizationCompanyEnterpriseInput = {
      name: payload.name.trim(),
      countryId: payload.countryId,
      currencyIds: [payload.baseCurrencyId],
      defaultCurrencyId: payload.baseCurrencyId,
    };
    const companyPayload: CreateOrganizationCompanyDto = {
      name: payload.name.trim(),
      baseCountryId: payload.countryId,
      baseCurrencyId: payload.baseCurrencyId,
      operatingCountryIds: [payload.countryId],
      enterprises: [enterprisePayload],
    };
    this.companiesApi.create(this.organizationId, companyPayload).subscribe({
      next: (res) => {
        const result = res?.result;
        if (result) {
          this.coreSettings = {
            ...this.coreSettings,
            companies: [
              { id: result.id ?? '', name: result.name, countryId: result.baseCountryId },
              ...this.coreSettings.companies,
            ],
          };
          this.selectedCompany = {
            id: result.id ?? '',
            name: result.name,
            countryId: result.baseCountryId,
          };
        }
        this.createCompanyDialogOpen = false;
        this.submitting = false;
      },
      error: (error) => {
        this.submitting = false;
        const message = error?.error?.message;
        this.messageService.add({
          severity: 'error',
          summary: 'Companias',
          detail: typeof message === 'string' ? message : 'No se pudo crear la compania.',
        });
      },
    });
  }

  saveAndContinue(): void {
    if (!this.organizationId || this.submitting) {
      return;
    }

    this.submitting = true;
    const payload = this.buildCoreUpdatePayload();
    this.organizationCoreApi.updateCoreSettings(this.organizationId, payload).subscribe({
      next: () => {
        this.submitting = false;
        this.router.navigate(['/organizations/modules'], {
          queryParams: { orgId: this.organizationId ?? '' },
        });
      },
      error: () => {
        this.submitting = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Configuracion',
          detail: 'No se pudo guardar la configuracion base.',
        });
      },
    });
  }

  getCountryLabel(country: CoreCountry | null | undefined): string {
    if (!country) {
      return '';
    }
    return country.code ? `${country.name} (${country.code})` : country.name;
  }

  getCurrencyLabel(currency: CoreCurrency | null | undefined): string {
    if (!currency) {
      return '';
    }
    if (currency.code && currency.name) {
      return `${currency.code} - ${currency.name}`;
    }
    return currency.code || currency.name || '';
  }

  getCompanyCountryLabel(company: CoreCompany | null | undefined): string {
    if (!company) {
      return '';
    }
    const match = this.coreSettings.countries.find((country) => country.id === company.countryId);
    return match ? match.name : company.countryId;
  }

  private loadOrganization(organizationId: string): void {
    this.loadingOrganization = true;
    this.organizationsApi.getById(organizationId).subscribe({
      next: (res) => {
        this.organizationName = res?.result?.name ?? null;
        this.loadingOrganization = false;
      },
      error: () => {
        this.loadingOrganization = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Organizaciones',
          detail: 'No se pudo cargar la organizacion.',
        });
      },
    });
  }

  private loadCoreSettings(organizationId: string): void {
    this.loadingCoreSettings = true;
    this.organizationCoreApi.getCoreSettings(organizationId).subscribe({
      next: (res) => {
        this.coreSettings = res?.result ?? this.emptyCoreSettings();
        this.loadingCoreSettings = false;
        this.setDefaultSelections();
      },
      error: () => {
        this.loadingCoreSettings = false;
        this.resetCoreSettings();
        this.messageService.add({
          severity: 'error',
          summary: 'Configuracion',
          detail: 'No se pudo cargar la configuracion base.',
        });
      },
    });
  }

  private resetCoreSettings(): void {
    this.coreSettings = this.emptyCoreSettings();
    this.selectedCountry = null;
    this.selectedCurrency = null;
    this.selectedCompany = null;
  }

  private emptyCoreSettings(): OrganizationCoreSettings {
    return {
      countries: [],
      currencies: [],
      companies: [],
    };
  }

  private setDefaultSelections(): void {
    this.selectedCountry = this.coreSettings.countries[0] ?? null;
    this.selectedCurrency = this.coreSettings.currencies[0] ?? null;
    this.selectedCompany = this.coreSettings.companies[0] ?? null;
  }

  private buildCoreUpdatePayload(): OrganizationCoreSettingsUpdatePayload {
    return {
      countries: this.coreSettings.countries.map((country) => ({
        id: country.id,
        name: country.name,
        code: country.code,
      })),
      currencies: this.coreSettings.currencies.map((currency) => ({
        id: currency.id,
        name: currency.name,
        code: currency.code,
        symbol: currency.symbol,
      })),
      companies: this.coreSettings.companies.map((company) => ({
        id: company.id,
        name: company.name,
        countryId: company.countryId,
      })),
    };
  }
}
