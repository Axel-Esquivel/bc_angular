import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { ActiveContextStateService } from '../../../../core/context/active-context-state.service';
import { CompaniesApiService } from '../../../../core/api/companies-api.service';
import { OrganizationsService } from '../../../../core/api/organizations-api.service';
import { OrganizationCoreApiService } from '../../../../core/api/organization-core-api.service';
import { PriceListsService } from '../../services/price-lists.service';
import {
  CreatePriceListPayload,
  PriceList,
  UpdatePriceListPayload,
} from '../../models/price-list.model';
import { CoreCurrency } from '../../../../shared/models/organization-core.model';

interface SelectOption {
  label: string;
  value: string;
}

@Component({
  selector: 'app-price-list-form-page',
  standalone: false,
  templateUrl: './price-list-form-page.component.html',
  styleUrl: './price-list-form-page.component.scss',
})
export class PriceListFormPageComponent implements OnInit {
  private readonly priceListsService = inject(PriceListsService);
  private readonly activeContextState = inject(ActiveContextStateService);
  private readonly companiesApi = inject(CompaniesApiService);
  private readonly organizationsApi = inject(OrganizationsService);
  private readonly organizationCoreApi = inject(OrganizationCoreApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  priceList: PriceList | null = null;
  companyOptions: SelectOption[] = [];
  currencyOptions: SelectOption[] = [];
  defaultCurrencyId: string | null = null;
  organizationId: string | null = null;
  organizationName: string | null = null;
  companyId: string | null = null;
  enterpriseId: string | null = null;

  loading = false;
  saving = false;
  contextMissing = false;
  errorMessage: string | null = null;

  get isEditMode(): boolean {
    return Boolean(this.priceListId);
  }

  private priceListId: string | null = null;

  ngOnInit(): void {
    const context = this.activeContextState.getActiveContext();
    this.organizationId = context.organizationId ?? null;
    this.companyId = context.companyId ?? null;
    this.defaultCurrencyId = context.currencyId ?? null;
    this.enterpriseId = context.enterpriseId ?? null;
    this.contextMissing = !this.organizationId;

    this.priceListId = this.route.snapshot.paramMap.get('id');

    this.loadOrganizationName();
    this.loadCompanies();
    this.loadCurrencies();
    if (this.priceListId) {
      this.loadPriceList(this.priceListId);
    }
  }

  onSave(payload: CreatePriceListPayload): void {
    if (!payload.OrganizationId || !payload.companyId) {
      this.errorMessage = 'Selecciona organización y empresa.';
      return;
    }

    this.saving = true;
    this.errorMessage = null;

    const request$ = this.priceListId
      ? this.priceListsService.update(this.priceListId, this.toUpdatePayload(payload))
      : this.priceListsService.create(payload);

    request$.subscribe({
      next: () => {
        this.saving = false;
        void this.router.navigateByUrl('/app/price-lists');
      },
      error: () => {
        this.saving = false;
        this.errorMessage = 'No se pudo guardar la lista de precios.';
      },
    });
  }

  onCancel(): void {
    void this.router.navigateByUrl('/app/price-lists');
  }

  private loadPriceList(id: string): void {
    this.loading = true;
    this.priceListsService.getById(id).subscribe({
      next: ({ result }) => {
        this.priceList = result ?? null;
        if (this.priceList) {
          this.organizationId = this.priceList.OrganizationId;
          this.companyId = this.priceList.companyId;
          this.loadOrganizationName();
          this.loadCompanies();
          this.loadCurrencies();
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'No se pudo cargar la lista de precios.';
      },
    });
  }

  private loadCompanies(): void {
    if (!this.organizationId) {
      this.companyOptions = [];
      return;
    }

    this.companiesApi.listByOrganization(this.organizationId).subscribe({
      next: ({ result }) => {
        const companies = Array.isArray(result) ? result : [];
        this.companyOptions = companies
          .filter((company) => !!company.id)
          .map((company) => ({ label: company.name ?? company.id ?? '', value: company.id ?? '' }));
        if (!this.companyId && this.companyOptions.length > 0) {
          this.companyId = this.companyOptions[0].value;
        }
      },
      error: () => {
        this.companyOptions = [];
      },
    });
  }

  private loadOrganizationName(): void {
    if (!this.organizationId) {
      this.organizationName = null;
      return;
    }
    this.organizationsApi.getById(this.organizationId).subscribe({
      next: ({ result }) => {
        this.organizationName = result?.name ?? this.organizationId;
      },
      error: () => {
        this.organizationName = this.organizationId;
      },
    });
  }

  private loadCurrencies(): void {
    if (!this.organizationId) {
      this.currencyOptions = [];
      return;
    }

    this.organizationCoreApi.getCoreSettings(this.organizationId).subscribe({
      next: ({ result }) => {
        const currencies = result?.currencies ?? [];
        this.currencyOptions = this.buildCurrencyOptions(currencies);
        if (!this.defaultCurrencyId && this.currencyOptions.length > 0) {
          this.defaultCurrencyId = this.currencyOptions[0].value;
        }
      },
      error: () => {
        this.currencyOptions = [];
      },
    });
  }

  private buildCurrencyOptions(currencies: CoreCurrency[]): SelectOption[] {
    return currencies.map((currency) => ({
      value: currency.id,
      label: currency.symbol
        ? `${currency.name.toUpperCase()} (${currency.symbol})`
        : `${currency.name.toUpperCase()} (${currency.code})`,
    }));
  }

  private toUpdatePayload(payload: CreatePriceListPayload): UpdatePriceListPayload {
    return {
      name: payload.name,
      description: payload.description,
      items: payload.items,
      OrganizationId: payload.OrganizationId,
      companyId: payload.companyId,
    };
  }
}
