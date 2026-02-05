import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { MessageService } from 'primeng/api';
import { take } from 'rxjs/operators';

import { OrganizationCoreApiService } from '../../../../core/api/organization-core-api.service';
import { Country } from '../../../../shared/models/country.model';
import { Currency } from '../../../../shared/models/currency.model';
import { CoreCountry, CoreCurrency } from '../../../../shared/models/organization-core.model';
@Component({
  selector: 'app-org-step-countries-currencies',
  templateUrl: './org-step-countries-currencies.component.html',
  styleUrl: './org-step-countries-currencies.component.scss',
  standalone: false,
})
export class OrgStepCountriesCurrenciesComponent implements OnChanges {
  private readonly organizationCoreApi = inject(OrganizationCoreApiService);
  private readonly messageService = inject(MessageService);

  @Input() organizationId: string | null = null;

  @Output() readyChange = new EventEmitter<boolean>();

  countries: SelectOption[] = [];
  currencies: SelectOption[] = [];

  isLoading = false;
  isCountryDialogOpen = false;
  isCurrencyDialogOpen = false;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['organizationId']) {
      this.loadCoreSettings();
    }
  }

  get hasOrganization(): boolean {
    return Boolean(this.organizationId);
  }

  get isReady(): boolean {
    return this.countries.length > 0 && this.currencies.length > 0;
  }

  openCreateCountryDialog(): void {
    if (!this.organizationId) {
      this.messageService.add({
        severity: 'info',
        summary: 'Atencion',
        detail: 'Primero crea la organizacion.',
      });
      return;
    }
    this.isCountryDialogOpen = true;
  }

  openCreateCurrencyDialog(): void {
    if (!this.organizationId) {
      this.messageService.add({
        severity: 'info',
        summary: 'Atencion',
        detail: 'Primero crea la organizacion.',
      });
      return;
    }
    this.isCurrencyDialogOpen = true;
  }

  onCountryCreated(_: Country): void {
    this.loadCoreSettings();
    this.messageService.add({ severity: 'success', summary: 'Listo', detail: 'Pais creado.' });
  }

  onCurrencyCreated(_: Currency): void {
    this.loadCoreSettings();
    this.messageService.add({ severity: 'success', summary: 'Listo', detail: 'Moneda creada.' });
  }

  onDialogError(message: string): void {
    this.messageService.add({ severity: 'error', summary: 'Error', detail: message });
  }

  getCountryLabel(country: SelectOption): string {
    const code = country.code ? country.code.toUpperCase() : '';
    return code ? `${country.name} (${code})` : country.name;
  }

  getCurrencyLabel(currency: SelectOption): string {
    const symbolOrCode = currency.symbol || currency.code || '';
    return symbolOrCode ? `${currency.name} (${symbolOrCode})` : currency.name;
  }

  private loadCoreSettings(): void {
    if (!this.organizationId) {
      this.countries = [];
      this.currencies = [];
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
          this.isLoading = false;
          this.readyChange.emit(this.isReady);
        },
        error: () => {
          this.countries = [];
          this.currencies = [];
          this.isLoading = false;
          this.readyChange.emit(false);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudieron cargar los datos de paises y monedas.',
          });
        },
      });
  }
}

interface SelectOption {
  id: string;
  name: string;
  code?: string;
  symbol?: string;
}
