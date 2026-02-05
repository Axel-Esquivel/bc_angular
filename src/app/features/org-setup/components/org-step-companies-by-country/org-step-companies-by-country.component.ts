import { HttpErrorResponse } from '@angular/common/http';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { take } from 'rxjs/operators';

import { CompaniesApiService } from '../../../../core/api/companies-api.service';
import { OrganizationCoreApiService } from '../../../../core/api/organization-core-api.service';
import { Company } from '../../../../shared/models/company.model';
import { CoreCountry, CoreCurrency } from '../../../../shared/models/organization-core.model';

@Component({
  selector: 'app-org-step-companies-by-country',
  templateUrl: './org-step-companies-by-country.component.html',
  styleUrl: './org-step-companies-by-country.component.scss',
  standalone: false,
})
export class OrgStepCompaniesByCountryComponent implements OnChanges {
  private readonly fb = inject(FormBuilder);
  private readonly companiesApi = inject(CompaniesApiService);
  private readonly organizationCoreApi = inject(OrganizationCoreApiService);
  private readonly messageService = inject(MessageService);

  @Input() organizationId: string | null = null;

  @Output() readyChange = new EventEmitter<boolean>();
  @Output() editCompany = new EventEmitter<Company>();
  @Output() deleteCompany = new EventEmitter<Company>();

  countries: SelectOption[] = [];
  currencies: SelectOption[] = [];
  companies: Company[] = [];
  private countryLabelMap = new Map<string, string>();
  private currencyLabelMap = new Map<string, string>();

  readonly countryFilterControl = this.fb.control<string | null>(null);

  isLoading = false;
  isCompanyDialogOpen = false;
  isSubmittingCompany = false;

  readonly companyForm = this.fb.nonNullable.group({
    name: this.fb.nonNullable.control('', [Validators.required, Validators.minLength(2)]),
    countryId: this.fb.control<string | null>(null, [Validators.required]),
    currencyId: this.fb.control<string | null>(null, [Validators.required]),
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['organizationId']) {
      this.loadData();
    }
  }

  get hasOrganization(): boolean {
    return Boolean(this.organizationId);
  }

  get filteredCompanies(): Company[] {
    const countryId = this.countryFilterControl.value;
    if (!countryId) {
      return this.companies;
    }
    return this.companies.filter((company) => {
      const baseCountryId = company.baseCountryId || (company as { countryId?: string }).countryId || undefined;
      return baseCountryId === countryId;
    });
  }

  openCreateCompanyDialog(): void {
    if (!this.organizationId) {
      this.messageService.add({
        severity: 'info',
        summary: 'Atencion',
        detail: 'Primero crea la organizacion.',
      });
      return;
    }
    const defaultCountryId = this.countryFilterControl.value || this.countries[0]?.id || null;
    const defaultCurrencyId = this.currencies[0]?.id || null;
    this.companyForm.reset({
      name: '',
      countryId: defaultCountryId,
      currencyId: defaultCurrencyId,
    });
    this.isCompanyDialogOpen = true;
  }

