import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';

import { CompaniesApiService } from '../../../../core/api/companies-api.service';
import { OrganizationsService } from '../../../../core/api/organizations-api.service';
import { Company } from '../../../../shared/models/company.model';
import { IOrganization } from '../../../../shared/models/organization.model';
import { CreateOrganizationCompanyDto } from '../../../../shared/models/organization-company.model';
import { OrganizationCoreApiService } from '../../../organizations/services/organization-core-api.service';
import { CoreCountry, CoreCurrency } from '../../../organizations/models/organization-core.models';

interface SelectOption {
  label: string;
  value: string;
}

interface EnterpriseDraft {
  id: string;
  name: string;
  countryId: string;
  currencyIds: string[];
  defaultCurrencyId: string;
}

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

  countryOptions: SelectOption[] = [];
  currencyOptions: SelectOption[] = [];
  enterpriseDrafts: EnterpriseDraft[] = [];

  operatingCountryControl: FormControl<string>;
  enterpriseCurrencyControl: FormControl<string>;

  createForm: FormGroup<{
    name: FormControl<string>;
    legalName: FormControl<string>;
    taxId: FormControl<string>;
    operatingCountryIds: FormControl<string[]>;
    defaultEnterpriseId: FormControl<string>;
    defaultCurrencyId: FormControl<string>;
  }>;

  enterpriseForm: FormGroup<{
    name: FormControl<string>;
    countryId: FormControl<string>;
    currencyIds: FormControl<string[]>;
    defaultCurrencyId: FormControl<string>;
  }>;

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
      defaultEnterpriseId: this.fb.nonNullable.control<string>(''),
      defaultCurrencyId: this.fb.nonNullable.control<string>(''),
    });

    this.enterpriseForm = this.fb.nonNullable.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      countryId: ['', [Validators.required]],
      currencyIds: this.fb.nonNullable.control<string[]>([]),
      defaultCurrencyId: this.fb.nonNullable.control<string>(''),
    });

    this.operatingCountryControl = this.fb.nonNullable.control<string>('');
    this.enterpriseCurrencyControl = this.fb.nonNullable.control<string>('');
  }

  ngOnInit(): void {
    const orgId = this.route.snapshot.paramMap.get('orgId');
    if (!orgId) {
      this.router.navigate(['/organizations']);
      return;
    }

    this.loadOrganization(orgId);
    this.loadCompanies(orgId);
    this.loadCoreSettings(orgId);
  }

  openCreateDialog(): void {
    this.resetCompanyForm();
    this.createDialogOpen = true;
  }

  addOperatingCountry(): void {
    const countryId = this.operatingCountryControl.value;
    if (!countryId) {
      return;
    }
    const current = this.createForm.controls.operatingCountryIds.value;
    const updated = this.normalizeIdList([...current, countryId]);
    this.createForm.controls.operatingCountryIds.setValue(updated);
  }

  removeOperatingCountry(countryId: string): void {
    const current = this.createForm.controls.operatingCountryIds.value;
    const updated = current.filter((item) => item !== countryId);
    this.createForm.controls.operatingCountryIds.setValue(updated);
  }

  addEnterpriseCurrency(): void {
    const currencyId = this.enterpriseCurrencyControl.value;
    if (!currencyId) {
      return;
    }
    const current = this.enterpriseForm.controls.currencyIds.value;
    const updated = this.normalizeIdList([...current, currencyId]);
    this.enterpriseForm.controls.currencyIds.setValue(updated);
    this.syncEnterpriseDefaultCurrency();
  }

  removeEnterpriseCurrency(currencyId: string): void {
    const current = this.enterpriseForm.controls.currencyIds.value;
    const updated = current.filter((item) => item !== currencyId);
    this.enterpriseForm.controls.currencyIds.setValue(updated);
    this.syncEnterpriseDefaultCurrency();
  }

  addEnterprise(): void {
    if (this.enterpriseForm.invalid) {
      this.enterpriseForm.markAllAsTouched();
      return;
    }

    const payload = this.enterpriseForm.getRawValue();
    const currencyIds = this.normalizeIdList(payload.currencyIds);
    if (currencyIds.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Empresas',
        detail: 'Selecciona al menos una moneda permitida.',
      });
      return;
    }

    const defaultCurrencyId =
      payload.defaultCurrencyId && currencyIds.includes(payload.defaultCurrencyId)
        ? payload.defaultCurrencyId
        : currencyIds[0];

    const enterprise: EnterpriseDraft = {
      id: this.generateTempId(),
      name: payload.name.trim(),
      countryId: payload.countryId,
      currencyIds,
      defaultCurrencyId,
    };

    this.enterpriseDrafts = [...this.enterpriseDrafts, enterprise];
    this.enterpriseForm.reset({
      name: '',
      countryId: payload.countryId,
      currencyIds: currencyIds,
      defaultCurrencyId,
    });

    if (!this.createForm.controls.defaultEnterpriseId.value) {
      this.createForm.controls.defaultEnterpriseId.setValue(enterprise.id);
    }

    this.syncDefaultCurrency();
  }

  removeEnterprise(id: string): void {
    this.enterpriseDrafts = this.enterpriseDrafts.filter((item) => item.id !== id);
    if (this.createForm.controls.defaultEnterpriseId.value === id) {
      const nextDefault = this.enterpriseDrafts[0]?.id ?? '';
      this.createForm.controls.defaultEnterpriseId.setValue(nextDefault);
    }
    this.syncDefaultCurrency();
  }

  onDefaultEnterpriseChange(): void {
    this.syncDefaultCurrency();
  }

  createCompany(): void {
    if (this.createForm.invalid || this.submitting || !this.organization?.id) {
      this.createForm.markAllAsTouched();
      return;
    }

    if (this.enterpriseDrafts.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Empresas',
        detail: 'Agrega al menos una empresa.',
      });
      return;
    }

    this.submitting = true;
    const formPayload = this.createForm.getRawValue();
    const defaultEnterpriseId = formPayload.defaultEnterpriseId || this.enterpriseDrafts[0].id;
    const defaultEnterprise =
      this.enterpriseDrafts.find((item) => item.id === defaultEnterpriseId) ?? this.enterpriseDrafts[0];
    const defaultCurrencyId = this.resolveDefaultCurrencyId(defaultEnterprise, formPayload.defaultCurrencyId);

    const operatingCountryIds = this.normalizeIdList([
      ...formPayload.operatingCountryIds,
      ...this.enterpriseDrafts.map((enterprise) => enterprise.countryId),
    ]);

    const payload: CreateOrganizationCompanyDto = {
      name: formPayload.name.trim(),
      legalName: formPayload.legalName.trim() || undefined,
      taxId: formPayload.taxId.trim() || undefined,
      baseCountryId: defaultEnterprise.countryId,
      baseCurrencyId: defaultCurrencyId,
      operatingCountryIds,
      enterprises: this.enterpriseDrafts.map((enterprise) => ({
        id: enterprise.id,
        name: enterprise.name,
        countryId: enterprise.countryId,
        currencyIds: enterprise.currencyIds,
        defaultCurrencyId: enterprise.defaultCurrencyId,
      })),
      defaultEnterpriseId,
      defaultCurrencyId,
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

  getEnterpriseCountryLabel(countryId: string): string {
    const match = this.countryOptions.find((item) => item.value === countryId);
    return match?.label ?? countryId;
  }

  getEnterpriseCurrencyLabel(currencyId: string): string {
    const match = this.currencyOptions.find((item) => item.value === currencyId);
    return match?.label ?? currencyId;
  }

  get defaultCurrencyOptions(): SelectOption[] {
    const defaultEnterpriseId = this.createForm.controls.defaultEnterpriseId.value;
    const enterprise = this.enterpriseDrafts.find((item) => item.id === defaultEnterpriseId);
    if (!enterprise) {
      return [];
    }
    return enterprise.currencyIds.map((id) => ({
      label: this.getEnterpriseCurrencyLabel(id),
      value: id,
    }));
  }

  get enterpriseDefaultCurrencyOptions(): SelectOption[] {
    return this.enterpriseForm.controls.currencyIds.value.map((id) => ({
      label: this.getEnterpriseCurrencyLabel(id),
      value: id,
    }));
  }

  private syncDefaultCurrency(): void {
    const defaultEnterpriseId = this.createForm.controls.defaultEnterpriseId.value;
    const enterprise = this.enterpriseDrafts.find((item) => item.id === defaultEnterpriseId) ?? this.enterpriseDrafts[0];
    if (!enterprise) {
      this.createForm.controls.defaultCurrencyId.setValue('');
      return;
    }

    const current = this.createForm.controls.defaultCurrencyId.value;
    const next = this.resolveDefaultCurrencyId(enterprise, current);
    this.createForm.controls.defaultCurrencyId.setValue(next);
  }

  private syncEnterpriseDefaultCurrency(): void {
    const current = this.enterpriseForm.controls.defaultCurrencyId.value;
    const currencyIds = this.enterpriseForm.controls.currencyIds.value;
    if (current && currencyIds.includes(current)) {
      return;
    }
    this.enterpriseForm.controls.defaultCurrencyId.setValue(currencyIds[0] ?? '');
  }

  private resolveDefaultCurrencyId(enterprise: EnterpriseDraft, requested: string): string {
    if (requested && enterprise.currencyIds.includes(requested)) {
      return requested;
    }
    if (enterprise.defaultCurrencyId && enterprise.currencyIds.includes(enterprise.defaultCurrencyId)) {
      return enterprise.defaultCurrencyId;
    }
    return enterprise.currencyIds[0] ?? '';
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
          label: country.code ? `${country.name} (${country.code})` : country.name,
          value: country.id,
        }));
        this.currencyOptions = currencies.map((currency: CoreCurrency) => ({
          label: currency.code ? `${currency.code} - ${currency.name}` : currency.name,
          value: currency.id,
        }));
        this.seedEnterpriseDefaults();
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
      defaultEnterpriseId: '',
      defaultCurrencyId: '',
    });
    this.operatingCountryControl.setValue('');
    this.enterpriseCurrencyControl.setValue('');
    this.enterpriseForm.reset({
      name: '',
      countryId: this.countryOptions[0]?.value ?? '',
      currencyIds: this.currencyOptions.length > 0 ? [this.currencyOptions[0].value] : [],
      defaultCurrencyId: this.currencyOptions[0]?.value ?? '',
    });
    this.enterpriseDrafts = [];
  }

  private seedEnterpriseDefaults(): void {
    if (this.countryOptions.length === 0 || this.currencyOptions.length === 0) {
      return;
    }
    if (!this.enterpriseForm.controls.countryId.value) {
      this.enterpriseForm.controls.countryId.setValue(this.countryOptions[0].value);
    }
    if (this.enterpriseForm.controls.currencyIds.value.length === 0) {
      this.enterpriseForm.controls.currencyIds.setValue([this.currencyOptions[0].value]);
    }
    if (!this.enterpriseForm.controls.defaultCurrencyId.value) {
      this.enterpriseForm.controls.defaultCurrencyId.setValue(this.currencyOptions[0].value);
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
