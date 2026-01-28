import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';

import { CompaniesApiService } from '../../../../core/api/companies-api.service';
import { OrganizationsService } from '../../../../core/api/organizations-api.service';
import { IOrganization } from '../../../../shared/models/organization.model';
import { CreateOrganizationCompanyDto } from '../../../../shared/models/organization-company.model';
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
  organizations: IOrganization[] = [];
  selectedOrganization: IOrganization | null = null;
  coreSettings: OrganizationCoreSettings = {
    countries: [],
    currencies: [],
    companies: [],
  };
  selectedCountry: CoreCountry | null = null;
  selectedCurrency: CoreCurrency | null = null;
  selectedCompany: CoreCompany | null = null;

  loadingOrganizations = false;
  loadingCoreSettings = false;

  createOrganizationDialogOpen = false;
  createCountryDialogOpen = false;
  createCurrencyDialogOpen = false;
  createCompanyDialogOpen = false;
  submitting = false;

  createOrganizationForm: FormGroup<{
    name: FormControl<string>;
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

  createCompanyForm: FormGroup<{
    name: FormControl<string>;
    countryId: FormControl<string>;
    baseCurrencyId: FormControl<string>;
  }>;

  constructor(
    private readonly companiesApi: CompaniesApiService,
    private readonly organizationsApi: OrganizationsService,
    private readonly organizationCoreApi: OrganizationCoreApiService,
    private readonly router: Router,
    private readonly fb: FormBuilder,
    private readonly messageService: MessageService,
  ) {
    this.createOrganizationForm = this.fb.nonNullable.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
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

    this.createCompanyForm = this.fb.nonNullable.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      countryId: ['', [Validators.required]],
      baseCurrencyId: ['', [Validators.required]],
    });
  }

  ngOnInit(): void {
    this.loadOrganizations();
  }

  onOrganizationChange(): void {
    if (this.selectedOrganization?.id) {
      this.loadCoreSettings(this.selectedOrganization.id);
      return;
    }
    this.resetCoreSettings();
  }

  openCreateOrganizationDialog(): void {
    this.createOrganizationForm.reset();
    this.createOrganizationDialogOpen = true;
  }

  createOrganization(): void {
    if (this.createOrganizationForm.invalid || this.submitting) {
      this.createOrganizationForm.markAllAsTouched();
      return;
    }

    this.submitting = true;
    const payload = this.createOrganizationForm.getRawValue();
    this.organizationsApi.create({ name: payload.name }).subscribe({
      next: (res) => {
        const result = res?.result;
        if (result) {
          this.organizations = [result, ...this.organizations];
          this.selectedOrganization = result;
          this.onOrganizationChange();
        }
        this.createOrganizationDialogOpen = false;
        this.submitting = false;
      },
      error: () => {
        this.submitting = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Organizaciones',
          detail: 'No se pudo crear la organizacion.',
        });
      },
    });
  }

  openCreateCountryDialog(): void {
    this.createCountryForm.reset();
    this.createCountryDialogOpen = true;
  }

  saveCountry(): void {
    if (this.createCountryForm.invalid || this.submitting || !this.selectedOrganization?.id) {
      this.createCountryForm.markAllAsTouched();
      return;
    }

    this.submitting = true;
    const payload = this.createCountryForm.getRawValue();
    this.organizationCoreApi.addCountry(this.selectedOrganization.id, {
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
    if (this.createCurrencyForm.invalid || this.submitting || !this.selectedOrganization?.id) {
      this.createCurrencyForm.markAllAsTouched();
      return;
    }

    this.submitting = true;
    const payload = this.createCurrencyForm.getRawValue();
    this.organizationCoreApi.addCurrency(this.selectedOrganization.id, {
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
    if (!this.selectedOrganization?.id) {
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
    if (this.createCompanyForm.invalid || this.submitting || !this.selectedOrganization?.id) {
      this.createCompanyForm.markAllAsTouched();
      return;
    }

    this.submitting = true;
    const payload = this.createCompanyForm.getRawValue();
    const companyPayload: CreateOrganizationCompanyDto = {
      name: payload.name.trim(),
      baseCountryId: payload.countryId,
      baseCurrencyId: payload.baseCurrencyId,
    };
    this.companiesApi.create(this.selectedOrganization.id, companyPayload).subscribe({
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
    if (!this.selectedOrganization?.id || this.submitting) {
      return;
    }

    this.submitting = true;
    const payload = this.buildCoreUpdatePayload();
    this.organizationCoreApi.updateCoreSettings(this.selectedOrganization.id, payload).subscribe({
      next: () => {
        this.submitting = false;
        this.router.navigate(['/organizations/modules'], {
          queryParams: { orgId: this.selectedOrganization?.id },
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

  private loadOrganizations(): void {
    this.loadingOrganizations = true;
    this.organizationsApi.list().subscribe({
      next: (res) => {
        const result = res?.result ?? [];
        this.organizations = result;
        this.loadingOrganizations = false;
        this.selectedOrganization = this.organizations[0] ?? null;
        if (this.selectedOrganization?.id) {
          this.loadCoreSettings(this.selectedOrganization.id);
        } else {
          this.resetCoreSettings();
        }
      },
      error: () => {
        this.loadingOrganizations = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Organizaciones',
          detail: 'No se pudieron cargar las organizaciones.',
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
