import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { FloatLabel } from 'primeng/floatlabel';
import { Select } from 'primeng/select';
import { take } from 'rxjs';

import { ContextApiService } from '../../../../core/api/context-api.service';
import { ContextStateService } from '../../../../core/context/context-state.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { CountriesApiService } from '../../../../core/api/countries-api.service';
import { CurrenciesApiService } from '../../../../core/api/currencies-api.service';
import { IOrganization } from '../../../../shared/models/organization.model';
import { Company, CompanyEnterprise } from '../../../../shared/models/company.model';
import { Country } from '../../../../shared/models/country.model';
import { Currency } from '../../../../shared/models/currency.model';

@Component({
  selector: 'app-context-select-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, Button, Card, FloatLabel, Select],
  templateUrl: './context-select-page.component.html',
  styleUrl: './context-select-page.component.scss',
  providers: [MessageService],
})
export class ContextSelectPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly contextApi = inject(ContextApiService);
  private readonly contextState = inject(ContextStateService);
  private readonly authService = inject(AuthService);
  private readonly countriesApi = inject(CountriesApiService);
  private readonly currenciesApi = inject(CurrenciesApiService);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);

  organizations: IOrganization[] = [];
  companies: Company[] = [];
  enterprises: CompanyEnterprise[] = [];
  currencyOptions: Array<{ label: string; value: string }> = [];
  countryLabel = '';
  private countries: Country[] = [];
  private currencies: Currency[] = [];
  loadingOrganizations = false;
  loadingCompanies = false;
  submitting = false;

  readonly form = this.fb.group({
    organizationId: this.fb.nonNullable.control('', [Validators.required]),
    companyId: this.fb.nonNullable.control('', [Validators.required]),
    enterpriseId: this.fb.nonNullable.control('', [Validators.required]),
    currencyId: this.fb.nonNullable.control('', [Validators.required]),
  });

  ngOnInit(): void {
    this.loadOrganizations();
    this.loadCountries();
    this.loadCurrencies();
    this.form.controls.organizationId.valueChanges.subscribe((orgId) => {
      if (!orgId) {
        this.companies = [];
        this.form.controls.companyId.setValue('');
        this.enterprises = [];
        this.currencyOptions = [];
        this.form.controls.enterpriseId.setValue('');
        this.form.controls.currencyId.setValue('');
        this.countryLabel = '';
        return;
      }
      this.loadCompanies(orgId);
    });
    this.form.controls.companyId.valueChanges.subscribe((companyId) => {
      this.applyCompanySelection(companyId);
    });
    this.form.controls.enterpriseId.valueChanges.subscribe((enterpriseId) => {
      this.applyEnterpriseSelection(enterpriseId);
    });
  }

  private loadOrganizations(): void {
    this.loadingOrganizations = true;
    this.contextApi
      .listOrganizations()
      .pipe(take(1))
      .subscribe({
        next: (organizations) => {
          this.organizations = organizations ?? [];
          this.loadingOrganizations = false;
          const defaultOrgId = this.authService.getCurrentUser()?.defaultOrganizationId;
          const resolved =
            defaultOrgId && this.organizations.some((org) => org.id === defaultOrgId)
              ? defaultOrgId
              : this.organizations[0]?.id ?? '';
          if (resolved) {
            this.form.controls.organizationId.setValue(resolved);
          }
        },
        error: () => {
          this.loadingOrganizations = false;
          this.organizations = [];
          this.messageService.add({
            severity: 'error',
            summary: 'Contexto',
            detail: 'No se pudieron cargar las organizaciones.',
          });
        },
      });
  }

  private loadCompanies(organizationId: string): void {
    this.loadingCompanies = true;
    this.contextApi
      .listCompanies(organizationId)
      .pipe(take(1))
      .subscribe({
        next: (companies) => {
          this.companies = companies ?? [];
          this.loadingCompanies = false;
          const defaultCompanyId = this.authService.getCurrentUser()?.defaultCompanyId;
          const resolved =
            defaultCompanyId && this.companies.some((company) => company.id === defaultCompanyId)
              ? defaultCompanyId
              : this.companies[0]?.id ?? '';
          if (resolved) {
            this.form.controls.companyId.setValue(resolved);
          } else {
            this.form.controls.companyId.setValue('');
          }
        },
        error: () => {
          this.loadingCompanies = false;
          this.companies = [];
          this.messageService.add({
            severity: 'error',
            summary: 'Contexto',
            detail: 'No se pudieron cargar las companias.',
          });
        },
      });
  }

  private loadCountries(): void {
    this.countriesApi
      .list()
      .pipe(take(1))
      .subscribe({
        next: ({ result }) => {
          this.countries = result ?? [];
        },
        error: () => {
          this.countries = [];
        },
      });
  }

  private loadCurrencies(): void {
    this.currenciesApi
      .list()
      .pipe(take(1))
      .subscribe({
        next: ({ result }) => {
          this.currencies = result ?? [];
        },
        error: () => {
          this.currencies = [];
        },
      });
  }

  private applyCompanySelection(companyId: string): void {
    const company = this.companies.find((item) => item.id === companyId) ?? null;
    this.enterprises = company?.enterprises ?? [];
    this.form.controls.enterpriseId.setValue('', { emitEvent: false });
    this.form.controls.currencyId.setValue('', { emitEvent: false });
    this.currencyOptions = [];
    if (!company || this.enterprises.length === 0) {
      this.countryLabel = company?.baseCountryId ?? '';
      return;
    }

    const preferredEnterpriseId = this.resolveEnterpriseId(company);
    this.form.controls.enterpriseId.setValue(preferredEnterpriseId ?? '', { emitEvent: false });
    this.applyEnterpriseSelection(preferredEnterpriseId);
  }

  private applyEnterpriseSelection(enterpriseId: string | null | undefined): void {
    const enterprise =
      this.enterprises.find((item) => item.id === enterpriseId) ?? null;
    const currencyIds = enterprise?.currencyIds ?? [];
    this.currencyOptions = currencyIds.map((id) => ({
      value: id,
      label: this.resolveCurrencyLabel(id),
    }));

    const resolvedCurrencyId = this.resolveCurrencyId(enterprise);
    this.form.controls.currencyId.setValue(resolvedCurrencyId ?? '', { emitEvent: false });
    this.updateCountryLabel(enterprise);
  }

  private resolveEnterpriseId(company: Company): string | null {
    const preferred = this.authService.getCurrentUser()?.defaultEnterpriseId ?? null;
    if (preferred && this.enterprises.some((item) => item.id === preferred)) {
      return preferred;
    }
    if (company.defaultEnterpriseId && this.enterprises.some((item) => item.id === company.defaultEnterpriseId)) {
      return company.defaultEnterpriseId;
    }
    return this.enterprises[0]?.id ?? null;
  }

  private resolveCurrencyId(enterprise: CompanyEnterprise | null): string | null {
    const preferred = this.authService.getCurrentUser()?.defaultCurrencyId ?? null;
    if (preferred && enterprise?.currencyIds?.includes(preferred)) {
      return preferred;
    }
    if (enterprise?.defaultCurrencyId && enterprise.currencyIds?.includes(enterprise.defaultCurrencyId)) {
      return enterprise.defaultCurrencyId;
    }
    return enterprise?.currencyIds?.[0] ?? null;
  }

  private resolveCurrencyLabel(id: string): string {
    const currency = this.currencies.find((item) => item.id === id || item.code === id);
    if (!currency) {
      return id;
    }
    const label = currency.symbol ? `${currency.name} (${currency.symbol})` : currency.name;
    return label || id;
  }

  private updateCountryLabel(enterprise: CompanyEnterprise | null): void {
    const companyId = this.form.controls.companyId.value;
    const company = this.companies.find((item) => item.id === companyId) ?? null;
    const countryId = enterprise?.countryId ?? company?.baseCountryId ?? '';
    if (!countryId) {
      this.countryLabel = '';
      return;
    }
    const country = this.countries.find((item) => item.iso2 === countryId || item.id === countryId);
    if (country) {
      this.countryLabel = `${country.nameEs || country.nameEn || country.iso2} (${country.iso2})`;
      return;
    }
    this.countryLabel = countryId;
  }

  save(): void {
    if (this.form.invalid || this.submitting) {
      this.form.markAllAsTouched();
      return;
    }

    const orgId = this.form.controls.organizationId.value;
    const companyId = this.form.controls.companyId.value;
    const enterpriseId = this.form.controls.enterpriseId.value;
    const currencyId = this.form.controls.currencyId.value;
    const company = this.companies.find((item) => item.id === companyId);
    if (!company || !company.id) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Contexto',
        detail: 'Selecciona una compania valida.',
      });
      return;
    }
    if (!enterpriseId) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Contexto',
        detail: 'Selecciona una empresa valida.',
      });
      return;
    }
    if (!currencyId) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Contexto',
        detail: 'Selecciona una moneda valida.',
      });
      return;
    }

    this.submitting = true;
    this.contextState
      .setDefaults(orgId, company, enterpriseId, currencyId)
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.submitting = false;
          this.router.navigateByUrl('/app');
        },
        error: () => {
          this.submitting = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Contexto',
            detail: 'No se pudo guardar el contexto.',
          });
        },
      });
  }
}
