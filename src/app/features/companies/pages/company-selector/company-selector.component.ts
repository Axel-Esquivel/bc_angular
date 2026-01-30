import { Location } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, of, finalize } from 'rxjs';

import { CompaniesApiService } from '../../../../core/api/companies-api.service';
import { CountriesApiService } from '../../../../core/api/countries-api.service';
import { CurrenciesApiService } from '../../../../core/api/currencies-api.service';
import { OrganizationsService } from '../../../../core/api/organizations-api.service';
import { OrganizationCoreApiService } from '../../../../core/api/organization-core-api.service';
import { UsersApiService } from '../../../../core/api/users-api.service';
import { CompanyStateService } from '../../../../core/company/company-state.service';
import { ActiveContextStateService } from '../../../../core/context/active-context-state.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { Company } from '../../../../shared/models/company.model';
import {
  CompanyDefaultEnterpriseKey,
  CompanyEnterprisesByCountryInput,
  CreateOrganizationCompanyDto,
} from '../../../../shared/models/organization-company.model';
import { Country } from '../../../../shared/models/country.model';
import { Currency } from '../../../../shared/models/currency.model';
import { CoreCountry, CoreCurrency } from '../../../../shared/models/organization-core.model';

interface ICountry {
  _id: string;
  name: string;
  code?: string;
}

interface ICurrency {
  _id: string;
  name: string;
  code: string;
  symbol?: string;
}

interface UnitOption {
  id: string;
  name: string;
  countryId: string;
}

type CompanyUnitForm = FormGroup<{
  id: FormControl<string>;
  name: FormControl<string>;
  allowedCurrencyIds: FormControl<string[]>;
  baseCurrencyId: FormControl<string>;
}>;

type CountryUnitsForm = FormGroup<{
  countryId: FormControl<string>;
  units: FormArray<CompanyUnitForm>;
}>;

type CompanyCreateForm = FormGroup<{
  name: FormControl<string>;
  countryIds: FormControl<string[]>;
  currencyIds: FormControl<string[]>;
  defaultEnterpriseId: FormControl<string>;
  defaultCurrencyId: FormControl<string>;
  companiesByCountry: FormArray<CountryUnitsForm>;
}>;

