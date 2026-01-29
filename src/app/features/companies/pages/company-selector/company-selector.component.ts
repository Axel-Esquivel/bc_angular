import { Location } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';

import { CompaniesApiService } from '../../../../core/api/companies-api.service';
import { UsersApiService } from '../../../../core/api/users-api.service';
import { CompanyStateService } from '../../../../core/company/company-state.service';
import { ActiveContextStateService } from '../../../../core/context/active-context-state.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { Company } from '../../../../shared/models/company.model';
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
  selector: 'app-company-selector',
  templateUrl: './company-selector.component.html',
  styleUrl: './company-selector.component.scss',
  providers: [MessageService],
  standalone: false,
})
export class CompanySelectorComponent implements OnInit {
  organizationId: string | null = null;
  companies: Company[] = [];
  selectedCompany: Company | null = null;
  loadingCompanies = false;
  loadingCore = false;

  createCompanyDialogOpen = false;
  submitting = false;

  countryOptions: SelectOption[] = [];
  currencyOptions: SelectOption[] = [];

  enterpriseDrafts: EnterpriseDraft[] = [];

  operatingCountryControl: FormControl<string>;
  enterpriseCurrencyControl: FormControl<string>;

  private backUrl = '/dashboard';

  createCompanyForm: FormGroup<{
    name: FormControl<string>;
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
    this.createCompanyForm = this.fb.nonNullable.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
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

    const nav = this.router.getCurrentNavigation();
    const previousUrl = nav?.previousNavigation?.finalUrl?.toString();
    if (previousUrl?.startsWith('/organizations')) {
      this.backUrl = '/organizations';
    } else if (previousUrl) {
      this.backUrl = previousUrl;
    }
  }

  ngOnInit(): void {
    const context = this.activeContextState.getActiveContext();
    const fallbackOrg = this.authService.getCurrentUser()?.defaultOrganizationId ?? null;
    this.organizationId = context.organizationId ?? fallbackOrg;

    if (!this.organizationId) {
      this.router.navigateByUrl('/organizations/select');
      return;
    }

    this.loadCompanies(this.organizationId);
    this.loadCoreSettings(this.organizationId);
  }

  selectCompany(): void {
    const companyId = this.selectedCompany?.id;
    if (!companyId) {
      return;
    }

    this.submitting = true;
    this.usersApi.setDefaultWorkspace(companyId).subscribe({
      next: () => {
        this.companyState.setActiveCompanyId(companyId);
        this.companyState.setDefaultCompanyId(companyId);
        this.authService.refreshToken().subscribe({
          next: () => {
            this.submitting = false;
            this.router.navigateByUrl(`/company/${companyId}/dashboard`);
          },
          error: () => {
            this.submitting = false;
            this.router.navigateByUrl(`/company/${companyId}/dashboard`);
          },
        });
      },
      error: () => {
        this.submitting = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Companias',
          detail: 'No se pudo marcar la compania por defecto.',
        });
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

  addOperatingCountry(): void {
    const countryId = this.operatingCountryControl.value;
    if (!countryId) {
      return;
    }
    const current = this.createCompanyForm.controls.operatingCountryIds.value;
    const updated = this.normalizeIdList([...current, countryId]);
    this.createCompanyForm.controls.operatingCountryIds.setValue(updated);
  }

  removeOperatingCountry(countryId: string): void {
    const current = this.createCompanyForm.controls.operatingCountryIds.value;
    const updated = current.filter((item) => item !== countryId);
    this.createCompanyForm.controls.operatingCountryIds.setValue(updated);
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
      currencyIds: currencyIds,
      defaultCurrencyId: defaultCurrencyId,
    };

    this.enterpriseDrafts = [...this.enterpriseDrafts, enterprise];
    this.enterpriseForm.reset({
      name: '',
      countryId: payload.countryId,
      currencyIds: currencyIds,
      defaultCurrencyId: defaultCurrencyId,
    });

    if (!this.createCompanyForm.controls.defaultEnterpriseId.value) {
      this.createCompanyForm.controls.defaultEnterpriseId.setValue(enterprise.id);
    }

    this.syncDefaultCurrency();
  }

  removeEnterprise(id: string): void {
    this.enterpriseDrafts = this.enterpriseDrafts.filter((item) => item.id !== id);
    if (this.createCompanyForm.controls.defaultEnterpriseId.value === id) {
      const nextDefault = this.enterpriseDrafts[0]?.id ?? '';
      this.createCompanyForm.controls.defaultEnterpriseId.setValue(nextDefault);
    }
    this.syncDefaultCurrency();
  }

  onDefaultEnterpriseChange(): void {
    this.syncDefaultCurrency();
  }

  createCompany(): void {
    if (this.createCompanyForm.invalid || this.submitting || !this.organizationId) {
      this.createCompanyForm.markAllAsTouched();
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

    const formPayload = this.createCompanyForm.getRawValue();
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

    this.submitting = true;
    this.companiesApi
      .create(this.organizationId, payload)
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

  getEnterpriseCountryLabel(countryId: string): string {
    const match = this.countryOptions.find((item) => item.value === countryId);
    return match?.label ?? countryId;
  }

  getEnterpriseCurrencyLabel(currencyId: string): string {
    const match = this.currencyOptions.find((item) => item.value === currencyId);
    return match?.label ?? currencyId;
  }

  get defaultCurrencyOptions(): SelectOption[] {
    const defaultEnterpriseId = this.createCompanyForm.controls.defaultEnterpriseId.value;
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
    const defaultEnterpriseId = this.createCompanyForm.controls.defaultEnterpriseId.value;
    const enterprise = this.enterpriseDrafts.find((item) => item.id === defaultEnterpriseId) ?? this.enterpriseDrafts[0];
    if (!enterprise) {
      this.createCompanyForm.controls.defaultCurrencyId.setValue('');
      return;
    }

    const current = this.createCompanyForm.controls.defaultCurrencyId.value;
    const next = this.resolveDefaultCurrencyId(enterprise, current);
    this.createCompanyForm.controls.defaultCurrencyId.setValue(next);
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
          label: country.code ? `${country.name} (${country.code})` : country.name,
          value: country.id,
        }));
        this.currencyOptions = currencies.map((currency: CoreCurrency) => ({
          label: currency.code ? `${currency.code} - ${currency.name}` : currency.name,
          value: currency.id,
        }));
        this.loadingCore = false;
        this.seedEnterpriseDefaults();
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

  private resetCompanyForm(): void {
    this.createCompanyForm.reset({
      name: '',
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
