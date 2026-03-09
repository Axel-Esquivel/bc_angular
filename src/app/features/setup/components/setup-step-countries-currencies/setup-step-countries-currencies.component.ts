import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { take } from 'rxjs/operators';

import { OrganizationCoreApiService } from '../../../../core/api/organization-core-api.service';
import { PackagingName, PackagingNamesApiService } from '../../../../core/api/packaging-names-api.service';
import { Country } from '../../../../shared/models/country.model';
import { Currency } from '../../../../shared/models/currency.model';
import { CoreCountry, CoreCurrency } from '../../../../shared/models/organization-core.model';
@Component({
  selector: 'app-setup-step-countries-currencies',
  templateUrl: './setup-step-countries-currencies.component.html',
  styleUrl: './setup-step-countries-currencies.component.scss',
  standalone: false,
})
export class SetupStepCountriesCurrenciesComponent implements OnChanges {
  private readonly organizationCoreApi = inject(OrganizationCoreApiService);
  private readonly packagingNamesApi = inject(PackagingNamesApiService);
  private readonly messageService = inject(MessageService);
  private readonly fb = inject(FormBuilder);

  @Input() organizationId: string | null = null;
  @Input() refreshToken = 0;

  @Output() readyChange = new EventEmitter<boolean>();
  @Output() editCountry = new EventEmitter<SelectOption>();
  @Output() deleteCountry = new EventEmitter<SelectOption>();
  @Output() editCurrency = new EventEmitter<SelectOption>();
  @Output() deleteCurrency = new EventEmitter<SelectOption>();

  countries: SelectOption[] = [];
  currencies: SelectOption[] = [];
  packagingNames: PackagingName[] = [];

  isLoading = false;
  isCountryDialogOpen = false;
  isCurrencyDialogOpen = false;
  isPackagingDialogOpen = false;

  readonly packagingForm: PackagingFormGroup = this.fb.group({
    name: this.fb.nonNullable.control('', [Validators.required]),
    multiplier: this.fb.control<number | null>(1, [Validators.required, Validators.min(1)]),
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['organizationId']) {
      this.loadCoreSettings();
    }
    if (changes['refreshToken'] && !changes['refreshToken'].firstChange) {
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
        detail: 'Primero crea la organizaci?n.',
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
        detail: 'Primero crea la organizaci?n.',
      });
      return;
    }
    this.isCurrencyDialogOpen = true;
  }

  openCreatePackagingDialog(): void {
    if (!this.organizationId) {
      this.messageService.add({
        severity: 'info',
        summary: 'Atencion',
        detail: 'Primero crea la organizaci?n.',
      });
      return;
    }
    this.packagingForm.reset({ name: '', multiplier: 1 });
    this.isPackagingDialogOpen = true;
  }

  onCountryCreated(_: Country): void {
    this.loadCoreSettings();
    this.messageService.add({ severity: 'success', summary: 'Listo', detail: 'Pa?s creado.' });
  }

  onCurrencyCreated(_: Currency): void {
    this.loadCoreSettings();
    this.messageService.add({ severity: 'success', summary: 'Listo', detail: 'Moneda creada.' });
  }

  onPackagingCreated(): void {
    this.loadCoreSettings();
    this.messageService.add({ severity: 'success', summary: 'Listo', detail: 'Empaque creado.' });
  }

  onDialogError(message: string): void {
    this.messageService.add({ severity: 'error', summary: 'Error', detail: message });
  }

  submitPackagingForm(): void {
    if (!this.organizationId) {
      return;
    }
    if (this.packagingForm.invalid) {
      this.packagingForm.markAllAsTouched();
      return;
    }
    const raw = this.packagingForm.getRawValue();
    const payload = {
      organizationId: this.organizationId,
      name: raw.name.trim(),
      multiplier: raw.multiplier ?? 1,
      isActive: true,
    };
    this.packagingNamesApi.create(payload).pipe(take(1)).subscribe({
      next: () => {
        this.isPackagingDialogOpen = false;
        this.onPackagingCreated();
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo crear el empaque.',
        });
      },
    });
  }

  getCountryLabel(country: SelectOption): string {
    const code = country.code ? country.code.toUpperCase() : '';
    return code ? `${country.name} (${code})` : country.name;
  }

  getCurrencyLabel(currency: SelectOption): string {
    const symbolOrCode = currency.symbol || currency.code || '';
    return symbolOrCode ? `${currency.name} (${symbolOrCode})` : currency.name;
  }

  getPackagingLabel(item: PackagingName): string {
    const multiplier = item.multiplier ?? 1;
    return `${item.name} (x${multiplier})`;
  }

  private loadCoreSettings(): void {
    if (!this.organizationId) {
      this.countries = [];
      this.currencies = [];
      this.packagingNames = [];
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
          this.loadPackagingNames();
          this.isLoading = false;
          this.readyChange.emit(this.isReady);
        },
        error: () => {
          this.countries = [];
          this.currencies = [];
          this.packagingNames = [];
          this.isLoading = false;
          this.readyChange.emit(false);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudieron cargar los datos de pa?ses y monedas.',
          });
        },
      });
  }

  private loadPackagingNames(): void {
    if (!this.organizationId) {
      this.packagingNames = [];
      return;
    }
    this.packagingNamesApi.list(this.organizationId).pipe(take(1)).subscribe({
      next: ({ result }) => {
        this.packagingNames = Array.isArray(result) ? result : [];
      },
      error: () => {
        this.packagingNames = [];
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

type PackagingFormGroup = FormGroup<{
  name: FormControl<string>;
  multiplier: FormControl<number | null>;
}>;