@Component({
  selector: 'app-company-selector',
  templateUrl: './company-selector.component.html',
  styleUrl: './company-selector.component.scss',
  providers: [MessageService],
  standalone: false,
})
export class CompanySelectorComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);

  organizationId: string | null = null;
  companies: Company[] = [];
  loadingCompanies = false;
  loadingCore = false;

  createCompanyDialogOpen = false;
  submitting = false;

  countryOptions: ICountry[] = [];
  currencyOptions: ICurrency[] = [];

  selectedCompanyControl: FormControl<Company | null>;
  createForm: CompanyCreateForm;

  private backUrl = '/app';

  constructor(
    private readonly companiesApi: CompaniesApiService,
    private readonly countriesApi: CountriesApiService,
    private readonly currenciesApi: CurrenciesApiService,
    private readonly organizationsApi: OrganizationsService,
    private readonly usersApi: UsersApiService,
    private readonly organizationCoreApi: OrganizationCoreApiService,
    private readonly companyState: CompanyStateService,
    private readonly activeContextState: ActiveContextStateService,
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly location: Location,
    private readonly fb: FormBuilder,
    private readonly messageService: MessageService,
  ) {
    this.selectedCompanyControl = this.fb.control<Company | null>(null);

    this.createForm = this.fb.nonNullable.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      countryIds: this.fb.nonNullable.control<string[]>([], [Validators.required]),
      currencyIds: this.fb.nonNullable.control<string[]>([], [Validators.required]),
      defaultEnterpriseId: this.fb.nonNullable.control<string>(''),
      defaultCurrencyId: this.fb.nonNullable.control<string>('', [Validators.required]),
      companiesByCountry: new FormArray<CountryUnitsForm>([]),
    });

    const nav = this.router.getCurrentNavigation();
    const previousUrl = nav?.previousNavigation?.finalUrl?.toString();
    if (previousUrl?.startsWith('/org')) {
      this.backUrl = '/org/setup';
    } else if (previousUrl) {
      this.backUrl = previousUrl;
    }
  }

  ngOnInit(): void {
    const context = this.activeContextState.getActiveContext();
    const fallbackOrg = this.authService.getCurrentUser()?.defaultOrganizationId ?? null;
    this.organizationId = context.organizationId ?? fallbackOrg;

    if (!this.organizationId) {
      this.router.navigateByUrl('/org/setup');
      return;
    }

    console.log('ORG_ID', this.organizationId);
    this.loadCompanies(this.organizationId);
    this.loadCoreSettings(this.organizationId);

    this.createForm.controls.countryIds.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((countryIds) => {
        this.syncCountryGroups(countryIds);
      });

    this.createForm.controls.currencyIds.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((currencyIds) => {
        this.syncCurrencySelections(currencyIds);
      });
  }

  get selectedCompany(): Company | null {
    return this.selectedCompanyControl.value;
  }

  get companiesByCountryArray(): FormArray<CountryUnitsForm> {
    return this.createForm.controls.companiesByCountry;
  }

  get selectedCountries(): ICountry[] {
    const ids = this.createForm.controls.countryIds.value;
    return ids
      .map((id) => this.countryOptions.find((country) => country._id === id))
      .filter((country): country is ICountry => Boolean(country));
  }

  get allowedCurrencies(): ICurrency[] {
    const ids = this.createForm.controls.currencyIds.value;
    return ids
      .map((id) => this.currencyOptions.find((currency) => currency._id === id))
      .filter((currency): currency is ICurrency => Boolean(currency));
  }

  get defaultCurrencyOptions(): ICurrency[] {
    return this.allowedCurrencies;
  }

  get unitOptions(): UnitOption[] {
    const items: UnitOption[] = [];
    this.companiesByCountryArray.controls.forEach((countryGroup) => {
      const countryId = countryGroup.controls.countryId.value;
      countryGroup.controls.units.controls.forEach((unit) => {
        const id = unit.controls.id.value;
        const name = unit.controls.name.value || 'Empresa';
        items.push({ id, name, countryId });
      });
    });
    return items;
  }

  selectCompany(): void {
    const selectedCompany = this.selectedCompany;
    const companyId = selectedCompany?.id;
    if (!companyId || !selectedCompany) {
      return;
    }

    this.submitting = true;
    this.usersApi.setDefaultCompany(companyId).subscribe({
      next: () => {
        this.companyState.setActiveCompanyId(companyId);
        this.companyState.setDefaultCompanyId(companyId);
        this.activeContextState.setActiveContext(
          this.buildActiveContext(selectedCompany, this.organizationId),
        );
        this.authService.refreshToken().subscribe({
          next: () => {
            this.submitting = false;
            this.router.navigateByUrl('/app');
          },
          error: () => {
            this.submitting = false;
            this.router.navigateByUrl('/app');
          },
        });
      },
      error: () => {
        this.companyState.setActiveCompanyId(companyId);
        this.companyState.setDefaultCompanyId(companyId);
        this.activeContextState.setActiveContext(
          this.buildActiveContext(selectedCompany, this.organizationId),
        );
        this.submitting = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Companias',
          detail: 'No se pudo marcar la compania por defecto.',
        });
        this.router.navigateByUrl('/app');
      },
    });
  }

  goBack(): void {
    if (window.history.length > 1) {
      this.location.back();
      return;
    }
    this.router.navigateByUrl(this.backUrl);
  }

  openCreateCompanyDialog(): void {
    this.resetCompanyForm();
    this.createCompanyDialogOpen = true;
  }

  onCreateClick(): void {
    console.log('CREATE_CLICK_WORKS');
    this.messageService.add({
      severity: 'info',
      summary: 'Crear compania',
      detail: 'Click detectado',
    });
  }

  onAddUnitClick(event: Event, countryId: string): void {
    event.stopPropagation();
    this.addCompanyUnit(countryId);
  }

  addCompanyUnit(countryId: string): void {
    const group = this.ensureCountryGroup(countryId);
    group.controls.units.push(this.createUnitForm());
    this.syncDefaultEnterprise();
  }

  removeCompanyUnit(countryId: string, unitId: string): void {
    const group = this.ensureCountryGroup(countryId);
    const units = group.controls.units;
    const index = units.controls.findIndex((unit) => unit.controls.id.value === unitId);
    if (index >= 0) {
      units.removeAt(index);
      this.syncDefaultEnterprise();
    }
  }

  getCountryGroup(countryId: string): CountryUnitsForm {
    return this.ensureCountryGroup(countryId);
  }

  getCountryUnits(countryId: string): CompanyUnitForm[] {
    return this.ensureCountryGroup(countryId).controls.units.controls;
  }

  getUnitCurrencyOptions(unit: CompanyUnitForm): ICurrency[] {
    const ids = this.normalizeIdList(unit.controls.allowedCurrencyIds.value);
    return ids
      .map((id) => this.currencyOptions.find((currency) => currency._id === id))
      .filter((currency): currency is ICurrency => Boolean(currency));
  }

  syncUnitBaseCurrency(unit: CompanyUnitForm): void {
    const ids = this.normalizeIdList(unit.controls.allowedCurrencyIds.value);
    const current = unit.controls.baseCurrencyId.value;
    if (current && ids.includes(current)) {
      return;
    }
    unit.controls.baseCurrencyId.setValue(ids[0] ?? '');
  }

  onDefaultEnterpriseChange(): void {
    this.syncDefaultCurrency();
  }

  onSubmitCreate(): void {
    console.log('CREATE_CLICK');
    console.log('CREATE_SUBMIT', this.createForm.getRawValue());
    this.messageService.add({
      severity: 'info',
      summary: 'Crear compania',
      detail: 'Submit ejecutado',
    });
    if (this.submitting) {
      console.log('CREATE_SUBMIT_BLOCKED_SUBMITTING');
      return;
    }
    if (!this.organizationId) {
      console.log('CREATE_SUBMIT_BLOCKED_NO_ORG');
      return;
    }
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      const errors: string[] = [];
      if (this.createForm.controls.name.invalid) {
        errors.push('nombre');
      }
      if (this.createForm.controls.countryIds.invalid) {
        errors.push('paises');
      }
      if (this.createForm.controls.currencyIds.invalid) {
        errors.push('monedas');
      }
      if (this.createForm.controls.defaultCurrencyId.invalid) {
        errors.push('moneda por defecto');
      }
      this.messageService.add({
        severity: 'warn',
        summary: 'Formulario incompleto',
        detail: errors.length > 0 ? `Revisa: ${errors.join(', ')}.` : 'Revisa los campos requeridos.',
      });
      return;
    }

    const formPayload = this.createForm.getRawValue();
    const countryIds = this.normalizeIdList(formPayload.countryIds);
    const currencyIds = this.normalizeIdList(formPayload.currencyIds);

    const enterprisesByCountry: CompanyEnterprisesByCountryInput[] = [];
    let fallbackEnterpriseId: string | null = null;
    this.companiesByCountryArray.controls.forEach((countryGroup) => {
      const countryId = countryGroup.controls.countryId.value;
      const units = countryGroup.controls.units.controls.map((unit) => {
        const unitPayload = unit.getRawValue();
        const unitCurrencyIds = this.normalizeIdList(unitPayload.allowedCurrencyIds);
        const resolvedCurrencies = unitCurrencyIds.length > 0 ? unitCurrencyIds : currencyIds;
        const baseCurrencyId = this.resolveDefaultCurrencyId(resolvedCurrencies, unitPayload.baseCurrencyId);
        if (!fallbackEnterpriseId) {
          fallbackEnterpriseId = unitPayload.id;
        }
        return {
          name: unitPayload.name.trim(),
          allowedCurrencyIds: resolvedCurrencies,
          baseCurrencyId,
        };
      });
      if (units.length > 0) {
        enterprisesByCountry.push({ countryId, enterprises: units });
      }
    });

    if (enterprisesByCountry.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Empresas',
        detail: 'Agrega al menos una empresa.',
      });
      return;
    }

    const defaultEnterpriseId = formPayload.defaultEnterpriseId || fallbackEnterpriseId || '';
    const defaultEnterpriseKey = this.resolveDefaultEnterpriseKey(defaultEnterpriseId);
    const defaultCurrencyId = this.resolveDefaultCurrencyId(currencyIds, formPayload.defaultCurrencyId);
    const primaryCountryId = countryIds[0] ?? '';

    const payload: CreateOrganizationCompanyDto = {
      name: formPayload.name.trim(),
      countryId: primaryCountryId,
      operatingCountryIds: countryIds,
      currencyIds,
      defaultCurrencyId: defaultCurrencyId || null,
      enterprisesByCountry,
      defaultEnterpriseKey: defaultEnterpriseKey ?? undefined,
    };

    console.log('CREATE_PAYLOAD', payload);
    this.submitting = true;
    this.companiesApi
      .create(this.organizationId, payload)
      .pipe(finalize(() => {
        this.submitting = false;
      }))
      .subscribe({
        next: (res) => {
          const result = res?.result;
          if (result) {
            this.companies = [result, ...this.companies];
            this.selectedCompanyControl.setValue(result);
          }
          this.createCompanyDialogOpen = false;
          this.messageService.add({
            severity: 'success',
            summary: 'Companias',
            detail: 'Compania creada.',
          });
        },
          error: (error) => {
            console.error(error);
            const message = error?.error?.message;
            this.messageService.add({
              severity: 'error',
              summary: 'Companias',
              detail: typeof message === 'string' ? message : 'No se pudo crear la compania.',
            });
          },
        });
  }

  private ensureCountryGroup(countryId: string): CountryUnitsForm {
    let group = this.companiesByCountryArray.controls.find(
      (item) => item.controls.countryId.value === countryId
    );
    if (!group) {
      group = this.fb.nonNullable.group({
        countryId: this.fb.nonNullable.control<string>(countryId),
        units: new FormArray<CompanyUnitForm>([]),
      });
      this.companiesByCountryArray.push(group);
    }
    return group;
  }

  private createUnitForm(): CompanyUnitForm {
    const currencyIds = this.createForm.controls.currencyIds.value;
    const baseCurrencyId = currencyIds[0] ?? '';
    return this.fb.nonNullable.group({
      id: this.fb.nonNullable.control<string>(this.generateTempId()),
      name: ['', [Validators.required, Validators.minLength(2)]],
      allowedCurrencyIds: this.fb.nonNullable.control<string[]>([...currencyIds], [Validators.required]),
      baseCurrencyId: this.fb.nonNullable.control<string>(baseCurrencyId, [Validators.required]),
    });
  }

  private syncCountryGroups(countryIds: string[]): void {
    const normalized = this.normalizeIdList(countryIds);
    const toRemove = this.companiesByCountryArray.controls.filter(
      (group) => !normalized.includes(group.controls.countryId.value)
    );
    toRemove.forEach((group) => {
      const index = this.companiesByCountryArray.controls.indexOf(group);
      if (index >= 0) {
        this.companiesByCountryArray.removeAt(index);
      }
    });
    normalized.forEach((countryId) => {
      this.ensureCountryGroup(countryId);
    });
    this.syncDefaultEnterprise();
  }

  private syncCurrencySelections(currencyIds: string[]): void {
    const normalized = this.normalizeIdList(currencyIds);
    const defaultCurrencyId = this.createForm.controls.defaultCurrencyId.value;
    if (!normalized.includes(defaultCurrencyId)) {
      this.createForm.controls.defaultCurrencyId.setValue(normalized[0] ?? '', { emitEvent: false });
    }

    this.companiesByCountryArray.controls.forEach((countryGroup) => {
      countryGroup.controls.units.controls.forEach((unit) => {
        const unitCurrencyIds = this.normalizeIdList(unit.controls.allowedCurrencyIds.value);
        const filtered = unitCurrencyIds.filter((id) => normalized.includes(id));
        const nextCurrencies = filtered.length > 0 ? filtered : normalized;
        unit.controls.allowedCurrencyIds.setValue(nextCurrencies, { emitEvent: false });
        const unitBase = unit.controls.baseCurrencyId.value;
        if (!nextCurrencies.includes(unitBase)) {
          unit.controls.baseCurrencyId.setValue(nextCurrencies[0] ?? '', { emitEvent: false });
        }
      });
    });
    this.syncDefaultCurrency();
  }

  private syncDefaultCurrency(): void {
    const defaultEnterpriseId = this.createForm.controls.defaultEnterpriseId.value;
    const unit = this.findUnitById(defaultEnterpriseId);
    if (!unit) {
      return;
    }
    const currencyIds = this.normalizeIdList(unit.controls.allowedCurrencyIds.value);
    const baseCurrencyId = this.resolveDefaultCurrencyId(currencyIds, unit.controls.baseCurrencyId.value);
    this.createForm.controls.defaultCurrencyId.setValue(baseCurrencyId, { emitEvent: false });
  }

  private syncDefaultEnterprise(): void {
    const current = this.createForm.controls.defaultEnterpriseId.value;
    const available = this.unitOptions.map((item) => item.id);
    if (available.length === 0) {
      this.createForm.controls.defaultEnterpriseId.setValue('', { emitEvent: false });
      return;
    }
    if (!current || !available.includes(current)) {
      this.createForm.controls.defaultEnterpriseId.setValue(available[0], { emitEvent: false });
    }
  }

  private findUnitById(id: string): CompanyUnitForm | null {
    if (!id) {
      return null;
    }
    for (const countryGroup of this.companiesByCountryArray.controls) {
      const unit = countryGroup.controls.units.controls.find((item) => item.controls.id.value === id);
      if (unit) {
        return unit;
      }
    }
    return null;
  }

  private resolveDefaultEnterpriseKey(defaultEnterpriseId: string): CompanyDefaultEnterpriseKey | null {
    if (!defaultEnterpriseId) {
      return null;
    }
    for (const countryGroup of this.companiesByCountryArray.controls) {
      const countryId = countryGroup.controls.countryId.value;
      const units = countryGroup.controls.units.controls;
      const index = units.findIndex((unit) => unit.controls.id.value === defaultEnterpriseId);
      if (index >= 0) {
        return { countryId, enterpriseIndex: index };
      }
    }
    return null;
  }

  private resolveDefaultCurrencyId(currencyIds: string[], requested: string): string {
    if (requested && currencyIds.includes(requested)) {
      return requested;
    }
    return currencyIds[0] ?? '';
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

  private loadCoreSettings(orgId: string): void {
    this.loadingCore = true;
    this.organizationCoreApi.getCoreSettings(orgId).subscribe({
      next: (res) => {
        const settings = res?.result;
        const countries = settings?.countries ?? [];
        const currencies = settings?.currencies ?? [];
        this.countryOptions = countries.map((country: CoreCountry) => ({
          _id: country.id,
          name: country.name,
          code: country.code,
        }));
        this.currencyOptions = currencies.map((currency: CoreCurrency) => ({
          _id: currency.id,
          name: currency.name,
          code: currency.code,
          symbol: currency.symbol,
        }));
        this.loadingCore = false;
        console.log('countries loaded', this.countryOptions.length);
        console.log('currencies loaded', this.currencyOptions.length);
        if (this.countryOptions.length === 0 || this.currencyOptions.length === 0) {
          this.loadOrganizationCatalogFallback(orgId, this.countryOptions.length === 0, this.currencyOptions.length === 0);
        }
        this.syncCountryGroups(this.createForm.controls.countryIds.value);
        this.syncCurrencySelections(this.createForm.controls.currencyIds.value);
      },
      error: () => {
        this.loadingCore = false;
        this.messageService.add({
          severity: 'warn',
          summary: 'Organizacion',
          detail: 'No se pudieron cargar los paises y monedas de la organizacion.',
        });
      },
    });
  }

  private loadOrganizationCatalogFallback(
    orgId: string,
    loadCountries: boolean,
    loadCurrencies: boolean,
  ): void {
    this.organizationsApi.getById(orgId).subscribe({
      next: ({ result }) => {
        const countryIds = this.normalizeIdList(result?.countryIds ?? []);
        const currencyIds = this.normalizeIdList(result?.currencyIds ?? []);
        forkJoin({
          countries: loadCountries ? this.countriesApi.list() : of(null),
          currencies: loadCurrencies ? this.currenciesApi.list() : of(null),
        }).subscribe({
          next: ({ countries, currencies }) => {
            if (countries?.result) {
              const list = countries.result ?? [];
              this.countryOptions = list
                .map((country: Country) => ({
                  _id: country.id ?? country.iso2,
                  name: country.nameEs || country.nameEn || country.iso2,
                  code: country.iso2,
                }))
                .filter((country) => countryIds.includes(country._id));
            }
            if (currencies?.result) {
              const list = currencies.result ?? [];
              this.currencyOptions = list
                .map((currency: Currency) => ({
                  _id: currency.id ?? currency.code,
                  name: currency.name,
                  code: currency.code,
                  symbol: currency.symbol,
                }))
                .filter((currency) => currencyIds.includes(currency._id));
            }
            console.log('countries loaded', this.countryOptions.length);
            console.log('currencies loaded', this.currencyOptions.length);
          },
        });
      },
    });
  }

  private resetCompanyForm(): void {
    this.createForm.reset({
      name: '',
      countryIds: [],
      currencyIds: [],
      defaultEnterpriseId: '',
      defaultCurrencyId: '',
    });
    while (this.companiesByCountryArray.length > 0) {
      this.companiesByCountryArray.removeAt(0);
    }
  }

  private normalizeIdList(ids: string[]): string[] {
    const normalized = ids.map((item) => item.trim()).filter((item) => item.length > 0);
    return Array.from(new Set(normalized));
  }

  private generateTempId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return `tmp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  private buildActiveContext(company: Company, organizationId: string | null): {
    organizationId: string | null;
    companyId: string | null;
    countryId: string | null;
    enterpriseId: string | null;
    currencyId: string | null;
  } {
    return {
      organizationId,
      companyId: company.id ?? null,
      countryId: company.baseCountryId ?? null,
      enterpriseId: company.defaultEnterpriseId ?? null,
      currencyId: company.defaultCurrencyId ?? company.baseCurrencyId ?? null,
    };
  }
}


