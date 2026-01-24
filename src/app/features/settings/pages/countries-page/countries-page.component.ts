import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';

import { CountriesApiService } from '../../../../core/api/countries-api.service';
import { Country } from '../../../../shared/models/country.model';

@Component({
  selector: 'app-countries-page',
  templateUrl: './countries-page.component.html',
  styleUrl: './countries-page.component.scss',
  providers: [MessageService],
  standalone: false,
})
export class CountriesPageComponent implements OnInit {
  countries: Country[] = [];
  loading = false;
  dialogOpen = false;
  submitting = false;
  editingCountry: Country | null = null;

  form!: FormGroup<{
    iso2: FormControl<string>;
    iso3: FormControl<string>;
    nameEs: FormControl<string>;
    nameEn: FormControl<string>;
    phoneCode: FormControl<string>;
  }>;

  constructor(
    private readonly countriesApi: CountriesApiService,
    private readonly fb: FormBuilder,
    private readonly messageService: MessageService,
  ) {
    this.form = this.fb.nonNullable.group({
      iso2: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(2)]],
      iso3: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(3)]],
      nameEs: ['', [Validators.required]],
      nameEn: ['', [Validators.required]],
      phoneCode: [''],
    });
  }

  ngOnInit(): void {
    this.loadCountries();
  }

  loadCountries(): void {
    this.loading = true;
    this.countriesApi.list().subscribe({
      next: ({ result }) => {
        this.countries = result ?? [];
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Paises',
          detail: 'No se pudieron cargar los paises.',
        });
      },
    });
  }

  openCreate(): void {
    this.editingCountry = null;
    this.form.reset();
    this.dialogOpen = true;
  }

  openEdit(country: Country): void {
    this.editingCountry = country;
    this.form.reset({
      iso2: country.iso2,
      iso3: country.iso3,
      nameEs: country.nameEs,
      nameEn: country.nameEn,
      phoneCode: country.phoneCode ?? '',
    });
    this.dialogOpen = true;
  }

  save(): void {
    if (this.form.invalid || this.submitting) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting = true;
    const payload = this.form.getRawValue();

    const request$ = this.editingCountry?.id
      ? this.countriesApi.update(this.editingCountry.id, payload)
      : this.countriesApi.create(payload);

    request$.subscribe({
      next: ({ result }) => {
        if (result) {
          const id = result.id ?? result.iso2;
          const existing = this.countries.findIndex((item) => (item.id ?? item.iso2) === id);
          if (existing >= 0) {
            this.countries[existing] = result;
          } else {
            this.countries = [result, ...this.countries];
          }
        }
        this.dialogOpen = false;
        this.submitting = false;
      },
      error: () => {
        this.submitting = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Paises',
          detail: 'No se pudo guardar el pais.',
        });
      },
    });
  }
}
