import { Location } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';

import { CompaniesApiService } from '../../../../core/api/companies-api.service';
import { CountriesApiService } from '../../../../core/api/countries-api.service';
import { OrganizationsService } from '../../../../core/api/organizations-api.service';
import { CompanyStateService } from '../../../../core/company/company-state.service';
import { Company } from '../../../../shared/models/company.model';
import { Country } from '../../../../shared/models/country.model';
import { IOrganization } from '../../../../shared/models/organization.model';

@Component({
  selector: 'app-company-selector',
  templateUrl: './company-selector.component.html',
  styleUrl: './company-selector.component.scss',
  providers: [MessageService],
  standalone: false,
})
export class CompanySelectorComponent implements OnInit {
  organizations: IOrganization[] = [];
  companies: Company[] = [];
  selectedOrganization: IOrganization | null = null;
  selectedCompany: Company | null = null;
  loadingOrganizations = false;
  loadingCompanies = false;

  createOrganizationDialogOpen = false;
  createCompanyDialogOpen = false;
  submitting = false;

  countryOptions: Array<{ label: string; value: string }> = [];
  readonly currencyOptions: Array<{ label: string; value: string }> = [
    { label: 'USD', value: 'USD' },
    { label: 'EUR', value: 'EUR' },
    { label: 'COP', value: 'COP' },
  ];

  private backUrl = '/dashboard';

  createOrganizationForm!: FormGroup<{
    name: FormControl<string>;
  }>;

  createCompanyForm!: FormGroup<{
    name: FormControl<string>;
    baseCountryId: FormControl<string>;
    baseCurrencyId: FormControl<string>;
  }>;

  constructor(
    private readonly organizationsApi: OrganizationsService,
    private readonly companiesApi: CompaniesApiService,
    private readonly countriesApi: CountriesApiService,
    private readonly companyState: CompanyStateService,
    private readonly router: Router,
    private readonly location: Location,
    private readonly fb: FormBuilder,
    private readonly messageService: MessageService,
  ) {
    this.createOrganizationForm = this.fb.nonNullable.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
    });

    this.createCompanyForm = this.fb.nonNullable.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      baseCountryId: ['', [Validators.required]],
      baseCurrencyId: ['', [Validators.required]],
    });

    const nav = this.router.getCurrentNavigation();
    const previousUrl = nav?.previousNavigation?.finalUrl?.toString();
    if (previousUrl?.startsWith('/organizations')) {
      this.backUrl = '/organizations';
    } else if (previousUrl) {
      this.backUrl = previousUrl;
    }
  }

  ngOnInit(): void {
    this.loadOrganizations();
    this.loadCountries();
    if (!this.createCompanyForm.controls.baseCurrencyId.value) {
      this.createCompanyForm.controls.baseCurrencyId.setValue(this.currencyOptions[0]?.value ?? '');
    }
  }

  onOrganizationChange(): void {
    this.selectedCompany = null;
    if (!this.selectedOrganization?.id) {
      this.companies = [];
      return;
    }
    this.loadCompanies(this.selectedOrganization.id);
  }

  selectCompany(): void {
    const companyId = this.selectedCompany?.id;
    if (!companyId) {
      return;
    }
    this.companyState.setActiveCompanyId(companyId);
    if (!this.companyState.getDefaultCompanyId()) {
      this.companyState.setDefaultCompanyId(companyId);
    }
    this.router.navigateByUrl(`/company/${companyId}/dashboard`);
  }

  goBack(): void {
    if (window.history.length > 1) {
      this.location.back();
      return;
    }
    this.router.navigateByUrl(this.backUrl);
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

  openCreateCompanyDialog(): void {
    if (!this.selectedOrganization?.id) {
      return;
    }
    this.createCompanyForm.reset({
      name: '',
      baseCountryId: this.createCompanyForm.controls.baseCountryId.value ?? '',
      baseCurrencyId: this.createCompanyForm.controls.baseCurrencyId.value ?? this.currencyOptions[0]?.value ?? '',
    });
    if (!this.createCompanyForm.controls.baseCurrencyId.value) {
      this.createCompanyForm.controls.baseCurrencyId.setValue(this.currencyOptions[0]?.value ?? '');
    }
    if (!this.createCompanyForm.controls.baseCountryId.value && this.countryOptions.length > 0) {
      this.createCompanyForm.controls.baseCountryId.setValue(this.countryOptions[0].value);
    }
    this.createCompanyDialogOpen = true;
  }

  createCompany(): void {
    if (this.createCompanyForm.invalid || this.submitting || !this.selectedOrganization?.id) {
      this.createCompanyForm.markAllAsTouched();
      return;
    }

    this.submitting = true;
    const payload = this.createCompanyForm.getRawValue();
    this.companiesApi
      .create(this.selectedOrganization.id, {
        name: payload.name,
        baseCountryId: payload.baseCountryId,
        baseCurrencyId: payload.baseCurrencyId,
        currencies: [],
      })
      .subscribe({
        next: (res) => {
          const result = res?.result;
          if (result) {
            this.companies = [result, ...this.companies];
            this.selectedCompany = result;
          }
          this.createCompanyDialogOpen = false;
          this.submitting = false;
        },
        error: () => {
          this.submitting = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Companias',
            detail: 'No se pudo crear la compania.',
          });
        },
      });
  }

  private loadOrganizations(): void {
    this.loadingOrganizations = true;
    this.organizationsApi.list().subscribe({
      next: (res) => {
        const result = res?.result ?? [];
        this.organizations = result;
        this.loadingOrganizations = false;
        const preferredId = this.selectedOrganization?.id ?? '';
        const selected =
          (preferredId && this.organizations.find((org) => org.id === preferredId)) ||
          this.organizations[0] ||
          null;
        this.selectedOrganization = selected;
        if (this.selectedOrganization?.id) {
          this.loadCompanies(this.selectedOrganization.id);
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

  private loadCompanies(orgId: string): void {
    this.loadingCompanies = true;
    this.companiesApi.listByOrganization(orgId).subscribe({
      next: (res) => {
        this.companies = res?.result ?? [];
        this.loadingCompanies = false;
      },
      error: () => {
        this.loadingCompanies = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Companias',
          detail: 'No se pudieron cargar las companias.',
        });
      },
    });
  }

  private loadCountries(): void {
    this.countriesApi.list().subscribe({
      next: (res) => {
        const countries = res?.result ?? [];
        this.countryOptions = countries.map((country: Country) => ({
          label: `${country.nameEs} (${country.iso2})`,
          value: country.iso2,
        }));
        if (!this.createCompanyForm.controls.baseCountryId.value && this.countryOptions.length > 0) {
          this.createCompanyForm.controls.baseCountryId.setValue(this.countryOptions[0].value);
        }
      },
      error: () => {
        this.countryOptions = [];
        this.messageService.add({
          severity: 'warn',
          summary: 'Paises',
          detail: 'No se pudieron cargar los paises.',
        });
      },
    });
  }
}