  submitCompany(): void {
    if (!this.organizationId || this.isSubmittingCompany) {
      return;
    }

    if (this.companyForm.invalid) {
      this.companyForm.markAllAsTouched();
      return;
    }

    const { name, countryId, currencyId } = this.companyForm.getRawValue();
    if (!name?.trim() || !countryId || !currencyId) {
      this.companyForm.markAllAsTouched();
      return;
    }

    const payload = {
      name: name.trim(),
      countryId,
      operatingCountryIds: [countryId],
      currencyIds: [currencyId],
      defaultCurrencyId: currencyId,
      enterprisesByCountry: [
        {
          countryId,
          enterprises: [
            {
              name: 'Principal',
              allowedCurrencyIds: [currencyId],
              baseCurrencyId: currencyId,
            },
          ],
        },
      ],
      defaultEnterpriseKey: { countryId, enterpriseIndex: 0 },
    };

    // TEMP: remove after confirming payload is correct in devtools.
    // eslint-disable-next-line no-console
    console.log('[ORG] create company payload', payload);

    this.isSubmittingCompany = true;
    this.companiesApi
      .create(this.organizationId, payload)
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.isSubmittingCompany = false;
          this.isCompanyDialogOpen = false;
          this.loadCompanies();
          this.messageService.add({
            severity: 'success',
            summary: 'Listo',
            detail: 'Compania creada.',
          });
        },
        error: (err: unknown) => {
          this.isSubmittingCompany = false;
          const message =
            err instanceof HttpErrorResponse
              ? (err.error?.message as string | undefined) || 'No se pudo crear la compania.'
              : 'No se pudo crear la compania.';
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: message,
          });
        },
      });
  }

  private loadData(): void {
    if (!this.organizationId) {
      this.countries = [];
      this.currencies = [];
      this.companies = [];
      this.readyChange.emit(false);
      return;
    }
    this.isLoading = true;
    this.organizationCoreApi
      .getCoreSettings(this.organizationId)
      .pipe(take(1))
      .subscribe({
        next: (response) => {
          const result = response?.result;
          const countries = Array.isArray(result?.countries) ? result.countries : [];
          const currencies = Array.isArray(result?.currencies) ? result.currencies : [];
          this.countries = countries
            .map((country: CoreCountry) => ({
              id: country.id,
              name: country.name,
              code: country.code,
            }))
            .filter((item) => item.id);
          this.currencies = currencies
            .map((currency: CoreCurrency) => ({
              id: currency.id,
              name: currency.name,
              code: currency.code,
              symbol: currency.symbol,
            }))
            .filter((item) => item.id);
          this.countryLabelMap = new Map(
            this.countries.map((country) => {
              const code = country.code ? country.code.toUpperCase() : '';
              const label = code ? `${country.name} (${code})` : country.name;
              return [country.id, label];
            }),
          );
          this.currencyLabelMap = new Map(
            this.currencies.map((currency) => {
              const symbolOrCode = currency.symbol || currency.code || '';
              const label = symbolOrCode ? `${currency.name} (${symbolOrCode})` : currency.name;
              return [currency.id, label];
            }),
          );
          if (!this.countryFilterControl.value && this.countries.length > 0) {
            this.countryFilterControl.setValue(this.countries[0].id);
          }
          this.loadCompanies();
        },
        error: () => {
          this.countries = [];
          this.currencies = [];
          this.companies = [];
          this.isLoading = false;
          this.readyChange.emit(false);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudieron cargar las companias.',
          });
        },
      });
  }

  private loadCompanies(): void {
    if (!this.organizationId) {
      this.companies = [];
      this.readyChange.emit(false);
      return;
    }

    this.companiesApi
      .listByOrganization(this.organizationId)
      .pipe(take(1))
      .subscribe({
        next: (response) => {
          this.companies = Array.isArray(response?.result) ? response.result : [];
          this.isLoading = false;
          this.readyChange.emit(this.companies.length > 0);
        },
        error: () => {
          this.companies = [];
          this.isLoading = false;
          this.readyChange.emit(false);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudieron cargar las companias.',
          });
        },
      });
  }

  getCompanyCountryLabel(company: Company): string {
    const id = company.baseCountryId || (company as { countryId?: string }).countryId || '';
    return id ? this.countryLabelMap.get(id) || id : '—';
  }

  getCompanyCurrencyLabel(company: Company): string {
    const id =
      (company as { baseCurrencyId?: string }).baseCurrencyId ||
      (company as { defaultCurrencyId?: string }).defaultCurrencyId ||
      '';
    return id ? this.currencyLabelMap.get(id) || id : '—';
  }
}

interface SelectOption {
  id: string;
  name: string;
  code?: string;
  symbol?: string;
}
