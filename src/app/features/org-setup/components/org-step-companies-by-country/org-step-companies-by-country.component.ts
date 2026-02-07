import { HttpErrorResponse } from '@angular/common/http';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { FormArray, FormBuilder, FormControl, Validators } from '@angular/forms';
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
  @Input() refreshToken = 0;

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
    enterprises: new FormArray<FormControl<string>>([]),
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['organizationId']) {
      this.loadData();
    }
    if (changes['refreshToken'] && !changes['refreshToken'].firstChange) {
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
    this.resetEnterpriseControls();
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

    const enterpriseNames = this.normalizeEnterpriseNames();
    if (enterpriseNames.length > 0 && new Set(enterpriseNames.map((value) => value.toLowerCase())).size !== enterpriseNames.length) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Empresas',
        detail: 'No puedes repetir nombres de empresa.',
      });
      return;
    }

    const payload: {
      name: string;
      countryId: string;
      baseCountryId: string;
      baseCurrencyId: string;
      operatingCountryIds: string[];
      currencies: string[];
      currencyIds: string[];
      defaultCurrencyId: string;
      enterprisesByCountry?: Array<{
        countryId: string;
        enterprises: Array<{ name: string; allowedCurrencyIds: string[]; baseCurrencyId: string }>;
      }>;
      defaultEnterpriseKey?: { countryId: string; enterpriseIndex: number };
    } = {
      name: name.trim(),
      countryId,
      baseCountryId: countryId,
      baseCurrencyId: currencyId,
      operatingCountryIds: [countryId],
      currencies: [currencyId],
      currencyIds: [currencyId],
      defaultCurrencyId: currencyId,
    };
    if (enterpriseNames.length > 0) {
      payload.enterprisesByCountry = [
        {
          countryId,
          enterprises: enterpriseNames.map((enterpriseName) => ({
            name: enterpriseName,
            allowedCurrencyIds: [currencyId],
            baseCurrencyId: currencyId,
          })),
        },
      ];
      payload.defaultEnterpriseKey = { countryId, enterpriseIndex: 0 };
    }

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

  get enterpriseControls(): FormArray<FormControl<string>> {
    return this.companyForm.controls.enterprises as FormArray<FormControl<string>>;
  }

  addEnterpriseControl(name = ''): void {
    this.enterpriseControls.push(
      this.fb.nonNullable.control(name, [Validators.required, Validators.minLength(2)]),
    );
  }

  removeEnterpriseControl(index: number): void {
    if (this.enterpriseControls.length === 0) {
      return;
    }
    const confirmed = window.confirm('Deseas eliminar esta empresa?');
    if (!confirmed) {
      return;
    }
    this.enterpriseControls.removeAt(index);
  }

  private resetEnterpriseControls(): void {
    while (this.enterpriseControls.length > 0) {
      this.enterpriseControls.removeAt(0);
    }
  }

  private normalizeEnterpriseNames(): string[] {
    return this.enterpriseControls.controls
      .map((control) => control.value.trim())
      .filter((value) => value.length > 0);
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
