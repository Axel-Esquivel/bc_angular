import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';

import { CountriesApiService } from '../../../../core/api/countries-api.service';
import { CurrenciesApiService } from '../../../../core/api/currencies-api.service';
import { OrganizationsService } from '../../../../core/api/organizations-api.service';
import { Country } from '../../../../shared/models/country.model';
import { Currency } from '../../../../shared/models/currency.model';

type BranchType = 'retail' | 'wholesale';

interface WizardBranch {
  tempKey: string;
  name: string;
  countryId?: string;
  type: BranchType;
}

interface WizardWarehouse {
  name: string;
  branchTempKey?: string;
}

interface WizardCompany {
  tempId: string;
  name: string;
  countryId: string;
  branches: WizardBranch[];
  warehouses: WizardWarehouse[];
}

@Component({
  selector: 'app-organization-create-wizard',
  templateUrl: './organization-create-wizard.component.html',
  styleUrl: './organization-create-wizard.component.scss',
  providers: [MessageService],
  standalone: false,
})
export class OrganizationCreateWizardComponent implements OnInit {
  stepIndex = 0;
  submitting = false;

  organizationName = '';
  currencyIds: string[] = [];
  countryIds: string[] = [];

  countries: Country[] = [];
  currencies: Currency[] = [];

  companies: WizardCompany[] = [];
  selectedCompanyId = '';

  countryDialogOpen = false;
  currencyDialogOpen = false;
  savingCountry = false;
  savingCurrency = false;

  draftCountry = { code: '', name: '' };
  draftCurrency = { code: '', name: '', symbol: '' };

  newCompanyName = '';
  newCompanyCountryId = '';

  newBranchName = '';
  newBranchCountryId = '';
  newBranchType: BranchType = 'retail';

  newWarehouseName = '';
  newWarehouseBranchKey = '';

  constructor(
    private readonly organizationsApi: OrganizationsService,
    private readonly countriesApi: CountriesApiService,
    private readonly currenciesApi: CurrenciesApiService,
    private readonly router: Router,
    private readonly messageService: MessageService,
  ) {}

  ngOnInit(): void {
    this.countriesApi.list().subscribe({
      next: (res) => {
        this.countries = res.result ?? [];
      },
    });
    this.currenciesApi.list().subscribe({
      next: (res) => {
        this.currencies = res.result ?? [];
      },
    });
  }

  get currencyOptions(): Array<{ label: string; value: string }> {
    return this.currencies.map((currency) => ({
      label: currency.name ? `${currency.code} - ${currency.name}` : currency.code,
      value: currency.id ?? currency.code,
    }));
  }

  get countryOptions(): Array<{ label: string; value: string }> {
    return this.countries.map((country) => ({
      label: country.nameEs || country.nameEn || country.iso2,
      value: country.id ?? country.iso2,
    }));
  }

  get selectedCompany(): WizardCompany | null {
    return this.companies.find((company) => company.tempId === this.selectedCompanyId) ?? null;
  }

  get companyOptions(): Array<{ label: string; value: string }> {
    return this.companies.map((company) => ({ label: company.name, value: company.tempId }));
  }

  get branchOptions(): Array<{ label: string; value: string }> {
    const company = this.selectedCompany;
    if (!company) {
      return [];
    }
    return company.branches.map((branch) => ({ label: branch.name, value: branch.tempKey }));
  }

  nextStep(): void {
    if (!this.validateStep()) {
      return;
    }
    if (this.stepIndex === 3 && !this.selectedCompanyId && this.companies.length > 0) {
      this.selectedCompanyId = this.companies[0].tempId;
    }
    this.stepIndex += 1;
  }

  previousStep(): void {
    if (this.stepIndex > 0) {
      this.stepIndex -= 1;
    }
  }

