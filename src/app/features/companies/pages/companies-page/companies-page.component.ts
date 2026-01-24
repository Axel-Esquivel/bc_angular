import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';

import { CompaniesApiService } from '../../../../core/api/companies-api.service';
import { CountriesApiService } from '../../../../core/api/countries-api.service';
import { OrganizationsService } from '../../../../core/api/organizations-api.service';
import { Company } from '../../../../shared/models/company.model';
import { Country } from '../../../../shared/models/country.model';
import { IOrganization } from '../../../../shared/models/organization.model';

@Component({
  selector: 'app-companies-page',
  templateUrl: './companies-page.component.html',
  styleUrl: './companies-page.component.scss',
  providers: [MessageService],
  standalone: false,
})
export class CompaniesPageComponent implements OnInit {
  companies: Company[] = [];
  organization: IOrganization | null = null;
  loading = false;

  createDialogOpen = false;
  submitting = false;

  countryOptions: Array<{ label: string; value: string }> = [];

  readonly currencyOptions: Array<{ label: string; value: string }> = [
    { label: 'USD', value: 'USD' },
    { label: 'EUR', value: 'EUR' },
    { label: 'COP', value: 'COP' },
  ];

  createForm!: FormGroup<{
    name: FormControl<string>;
    legalName: FormControl<string>;
    taxId: FormControl<string>;
    baseCountryId: FormControl<string>;
    baseCurrencyId: FormControl<string>;
    currencies: FormControl<string>;
  }>;

  constructor(
    private readonly companiesApi: CompaniesApiService,
    private readonly countriesApi: CountriesApiService,
    private readonly organizationsApi: OrganizationsService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly fb: FormBuilder,
    private readonly messageService: MessageService,
  ) {
    this.createForm = this.fb.nonNullable.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      legalName: [''],
      taxId: [''],
      baseCountryId: ['', [Validators.required]],
      baseCurrencyId: ['', [Validators.required]],
      currencies: [''],
    });
  }

  ngOnInit(): void {
    const orgId = this.route.snapshot.paramMap.get('orgId');
    if (!orgId) {
      this.router.navigate(['/organizations']);
      return;
    }

    this.loadOrganization(orgId);
    this.loadCompanies(orgId);
    this.loadCountries();
    if (!this.createForm.controls.baseCurrencyId.value) {
      this.createForm.controls.baseCurrencyId.setValue(this.currencyOptions[0]?.value ?? '');
    }
  }

  openCreateDialog(): void {
    this.createDialogOpen = true;
  }

  createCompany(): void {
    if (this.createForm.invalid || this.submitting || !this.organization?.id) {
      this.createForm.markAllAsTouched();
      return;
    }

    this.submitting = true;
    const payload = this.createForm.getRawValue();
    const currencies = payload.currencies
      ? payload.currencies.split(',').map((value) => value.trim()).filter(Boolean)
      : [];

    this.companiesApi
      .create(this.organization.id, {
        name: payload.name,
        legalName: payload.legalName || undefined,
        taxId: payload.taxId || undefined,
        baseCountryId: payload.baseCountryId,
        baseCurrencyId: payload.baseCurrencyId,
        currencies,
      })
      .subscribe({
        next: ({ result }) => {
          if (result) {
            this.companies = [result, ...this.companies];
          }
          this.createDialogOpen = false;
          this.createForm.reset();
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

  private loadOrganization(orgId: string): void {
    this.organizationsApi.getById(orgId).subscribe({
      next: ({ result }) => {
        this.organization = result ?? null;
      },
      error: () => {
        this.organization = null;
        this.messageService.add({
          severity: 'error',
          summary: 'Organizacion',
          detail: 'No se pudo cargar la organizacion.',
        });
      },
    });
  }

  private loadCompanies(orgId: string): void {
    this.loading = true;
    this.companiesApi.listByOrganization(orgId).subscribe({
      next: ({ result }) => {
        this.companies = result ?? [];
        this.loading = false;
      },
      error: () => {
        this.loading = false;
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
      next: ({ result }) => {
        const countries = result ?? [];
        this.countryOptions = countries.map((country: Country) => ({
          label: `${country.nameEs} (${country.iso2})`,
          value: country.iso2,
        }));
        if (!this.createForm.controls.baseCountryId.value && this.countryOptions.length > 0) {
          this.createForm.controls.baseCountryId.setValue(this.countryOptions[0].value);
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
