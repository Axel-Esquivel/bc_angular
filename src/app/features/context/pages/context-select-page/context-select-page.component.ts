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
import { OrganizationCoreApiService } from '../../../../core/api/organization-core-api.service';
import { IOrganization } from '../../../../shared/models/organization.model';
import { Company, CompanyEnterprise } from '../../../../shared/models/company.model';
import { CoreCountry, CoreCurrency } from '../../../../shared/models/organization-core.model';

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
  private readonly organizationCoreApi = inject(OrganizationCoreApiService);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);

  organizations: IOrganization[] = [];
  companies: Company[] = [];
  enterprises: CompanyEnterprise[] = [];
  countryOptions: Array<{ label: string; value: string }> = [];
  currencyOptions: Array<{ label: string; value: string }> = [];
  private coreCountries: CoreCountry[] = [];
  private coreCurrencies: CoreCurrency[] = [];
  loadingOrganizations = false;
  loadingCompanies = false;
  loadingCore = false;
  submitting = false;

  readonly form = this.fb.group({
    organizationId: this.fb.nonNullable.control('', [Validators.required]),
    companyId: this.fb.nonNullable.control('', [Validators.required]),
    enterpriseId: this.fb.nonNullable.control('', [Validators.required]),
    countryId: this.fb.nonNullable.control('', [Validators.required]),
    currencyId: this.fb.nonNullable.control('', [Validators.required]),
  });

  ngOnInit(): void {
    this.loadOrganizations();
    this.form.controls.organizationId.valueChanges.subscribe((orgId) => {
      if (!orgId) {
        this.companies = [];
        this.form.controls.companyId.setValue('');
        this.enterprises = [];
        this.form.controls.enterpriseId.setValue('');
        this.form.controls.countryId.setValue('');
        this.currencyOptions = [];
        this.form.controls.currencyId.setValue('');
        this.countryOptions = [];
        return;
      }
      this.loadCoreSettings(orgId);
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
          const user = this.authService.getCurrentUser();
          const defaultOrgId = user?.defaults?.organizationId ?? user?.defaultOrganizationId;
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
          const user = this.authService.getCurrentUser();
          const defaultCompanyId = user?.defaults?.companyId ?? user?.defaultCompanyId;
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

  private loadCoreSettings(organizationId: string): void {
    this.loadingCore = true;
    this.organizationCoreApi
      .getCoreSettings(organizationId)
      .pipe(take(1))
      .subscribe({
        next: ({ result }) => {
          this.coreCountries = result?.countries ?? [];
          this.coreCurrencies = result?.currencies ?? [];
          this.loadingCore = false;
          this.applyCompanySelection(this.form.controls.companyId.value);
        },
        error: () => {
          this.coreCountries = [];
          this.coreCurrencies = [];
          this.countryOptions = [];
          this.currencyOptions = [];
          this.loadingCore = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Contexto',
            detail: 'No se pudieron cargar los catalogos de la organizacion.',
          });
        },
      });
  }

  private applyCompanySelection(companyId: string): void {
    const company = this.companies.find((item) => item.id === companyId) ?? null;
    this.enterprises = company?.enterprises ?? [];
    this.form.controls.enterpriseId.setValue('', { emitEvent: false });
    this.form.controls.currencyId.setValue('', { emitEvent: false });
    this.form.controls.countryId.setValue('', { emitEvent: false });
    this.currencyOptions = [];
    this.countryOptions = this.buildCountryOptions(company);

    if (!company || this.enterprises.length === 0) {
      if (this.countryOptions.length === 1) {
        this.form.controls.countryId.setValue(this.countryOptions[0].value, { emitEvent: false });
      }
      return;
    }

    const preferredEnterpriseId = this.resolveEnterpriseId(company);
    this.form.controls.enterpriseId.setValue(preferredEnterpriseId ?? '', { emitEvent: false });
    this.applyEnterpriseSelection(preferredEnterpriseId);
  }

  private applyEnterpriseSelection(enterpriseId: string | null | undefined): void {
    const enterprise = this.enterprises.find((item) => item.id === enterpriseId) ?? null;
    const companyId = this.form.controls.companyId.value;
    const company = this.companies.find((item) => item.id === companyId) ?? null;
    const currencyIds = this.resolveAllowedCurrencyIds(company, enterprise);
    this.currencyOptions = currencyIds.map((id) => ({
      value: id,
      label: this.resolveCurrencyLabel(id),
    }));

    const resolvedCurrencyId = this.resolveCurrencyId(company, enterprise, currencyIds);
    this.form.controls.currencyId.setValue(resolvedCurrencyId ?? '', { emitEvent: false });

    const resolvedCountryId = this.resolveCountryId(company, enterprise);
    if (resolvedCountryId) {
      this.form.controls.countryId.setValue(resolvedCountryId, { emitEvent: false });
    }
  }

  private resolveEnterpriseId(company: Company): string | null {
    const user = this.authService.getCurrentUser();
    const preferred = user?.defaults?.enterpriseId ?? user?.defaultEnterpriseId ?? null;
    if (preferred && this.enterprises.some((item) => item.id === preferred)) {
      return preferred;
    }
    if (company.defaultEnterpriseId && this.enterprises.some((item) => item.id === company.defaultEnterpriseId)) {
      return company.defaultEnterpriseId;
    }
    return this.enterprises[0]?.id ?? null;
  }

  private resolveCurrencyId(
    company: Company | null,
    enterprise: CompanyEnterprise | null,
    allowedCurrencyIds: string[],
  ): string | null {
    const user = this.authService.getCurrentUser();
    const preferred = user?.defaults?.currencyId ?? user?.defaultCurrencyId ?? null;
    if (preferred && allowedCurrencyIds.includes(preferred)) {
      return preferred;
    }
    if (enterprise?.defaultCurrencyId && allowedCurrencyIds.includes(enterprise.defaultCurrencyId)) {
      return enterprise.defaultCurrencyId;
    }
    const companyDefault = company?.defaultCurrencyId ?? company?.baseCurrencyId ?? null;
    if (companyDefault && allowedCurrencyIds.includes(companyDefault)) {
      return companyDefault;
    }
    return allowedCurrencyIds[0] ?? null;
  }

  private resolveCurrencyLabel(id: string): string {
    const currency = this.coreCurrencies.find((item) => item.id === id || item.code === id);
    if (!currency) {
      return id;
    }
    const label = currency.symbol ? `${currency.name.toUpperCase()} (${currency.symbol})` : `${currency.name.toUpperCase()} (${currency.code})`;
    return label || id;
  }

  private resolveCountryId(company: Company | null, enterprise: CompanyEnterprise | null): string | null {
    if (!company) {
      return null;
    }
    const options = this.countryOptions.map((item) => item.value);
    const user = this.authService.getCurrentUser();
    const preferred = user?.defaults?.countryId ?? null;
    if (preferred && options.includes(preferred)) {
      return preferred;
    }
    if (enterprise?.countryId && options.includes(enterprise.countryId)) {
      return enterprise.countryId;
    }
    if (company.baseCountryId && options.includes(company.baseCountryId)) {
      return company.baseCountryId;
    }
    return options[0] ?? null;
  }

  private resolveAllowedCurrencyIds(company: Company | null, enterprise: CompanyEnterprise | null): string[] {
    if (enterprise?.currencyIds?.length) {
      return enterprise.currencyIds;
    }
    const companyCurrencies = company?.currencies ?? [];
    if (companyCurrencies.length > 0) {
      return companyCurrencies;
    }
    const baseCurrencyId = company?.baseCurrencyId;
    return baseCurrencyId ? [baseCurrencyId] : [];
  }

  private buildCountryOptions(company: Company | null): Array<{ label: string; value: string }> {
    if (!company) {
      return [];
    }
    const allowed = Array.isArray(company.operatingCountryIds) && company.operatingCountryIds.length > 0
      ? company.operatingCountryIds
      : [company.baseCountryId];
    const normalized = Array.from(new Set(allowed.filter(Boolean)));
    return normalized.map((id) => ({
      value: id,
      label: this.resolveCountryLabel(id),
    }));
  }

  private resolveCountryLabel(id: string): string {
    const country = this.coreCountries.find((item) => item.id === id || item.code === id);
    if (!country) {
      return id;
    }
    return `${country.name.toUpperCase()} (${country.code})`;
  }

  save(): void {
    if (this.form.invalid || this.submitting) {
      this.form.markAllAsTouched();
      return;
    }

    const orgId = this.form.controls.organizationId.value;
    const companyId = this.form.controls.companyId.value;
    const enterpriseId = this.form.controls.enterpriseId.value;
    const countryId = this.form.controls.countryId.value;
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
    if (!countryId) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Contexto',
        detail: 'Selecciona un pais valido.',
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
      .setDefaults({
        organizationId: orgId,
        company,
        enterpriseId,
        countryId,
        currencyId,
      })
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