  validateStep(): boolean {
    if (this.stepIndex === 0 && this.organizationName.trim().length < 2) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Organizacion',
        detail: 'Ingresa el nombre de la organizacion.',
      });
      return false;
    }

    if (this.stepIndex === 1 && this.currencyIds.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Monedas',
        detail: 'Selecciona al menos una moneda.',
      });
      return false;
    }

    if (this.stepIndex === 2 && this.countryIds.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Paises',
        detail: 'Selecciona al menos un pais.',
      });
      return false;
    }

    if (this.stepIndex === 3 && this.companies.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Companias',
        detail: 'Agrega al menos una compania.',
      });
      return false;
    }

    return true;
  }

  addCompany(): void {
    const name = this.newCompanyName.trim();
    if (!name || !this.newCompanyCountryId) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Compania',
        detail: 'Ingresa nombre y pais.',
      });
      return;
    }
    if (!this.countryIds.includes(this.newCompanyCountryId)) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Compania',
        detail: 'El pais debe estar seleccionado en el paso anterior.',
      });
      return;
    }

    const tempId = this.generateTempId();
    this.companies = [
      ...this.companies,
      { tempId, name, countryId: this.newCompanyCountryId, branches: [], warehouses: [] },
    ];
    this.selectedCompanyId = tempId;
    this.newCompanyName = '';
    this.newCompanyCountryId = '';
  }

  removeCompany(tempId: string): void {
    this.companies = this.companies.filter((company) => company.tempId !== tempId);
    if (this.selectedCompanyId === tempId) {
      this.selectedCompanyId = this.companies[0]?.tempId ?? '';
    }
  }

  addBranch(): void {
    const company = this.selectedCompany;
    const name = this.newBranchName.trim();
    if (!company || !name) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Sucursal',
        detail: 'Selecciona una compania y escribe el nombre.',
      });
      return;
    }

    const tempKey = this.generateTempId();
    const branchCountryId = this.newBranchCountryId || company.countryId;
    company.branches = [
      ...company.branches,
      { tempKey, name, countryId: branchCountryId, type: this.newBranchType },
    ];
    this.newBranchName = '';
    this.newBranchCountryId = '';
    this.newBranchType = 'retail';
  }

  removeBranch(tempKey: string): void {
    const company = this.selectedCompany;
    if (!company) {
      return;
    }
    company.branches = company.branches.filter((branch) => branch.tempKey !== tempKey);
    company.warehouses = company.warehouses.filter((warehouse) => warehouse.branchTempKey !== tempKey);
  }

  addWarehouse(): void {
    const company = this.selectedCompany;
    const name = this.newWarehouseName.trim();
    if (!company || !name) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Bodega',
        detail: 'Selecciona una compania y escribe el nombre.',
      });
      return;
    }
    if (company.branches.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Bodega',
        detail: 'Agrega una sucursal primero.',
      });
      return;
    }

    const branchKey = this.newWarehouseBranchKey || company.branches[0].tempKey;
    company.warehouses = [...company.warehouses, { name, branchTempKey: branchKey }];
    this.newWarehouseName = '';
    this.newWarehouseBranchKey = '';
  }

  removeWarehouse(index: number): void {
    const company = this.selectedCompany;
    if (!company) {
      return;
    }
    company.warehouses = company.warehouses.filter((_, idx) => idx !== index);
  }

  openCreateCountryDialog(): void {
    this.draftCountry = { code: '', name: '' };
    this.countryDialogOpen = true;
  }

  openCreateCurrencyDialog(): void {
    this.draftCurrency = { code: '', name: '', symbol: '' };
    this.currencyDialogOpen = true;
  }

  saveCountry(): void {
    const code = this.draftCountry.code.trim().toUpperCase();
    const name = this.draftCountry.name.trim();
    if (!code || !name) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Paises',
        detail: 'Ingresa codigo y nombre.',
      });
      return;
    }
    if (this.savingCountry) {
      return;
    }
    this.savingCountry = true;
    this.countriesApi.create({ code, name }).subscribe({
      next: (res) => {
        const country = res.result;
        if (country) {
          const id = country.id ?? country.iso2;
          this.countries = [country, ...this.countries];
          if (!this.countryIds.includes(id)) {
            this.countryIds = [...this.countryIds, id];
          }
        }
        this.countryDialogOpen = false;
        this.savingCountry = false;
      },
      error: () => {
        this.savingCountry = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Paises',
          detail: 'No se pudo crear el pais.',
        });
      },
    });
  }

  saveCurrency(): void {
    const code = this.draftCurrency.code.trim().toUpperCase();
    const name = this.draftCurrency.name.trim();
    const symbol = this.draftCurrency.symbol.trim();
    if (!code || !name) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Monedas',
        detail: 'Ingresa codigo y nombre.',
      });
      return;
    }
    if (this.savingCurrency) {
      return;
    }
    this.savingCurrency = true;
    this.currenciesApi.create({ code, name, symbol: symbol || undefined }).subscribe({
      next: (res) => {
        const currency = res.result;
        if (currency) {
          const id = currency.id ?? currency.code;
          this.currencies = [currency, ...this.currencies];
          if (!this.currencyIds.includes(id)) {
            this.currencyIds = [...this.currencyIds, id];
          }
        }
        this.currencyDialogOpen = false;
        this.savingCurrency = false;
      },
      error: () => {
        this.savingCurrency = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Monedas',
          detail: 'No se pudo crear la moneda.',
        });
      },
    });
  }

  submit(): void {
    if (!this.validateStep() || this.submitting) {
      return;
    }
    if (this.stepIndex < 4) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Wizard',
        detail: 'Completa todos los pasos.',
      });
      return;
    }

    const payload = {
      name: this.organizationName.trim(),
      currencyIds: [...this.currencyIds],
      countryIds: [...this.countryIds],
      companies: this.companies.map((company) => ({
        name: company.name,
        countryId: company.countryId,
        baseCurrencyId: this.currencyIds[0],
        currencyIds: [...this.currencyIds],
        branches: company.branches.map((branch) => ({
          name: branch.name,
          tempKey: branch.tempKey,
          countryId: branch.countryId,
          type: branch.type,
        })),
        warehouses: company.warehouses.map((warehouse) => ({
          name: warehouse.name,
          branchTempKey: warehouse.branchTempKey,
        })),
      })),
    };

    this.submitting = true;
    this.organizationsApi.bootstrap(payload).subscribe({
      next: (res) => {
        this.submitting = false;
        const organizationId = res.result?.organization?.id;
        const firstCompanyId = res.result?.companies?.[0]?.id;
        if (organizationId) {
          const queryParams: { orgId: string; companyId?: string } = { orgId: organizationId };
          if (firstCompanyId) {
            queryParams.companyId = firstCompanyId;
          }
          this.router.navigate(['/setup/modules'], { queryParams });
          return;
        }
        this.router.navigateByUrl('/organizations');
      },
      error: () => {
        this.submitting = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Organizacion',
          detail: 'No se pudo crear la organizacion.',
        });
      },
    });
  }

  cancel(): void {
    this.router.navigateByUrl('/organizations');
  }

  private generateTempId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return `tmp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }
}
