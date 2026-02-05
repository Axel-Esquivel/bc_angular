import { HttpErrorResponse } from '@angular/common/http';
import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';

import { CountriesApiService } from '../../../../core/api/countries-api.service';
import { OrganizationCoreApiService } from '../../../../core/api/organization-core-api.service';
import { ApiResponse } from '../../../../shared/models/api-response.model';
import { Country } from '../../../../shared/models/country.model';
import { CoreCountry } from '../../../../shared/models/organization-core.model';

@Component({
  selector: 'app-create-country-form',
  templateUrl: './create-country-form.component.html',
  standalone: false,
})
export class CreateCountryFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly countriesApi = inject(CountriesApiService);
  private readonly organizationCoreApi = inject(OrganizationCoreApiService);

  @Input() showActions = true;
  @Input() organizationId?: string | null;

  @Output() created = new EventEmitter<Country>();
  @Output() cancelled = new EventEmitter<void>();
  @Output() error = new EventEmitter<string>();

  readonly form = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(2)]],
    name: ['', [Validators.required, Validators.minLength(2)]],
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.emit('Completa los datos del pais.');
      return;
    }

    const { code, name } = this.form.getRawValue();
    const trimmedCode = code.trim().toUpperCase();
    const trimmedName = name.trim();
    if (trimmedCode.length !== 2) {
      this.error.emit('El codigo debe tener 2 letras.');
      return;
    }
    if (!trimmedName) {
      this.error.emit('El nombre es obligatorio.');
      return;
    }

    const payload = { code: trimmedCode, name: trimmedName };
    const request$: Observable<ApiResponse<CoreCountry>> = this.organizationId
      ? this.organizationCoreApi.addCountry(this.organizationId, payload)
      : this.countriesApi.create(payload).pipe(
          map((response) => ({
            ...response,
            result: {
              id: response?.result?.id ?? '',
              code: response?.result?.iso2 ?? trimmedCode,
              name:
                response?.result?.nameEs ||
                response?.result?.nameEn ||
                trimmedName,
            },
          }))
        );

    request$.pipe(take(1)).subscribe({
      next: (response: ApiResponse<CoreCountry>) => {
        const result = response?.result;
        const country: Country = result
          ? {
              id: result.id,
              iso2: result.code,
              iso3: '',
              nameEs: result.name,
              nameEn: result.name,
            }
          : {
              id: '',
              iso2: trimmedCode,
              iso3: '',
              nameEs: trimmedName,
              nameEn: trimmedName,
            };
        this.created.emit(country);
        this.form.reset({ code: '', name: '' });
      },
      error: (err: unknown) => {
        const status = err instanceof HttpErrorResponse ? err.status : null;
        if (status === 401 || status === 403) {
          this.error.emit('Sin permisos.');
          return;
        }
        this.error.emit('No se pudo crear el pais.');
      },
    });
  }

  cancel(): void {
    this.form.reset({ code: '', name: '' });
    this.cancelled.emit();
  }
}
