import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { FloatLabel } from 'primeng/floatlabel';
import { Select } from 'primeng/select';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, combineLatest, distinctUntilChanged, finalize, map, of, startWith, switchMap, tap } from 'rxjs';

import { ContextApiService } from '../../../../core/api/context-api.service';
import { ContextStateService } from '../../../../core/context/context-state.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { OrganizationsService } from '../../../../core/api/organizations-api.service';
import { CompaniesApiService } from '../../../../core/api/companies-api.service';
import { BranchesApiService } from '../../../../core/api/branches-api.service';
import { IOrganization } from '../../../../shared/models/organization.model';
import { Company, CompanyEnterprise } from '../../../../shared/models/company.model';
import { Branch } from '../../../../shared/models/branch.model';
import { CoreCountry, CoreCurrency } from '../../../../shared/models/organization-core.model';

type SelectOption = { label: string; value: string };

@Component({
  selector: 'app-context-select-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, Button, Card, FloatLabel, Select],
  templateUrl: './context-select-page.component.html',
  styleUrl: './context-select-page.component.scss',
  providers: [MessageService],
})
export class ContextSelectPageComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);
  private readonly contextApi = inject(ContextApiService);
  private readonly contextState = inject(ContextStateService);
  private readonly authService = inject(AuthService);
  private readonly organizationsApi = inject(OrganizationsService);
  private readonly companiesApi = inject(CompaniesApiService);
  private readonly branchesApi = inject(BranchesApiService);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);

  organizations: IOrganization[] = [];
  companies: Company[] = [];
  branches: Branch[] = [];
  enterpriseOptions: SelectOption[] = [];
  countryOptions: SelectOption[] = [];
  currencyOptions: SelectOption[] = [];
  private coreCountries: CoreCountry[] = [];
  private coreCurrencies: CoreCurrency[] = [];
  private activeOrganization: IOrganization | null = null;
  loadingOrganizations = false;
  loadingCompanies = false;
  loadingBranches = false;
  loadingCore = false;
  submitting = false;

  readonly form = this.fb.group({
    organizationId: this.fb.control<string | null>(null, [Validators.required]),
    countryId: this.fb.control<string | null>({ value: null, disabled: true }, [Validators.required]),
    companyId: this.fb.control<string | null>({ value: null, disabled: true }, [Validators.required]),
    enterpriseId: this.fb.control<string | null>({ value: null, disabled: true }, [Validators.required]),
    currencyId: this.fb.control<string | null>({ value: null, disabled: true }, [Validators.required]),
  });

  ngOnInit(): void {
    this.resetOrganizationDependents();
    this.loadOrganizations();

    const organizationId$ = this.form.controls.organizationId.valueChanges.pipe(
      startWith(this.form.controls.organizationId.value),
      distinctUntilChanged(),
    );

    const countryId$ = this.form.controls.countryId.valueChanges.pipe(
      startWith(this.form.controls.countryId.value),
      distinctUntilChanged(),
    );

    const companyId$ = this.form.controls.companyId.valueChanges.pipe(
      startWith(this.form.controls.companyId.value),
      distinctUntilChanged(),
    );

    const enterpriseId$ = this.form.controls.enterpriseId.valueChanges.pipe(
      startWith(this.form.controls.enterpriseId.value),
      distinctUntilChanged(),
    );

    organizationId$
      .pipe(
        tap((orgId) => this.handleOrganizationChange(orgId)),
        switchMap((orgId) => this.fetchOrganization(orgId)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((organization) => {
        this.applyOrganization(organization);
      });

    combineLatest([organizationId$, countryId$])
      .pipe(
        tap(() => this.handleCountryChange()),
        switchMap(([orgId, countryId]) => this.fetchCompanies(orgId, countryId)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(({ companies, countryId }) => {
        this.applyCompanies(companies, countryId);
      });

    companyId$
      .pipe(
        tap(() => this.handleCompanyChange()),
        switchMap((companyId) => this.fetchBranches(companyId)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(({ branches, companyId }) => {
        this.applyCompanySelection(companyId);
        this.applyBranches(branches);
      });

    enterpriseId$
      .pipe(
        tap(() => this.handleEnterpriseChange()),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((enterpriseId) => {
        this.applyEnterpriseSelection(enterpriseId);
      });
  }

  private loadOrganizations(): void {
    this.loadingOrganizations = true;
    this.contextApi
      .listOrganizations()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (organizations) => {
          this.organizations = organizations ?? [];
          this.loadingOrganizations = false;
          const user = this.authService.getCurrentUser();
          const defaultOrgId = user?.defaults?.organizationId ?? user?.defaultOrganizationId;
          const resolved =
            defaultOrgId && this.organizations.some((org) => org.id === defaultOrgId)
              ? defaultOrgId
              : this.organizations[0]?.id ?? null;
          if (resolved) {
            this.form.controls.organizationId.setValue(resolved);
          } else {
            this.form.controls.organizationId.setValue(null);
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

  private fetchOrganization(organizationId: string | null) {
    if (!organizationId) {
      this.loadingCore = false;
      return of<IOrganization | null>(null);
    }
    this.loadingCore = true;
    return this.organizationsApi.getById(organizationId).pipe(
      map((response) => response?.result ?? null),
      catchError(() => {
        this.messageService.add({
          severity: 'error',
          summary: 'Contexto',
          detail: 'No se pudieron cargar los catalogos de la organizacion.',
        });
        return of<IOrganization | null>(null);
      }),
      finalize(() => {
        this.loadingCore = false;
      }),
    );
  }

  private fetchCompanies(organizationId: string | null, countryId: string | null) {
    if (!organizationId || !countryId) {
      this.loadingCompanies = false;
      return of({ companies: [] as Company[], countryId });
    }
    this.loadingCompanies = true;
    const normalizedCountryId = this.normalizeCountryId(countryId);
    return this.companiesApi.listByOrganization(organizationId, normalizedCountryId ?? undefined).pipe(
      map((response) => ({
        companies: Array.isArray(response?.result) ? response.result : [],
        countryId,
      })),
      catchError(() => {
        this.messageService.add({
          severity: 'error',
          summary: 'Contexto',
          detail: 'No se pudieron cargar las companias.',
        });
        return of({ companies: [] as Company[], countryId });
      }),
      finalize(() => {
        this.loadingCompanies = false;
      }),
    );
  }

  private fetchBranches(companyId: string | null) {
    if (!companyId) {
      this.loadingBranches = false;
      return of({ branches: [] as Branch[], companyId });
    }
    this.loadingBranches = true;
    return this.branchesApi.listByCompany(companyId).pipe(
      map((response) => ({
        branches: Array.isArray(response?.result) ? response.result : [],
        companyId,
      })),
      catchError(() => {
        this.messageService.add({
          severity: 'error',
          summary: 'Contexto',
          detail: 'No se pudieron cargar las empresas.',
        });
        return of({ branches: [] as Branch[], companyId });
      }),
      finalize(() => {
        this.loadingBranches = false;
      }),
    );
  }

  private applyOrganization(organization: IOrganization | null): void {
    this.activeOrganization = organization;
    const settings = organization?.coreSettings ?? null;
    this.coreCountries = settings?.countries ?? [];
    this.coreCurrencies = settings?.currencies ?? [];
    this.countryOptions = this.buildCountryOptions(this.coreCountries);

    if (this.countryOptions.length > 0 && this.form.controls.organizationId.value) {
      this.form.controls.countryId.enable({ emitEvent: false });
      const resolvedCountryId = this.resolveDefaultCountryId(this.countryOptions);
      if (resolvedCountryId) {
        this.form.controls.countryId.setValue(resolvedCountryId);
      } else {
        this.form.controls.countryId.setValue(null);
      }
    } else {
      this.form.controls.countryId.setValue(null, { emitEvent: false });
      this.form.controls.countryId.disable({ emitEvent: false });
      this.companies = [];
      this.branches = [];
      this.enterpriseOptions = [];
      this.currencyOptions = [];
      this.form.controls.companyId.reset(null, { emitEvent: false });
      this.form.controls.companyId.disable({ emitEvent: false });
      this.form.controls.enterpriseId.reset(null, { emitEvent: false });
      this.form.controls.enterpriseId.disable({ emitEvent: false });
      this.form.controls.currencyId.reset(null, { emitEvent: false });
      this.form.controls.currencyId.disable({ emitEvent: false });
    }
  }

  private applyCountrySelection(countryId: string | null): void {
    if (!countryId) {
      this.applyCompanies([], null);
    }
  }

  private applyCompanies(companies: Company[], countryId: string | null): void {
    const normalizedCountryId = this.normalizeCountryId(countryId);
    const filtered = normalizedCountryId
      ? companies.filter((company) => this.getCompanyCountryId(company) === normalizedCountryId)
      : [];
    this.companies = filtered;
    if (this.companies.length === 0) {
      this.resetCountryDependents();
      return;
    }
    this.form.controls.companyId.enable({ emitEvent: false });
    const currentCompanyId = this.form.controls.companyId.value;
    const hasCurrent =
      currentCompanyId && this.companies.some((company) => company.id === currentCompanyId);
    const resolvedCompanyId = hasCurrent ? currentCompanyId : this.resolveDefaultCompanyId(this.companies);
    if (resolvedCompanyId) {
      this.form.controls.companyId.setValue(resolvedCompanyId);
    } else {
      this.form.controls.companyId.setValue(null);
    }
  }

  private applyCompanySelection(companyId: string | null): void {
    if (!companyId) {
      this.branches = [];
      this.enterpriseOptions = [];
      this.form.controls.enterpriseId.setValue(null, { emitEvent: false });
      this.form.controls.enterpriseId.disable({ emitEvent: false });
      this.currencyOptions = [];
      this.form.controls.currencyId.setValue(null, { emitEvent: false });
      this.form.controls.currencyId.disable({ emitEvent: false });
      return;
    }
    const company = this.companies.find((item) => item.id === companyId) ?? null;
    this.applyCompanyCurrencies(company);
  }

  private applyBranches(branches: Branch[]): void {
    this.branches = branches.filter((branch) => Boolean(branch.id));
    this.enterpriseOptions = this.branches
      .filter((branch) => Boolean(branch.id))
      .map((branch) => ({ value: branch.id as string, label: branch.name }));
    if (this.enterpriseOptions.length === 0) {
      this.form.controls.enterpriseId.setValue(null, { emitEvent: false });
      this.form.controls.enterpriseId.disable({ emitEvent: false });
      return;
    }
    this.form.controls.enterpriseId.enable({ emitEvent: false });
    const currentEnterpriseId = this.form.controls.enterpriseId.value;
    const hasCurrent =
      currentEnterpriseId && this.branches.some((branch) => branch.id === currentEnterpriseId);
    const resolvedEnterpriseId = hasCurrent
      ? currentEnterpriseId
      : this.resolveEnterpriseId(this.branches);
    if (resolvedEnterpriseId) {
      this.form.controls.enterpriseId.setValue(resolvedEnterpriseId);
    } else {
      this.form.controls.enterpriseId.setValue(null);
    }
  }

  private applyEnterpriseSelection(enterpriseId: string | null): void {
    const companyId = this.form.controls.companyId.value;
    const company = this.companies.find((item) => item.id === companyId) ?? null;
    const branch = enterpriseId
      ? this.branches.find((item) => item.id === enterpriseId) ?? null
      : null;
    const currencyIds = this.resolveAllowedCurrencyIds(company, branch);
    this.currencyOptions = this.buildCurrencyOptions(currencyIds);
    const allowedValues = this.currencyOptions.map((option) => option.value);
    if (allowedValues.length === 0) {
      this.form.controls.currencyId.setValue(null, { emitEvent: false });
      this.form.controls.currencyId.disable({ emitEvent: false });
      return;
    }
    this.form.controls.currencyId.enable({ emitEvent: false });
    const resolvedCurrencyId = this.resolveCurrencyId(company, branch, allowedValues);
    this.form.controls.currencyId.setValue(resolvedCurrencyId ?? null, { emitEvent: false });
  }

  private resolveEnterpriseId(branches: Branch[]): string | null {
    if (branches.length === 0) {
      return null;
    }
    const user = this.authService.getCurrentUser();
    const preferred = user?.defaults?.enterpriseId ?? user?.defaultEnterpriseId ?? null;
    if (preferred && branches.some((item) => item.id === preferred)) {
      return preferred;
    }
    return null;
  }

  private resolveCurrencyId(
    company: Company | null,
    branch: Branch | null,
    allowedCurrencyIds: string[],
  ): string | null {
    const user = this.authService.getCurrentUser();
    const preferred = this.normalizeCurrencyId(user?.defaults?.currencyId ?? user?.defaultCurrencyId ?? null);
    if (preferred && allowedCurrencyIds.includes(preferred)) {
      return preferred;
    }
    const branchDefault = this.normalizeCurrencyId(branch?.currencyIds?.[0] ?? null);
    if (branchDefault && allowedCurrencyIds.includes(branchDefault)) {
      return branchDefault;
    }
    const companyDefault = this.normalizeCurrencyId(company?.baseCurrencyId ?? company?.defaultCurrencyId ?? null);
    if (companyDefault && allowedCurrencyIds.includes(companyDefault)) {
      return companyDefault;
    }
    return allowedCurrencyIds[0] ?? null;
  }

  private resolveAllowedCurrencyIds(company: Company | null, branch: Branch | null): string[] {
    const ids = new Set<string>();
    const branchAllowed = branch?.currencyIds;
    if (branchAllowed && branchAllowed.length > 0) {
      branchAllowed.forEach((id) => {
        const normalized = this.normalizeCurrencyId(id);
        if (normalized) {
          ids.add(normalized);
        }
      });
    } else if (company?.currencies?.length) {
      company.currencies.forEach((id) => {
        const normalized = this.normalizeCurrencyId(id);
        if (normalized) {
          ids.add(normalized);
        }
      });
    }
    const normalized = Array.from(ids).filter(Boolean);
    return normalized.length > 0 ? normalized : this.coreCurrencies.map((currency) => currency.id);
  }

  private buildCountryOptions(countries: CoreCountry[]): SelectOption[] {
    return (countries ?? []).map((country) => ({
      value: country.id,
      label: this.resolveCountryLabel(country.id),
    }));
  }

  private buildCurrencyOptions(allowedIds: string[]): SelectOption[] {
    const normalizedAllowed = Array.from(
      new Set(
        allowedIds
          .map((id) => this.normalizeCurrencyId(id))
          .filter((id): id is string => typeof id === 'string' && id.length > 0),
      ),
    );
    if (this.coreCurrencies.length === 0) {
      return normalizedAllowed.map((id) => ({ value: id, label: id }));
    }
    const options = this.coreCurrencies.filter((currency) => normalizedAllowed.includes(currency.id));
    if (options.length === 0 && normalizedAllowed.length > 0) {
      return normalizedAllowed.map((id) => ({ value: id, label: id }));
    }
    return options.map((currency) => ({
      value: currency.id,
      label: this.resolveCurrencyLabel(currency.id),
    }));
  }

  private resolveCountryLabel(id: string): string {
    const country = this.coreCountries.find((item) => item.id === id || item.code === id);
    if (!country) {
      return id;
    }
    return `${country.name.toUpperCase()} (${country.code})`;
  }

  private resolveCurrencyLabel(id: string): string {
    const currency = this.coreCurrencies.find((item) => item.id === id || item.code === id);
    if (!currency) {
      return id;
    }
    const label = currency.symbol
      ? `${currency.name.toUpperCase()} (${currency.symbol})`
      : `${currency.name.toUpperCase()} (${currency.code})`;
    return label || id;
  }

  private resolveDefaultCountryId(options: SelectOption[]): string | null {
    const available = options.map((option) => option.value);
    if (available.length === 0) {
      return null;
    }
    const user = this.authService.getCurrentUser();
    const preferred = this.normalizeCountryId(user?.defaults?.countryId ?? null);
    if (preferred && available.includes(preferred)) {
      return preferred;
    }
    return available[0] ?? null;
  }

  private resolveDefaultCompanyId(companies: Company[]): string | null {
    if (companies.length === 0) {
      return null;
    }
    const user = this.authService.getCurrentUser();
    const preferred = user?.defaults?.companyId ?? user?.defaultCompanyId ?? null;
    if (preferred && companies.some((company) => company.id === preferred)) {
      return preferred;
    }
    return companies[0]?.id ?? null;
  }

  private handleOrganizationChange(organizationId: string | null): void {
    this.resetOrganizationDependents();
    if (!organizationId) {
      return;
    }
  }

  private handleCountryChange(): void {
    this.resetCountryDependents();
  }

  private handleCompanyChange(): void {
    this.resetCompanyDependents();
  }

  private handleEnterpriseChange(): void {
    this.resetEnterpriseDependents();
  }

  private resetOrganizationDependents(): void {
    this.coreCountries = [];
    this.coreCurrencies = [];
    this.countryOptions = [];
    this.companies = [];
    this.branches = [];
    this.enterpriseOptions = [];
    this.currencyOptions = [];
    this.form.controls.countryId.reset(null, { emitEvent: false });
    this.form.controls.countryId.disable({ emitEvent: false });
    this.form.controls.companyId.reset(null, { emitEvent: false });
    this.form.controls.companyId.disable({ emitEvent: false });
    this.form.controls.enterpriseId.reset(null, { emitEvent: false });
    this.form.controls.enterpriseId.disable({ emitEvent: false });
    this.form.controls.currencyId.reset(null, { emitEvent: false });
    this.form.controls.currencyId.disable({ emitEvent: false });
  }

  private resetCountryDependents(): void {
    this.companies = [];
    this.branches = [];
    this.enterpriseOptions = [];
    this.currencyOptions = [];
    this.form.controls.companyId.reset(null, { emitEvent: false });
    this.form.controls.companyId.disable({ emitEvent: false });
    this.form.controls.enterpriseId.reset(null, { emitEvent: false });
    this.form.controls.enterpriseId.disable({ emitEvent: false });
    this.form.controls.currencyId.reset(null, { emitEvent: false });
    this.form.controls.currencyId.disable({ emitEvent: false });
  }

  private resetCompanyDependents(): void {
    this.branches = [];
    this.enterpriseOptions = [];
    this.currencyOptions = [];
    this.form.controls.enterpriseId.reset(null, { emitEvent: false });
    this.form.controls.enterpriseId.disable({ emitEvent: false });
    this.form.controls.currencyId.reset(null, { emitEvent: false });
    this.form.controls.currencyId.disable({ emitEvent: false });
  }

  private resetEnterpriseDependents(): void {
    this.currencyOptions = [];
    this.form.controls.currencyId.reset(null, { emitEvent: false });
    this.form.controls.currencyId.disable({ emitEvent: false });
  }

  private normalizeCountryId(value: string | null | undefined): string | null {
    const trimmed = typeof value === 'string' ? value.trim() : '';
    if (!trimmed) {
      return null;
    }
    const directMatch = this.coreCountries.find((country) => country.id === trimmed);
    if (directMatch) {
      return directMatch.id;
    }
    const upper = trimmed.toUpperCase();
    const codeMatch = this.coreCountries.find((country) => country.code?.toUpperCase() === upper);
    if (codeMatch) {
      return codeMatch.id;
    }
    return trimmed;
  }

  private normalizeCurrencyId(value: string | null | undefined): string | null {
    const trimmed = typeof value === 'string' ? value.trim() : '';
    if (!trimmed) {
      return null;
    }
    const directMatch = this.coreCurrencies.find((currency) => currency.id === trimmed);
    if (directMatch) {
      return directMatch.id;
    }
    const upper = trimmed.toUpperCase();
    const codeMatch = this.coreCurrencies.find((currency) => currency.code?.toUpperCase() === upper);
    if (codeMatch) {
      return codeMatch.id;
    }
    return trimmed;
  }

  private getCompanyCountryId(company: Company): string {
    const direct = company.baseCountryId || (company as { countryId?: string }).countryId || '';
    return this.normalizeCountryId(direct) ?? direct;
  }

  private applyCompanyCurrencies(company: Company | null): void {
    const currencyIds = this.resolveAllowedCurrencyIds(company, null);
    this.currencyOptions = this.buildCurrencyOptions(currencyIds);
    const allowedValues = this.currencyOptions.map((option) => option.value);
    if (allowedValues.length === 0) {
      this.form.controls.currencyId.setValue(null, { emitEvent: false });
      this.form.controls.currencyId.disable({ emitEvent: false });
      return;
    }
    this.form.controls.currencyId.enable({ emitEvent: false });
    const resolvedCurrencyId = this.resolveCurrencyId(company, null, allowedValues);
    this.form.controls.currencyId.setValue(resolvedCurrencyId ?? null, { emitEvent: false });
  }

  private normalizeCurrencyList(values: string[] | undefined, fallback: string[]): string[] {
    const normalized = (values ?? [])
      .map((value) => this.normalizeCurrencyId(value))
      .filter((value): value is string => Boolean(value));
    if (normalized.length > 0) {
      return normalized;
    }
    return fallback;
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
    const company = this.companies.find((item) => item.id === companyId) ?? null;
    if (!company || !company.id) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Contexto',
        detail: 'Selecciona una compania valida.',
      });
      return;
    }
    if (this.enterpriseOptions.length > 0 && !enterpriseId) {
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
    const companyForContext = this.buildCompanyFromSelection(company, countryId, this.branches);
    this.contextState
      .setDefaults({
        organizationId: orgId ?? '',
        company: companyForContext,
        enterpriseId: enterpriseId ?? '',
        countryId,
        currencyId,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
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

  private buildCompanyFromSelection(company: Company, countryId: string, branches: Branch[]): Company {
    const resolvedCurrencies = this.resolveAllowedCurrencyIds(company, null);
    const baseCurrencyId = company.baseCurrencyId || company.defaultCurrencyId || resolvedCurrencies[0] || '';
    const enterprises: CompanyEnterprise[] = branches
      .filter((branch) => Boolean(branch.id))
      .map((branch) => {
        const allowed = this.normalizeCurrencyList(branch.currencyIds, resolvedCurrencies);
        const resolvedAllowed = allowed.length > 0 ? allowed : resolvedCurrencies;
        const defaultCurrencyId = resolvedAllowed[0] ?? baseCurrencyId;
        return {
          id: branch.id as string,
          name: branch.name,
          countryId: branch.countryId ?? countryId,
          currencyIds: resolvedAllowed,
          defaultCurrencyId,
        };
      });
    return {
      ...company,
      baseCountryId: company.baseCountryId || countryId,
      baseCurrencyId,
      currencies: resolvedCurrencies,
      operatingCountryIds: company.operatingCountryIds ?? [countryId],
      enterprises,
      defaultEnterpriseId: company.defaultEnterpriseId ?? enterprises[0]?.id ?? null,
      defaultCurrencyId: company.defaultCurrencyId ?? baseCurrencyId ?? null,
    };
  }
}
