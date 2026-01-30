import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { CompaniesApiService } from '../../../../core/api/companies-api.service';
import { OrganizationsService } from '../../../../core/api/organizations-api.service';
import { OrganizationCoreApiService } from '../../../../core/api/organization-core-api.service';
import { Company } from '../../../../shared/models/company.model';
import { IOrganization } from '../../../../shared/models/organization.model';
import { CreateOrganizationCompanyDto, OrganizationCompanyEnterpriseInput } from '../../../../shared/models/organization-company.model';
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
  currencyIds: FormControl<string[]>;
  defaultCurrencyId: FormControl<string>;
}>;

type CountryUnitsForm = FormGroup<{
  countryId: FormControl<string>;
  units: FormArray<CompanyUnitForm>;
}>;

type CompanyCreateForm = FormGroup<{
  name: FormControl<string>;
  legalName: FormControl<string>;
  taxId: FormControl<string>;
  operatingCountryIds: FormControl<string[]>;
  allowedCurrencyIds: FormControl<string[]>;
  defaultEnterpriseId: FormControl<string>;
  defaultCurrencyId: FormControl<string>;
  companiesByCountry: FormArray<CountryUnitsForm>;
}>;

@Component({
  selector: 'app-companies-page',
  templateUrl: './companies-page.component.html',
  styleUrl: './companies-page.component.scss',
  providers: [MessageService],
  standalone: false,
})
export class CompaniesPageComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);

  companies: Company[] = [];
  organization: IOrganization | null = null;
  loading = false;

  createDialogOpen = false;
  submitting = false;

  countryOptions: ICountry[] = [];
  currencyOptions: ICurrency[] = [];

  createForm: CompanyCreateForm;

  constructor(
    private readonly companiesApi: CompaniesApiService,
    private readonly organizationsApi: OrganizationsService,
    private readonly organizationCoreApi: OrganizationCoreApiService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly fb: FormBuilder,
    private readonly messageService: MessageService,
  ) {
    this.createForm = this.fb.nonNullable.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      legalName: [''],
      taxId: [''],
      operatingCountryIds: this.fb.nonNullable.control<string[]>([]),
      allowedCurrencyIds: this.fb.nonNullable.control<string[]>([]),
      defaultEnterpriseId: this.fb.nonNullable.control<string>(''),
      defaultCurrencyId: this.fb.nonNullable.control<string>(''),
      companiesByCountry: new FormArray<CountryUnitsForm>([]),
    });
  }

  ngOnInit(): void {
    const orgId = this.route.snapshot.paramMap.get('orgId');
    if (!orgId) {
      this.router.navigate(['/org/setup']);
      return;
    }

    this.loadOrganization(orgId);
    this.loadCompanies(orgId);
    this.loadCoreSettings(orgId);

    this.createForm.controls.operatingCountryIds.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((countryIds) => {
        this.syncCountryGroups(countryIds);
      });

    this.createForm.controls.allowedCurrencyIds.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((currencyIds) => {
        this.syncCurrencySelections(currencyIds);
      });
  }

  get companiesByCountryArray(): FormArray<CountryUnitsForm> {
    return this.createForm.controls.companiesByCountry;
  }

  get selectedCountries(): ICountry[] {
    const ids = this.createForm.controls.operatingCountryIds.value;
    return ids
      .map((id) => this.countryOptions.find((country) => country._id === id))
      .filter((country): country is ICountry => Boolean(country));
  }

  get allowedCurrencies(): ICurrency[] {
    const ids = this.createForm.controls.allowedCurrencyIds.value;
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

  openCreateDialog(): void {
    this.resetCompanyForm();
    this.createDialogOpen = true;
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

  createCompany(): void {
    if (this.createForm.invalid || this.submitting || !this.organization?.id) {
      this.createForm.markAllAsTouched();
      return;
    }

    const formPayload = this.createForm.getRawValue();
    const operatingCountryIds = this.normalizeIdList(formPayload.operatingCountryIds);
    const allowedCurrencyIds = this.normalizeIdList(formPayload.allowedCurrencyIds);

    const enterprises: OrganizationCompanyEnterpriseInput[] = [];
    this.companiesByCountryArray.controls.forEach((countryGroup) => {
      const countryId = countryGroup.controls.countryId.value;
      countryGroup.controls.units.controls.forEach((unit) => {
        const unitPayload = unit.getRawValue();
        const normalizedCurrencies = this.normalizeIdList(unitPayload.currencyIds);
        const currencyIds = normalizedCurrencies.length > 0 ? normalizedCurrencies : allowedCurrencyIds;
        const defaultCurrencyId = this.resolveDefaultCurrencyId(currencyIds, unitPayload.defaultCurrencyId);
        enterprises.push({
          id: unitPayload.id,
          name: unitPayload.name.trim(),
          countryId,
          currencyIds,
          defaultCurrencyId,
        });
      });
    });

    if (enterprises.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Companias',
        detail: 'Agrega al menos una empresa.',
      });
      return;
    }

    const baseCountryId = operatingCountryIds[0] ?? enterprises[0]?.countryId ?? '';
    const baseCurrencyId = this.resolveDefaultCurrencyId(
      allowedCurrencyIds,
      formPayload.defaultCurrencyId || enterprises[0]?.defaultCurrencyId || ''
    );

    const defaultEnterpriseId = this.resolveDefaultEnterpriseId(enterprises, formPayload.defaultEnterpriseId);
    const defaultCurrencyId = this.resolveDefaultCurrencyId(allowedCurrencyIds, formPayload.defaultCurrencyId);

    this.submitting = true;
    const payload: CreateOrganizationCompanyDto = {
      name: formPayload.name.trim(),
      legalName: formPayload.legalName.trim() || undefined,
      taxId: formPayload.taxId.trim() || undefined,
      baseCountryId,
      baseCurrencyId,
      operatingCountryIds,
      currencies: allowedCurrencyIds,
      enterprises,
      defaultEnterpriseId,
      defaultCurrencyId: defaultCurrencyId || baseCurrencyId || null,
    };

    this.companiesApi
      .create(this.organization.id, payload)
      .subscribe({
        next: ({ result }) => {
          if (result) {
            this.companies = [result, ...this.companies];
          }
          this.createDialogOpen = false;
          this.resetCompanyForm();
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

  onDefaultEnterpriseChange(): void {
    this.syncDefaultCurrency();
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
    const allowedCurrencyIds = this.createForm.controls.allowedCurrencyIds.value;
    const defaultCurrencyId = allowedCurrencyIds[0] ?? '';
    return this.fb.nonNullable.group({
      id: this.fb.nonNullable.control<string>(this.generateTempId()),
      name: ['', [Validators.required, Validators.minLength(2)]],
      currencyIds: this.fb.nonNullable.control<string[]>([...allowedCurrencyIds]),
      defaultCurrencyId: this.fb.nonNullable.control<string>(defaultCurrencyId),
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
        const unitCurrencyIds = this.normalizeIdList(unit.controls.currencyIds.value);
        const filtered = unitCurrencyIds.filter((id) => normalized.includes(id));
        const nextCurrencies = filtered.length > 0 ? filtered : normalized;
        unit.controls.currencyIds.setValue(nextCurrencies, { emitEvent: false });
        const unitDefault = unit.controls.defaultCurrencyId.value;
        if (!nextCurrencies.includes(unitDefault)) {
          unit.controls.defaultCurrencyId.setValue(nextCurrencies[0] ?? '', { emitEvent: false });
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
    const currencyIds = this.normalizeIdList(unit.controls.currencyIds.value);
    const defaultCurrencyId = this.resolveDefaultCurrencyId(
      currencyIds,
      unit.controls.defaultCurrencyId.value
    );
    this.createForm.controls.defaultCurrencyId.setValue(defaultCurrencyId, { emitEvent: false });
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

  private resolveDefaultEnterpriseId(
    enterprises: OrganizationCompanyEnterpriseInput[],
    requested: string,
  ): string | null {
    if (requested && enterprises.some((item) => item.id === requested)) {
      return requested;
    }
    return enterprises[0]?.id ?? null;
  }

  private resolveDefaultCurrencyId(currencyIds: string[], requested: string): string {
    if (requested && currencyIds.includes(requested)) {
      return requested;
    }
    return currencyIds[0] ?? '';
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

  private loadCoreSettings(orgId: string): void {
    this.organizationCoreApi.getCoreSettings(orgId).subscribe({
      next: ({ result }) => {
        const countries = result?.countries ?? [];
        const currencies = result?.currencies ?? [];
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
        this.syncCountryGroups(this.createForm.controls.operatingCountryIds.value);
        this.syncCurrencySelections(this.createForm.controls.allowedCurrencyIds.value);
      },
      error: () => {
        this.countryOptions = [];
        this.currencyOptions = [];
        this.messageService.add({
          severity: 'warn',
          summary: 'Organizacion',
          detail: 'No se pudieron cargar los paises y monedas de la organizacion.',
        });
      },
    });
  }

  private resetCompanyForm(): void {
    this.createForm.reset({
      name: '',
      legalName: '',
      taxId: '',
      operatingCountryIds: [],
      allowedCurrencyIds: [],
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
}


