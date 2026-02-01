import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { FloatLabel } from 'primeng/floatlabel';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { take } from 'rxjs';

import { CountriesApiService } from '../../../../core/api/countries-api.service';
import { OrganizationsService } from '../../../../core/api/organizations-api.service';
import { SetupStateService } from '../../services/setup-state.service';

@Component({
  selector: 'app-org-bootstrap-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, Button, Card, FloatLabel, InputText, Select],
  templateUrl: './org-bootstrap-page.component.html',
  styleUrl: './org-bootstrap-page.component.scss',
  providers: [MessageService],
})
export class OrgBootstrapPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly setupState = inject(SetupStateService);
  private readonly organizationsApi = inject(OrganizationsService);
  private readonly countriesApi = inject(CountriesApiService);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);

  countryOptions: Array<{ label: string; value: string }> = [];

  readonly form = this.fb.nonNullable.group({
    companyName: ['', [Validators.required, Validators.minLength(2)]],
    countryId: ['', [Validators.required]],
  });

  isSubmitting = false;
  isLoading = false;

  ngOnInit(): void {
    const draft = this.setupState.getOrganizationDraft();
    if (!draft) {
      this.router.navigate(['/org/setup/create']);
      return;
    }

    this.form.controls.countryId.setValue(draft.countryId ?? '');
    this.loadCountries(draft.countryId ?? '');
  }

  private loadCountries(selectedId: string): void {
    this.isLoading = true;
    this.countriesApi
      .list()
      .pipe(take(1))
      .subscribe({
        next: (response) => {
          const items = Array.isArray(response?.result) ? response.result : [];
          const options = items
            .map((country) => ({
              label: country.nameEs || country.nameEn || country.iso2,
              value: (country.id ?? country.iso2 ?? '').toString(),
            }))
            .filter((option) => option.value);
          this.countryOptions = selectedId
            ? options.filter((option) => option.value === selectedId)
            : options;
          this.isLoading = false;
        },
        error: () => {
          this.isLoading = false;
          this.countryOptions = [];
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudieron cargar los paises.',
          });
        },
      });
  }

  submit(): void {
    if (this.form.invalid || this.isSubmitting) {
      this.form.markAllAsTouched();
      return;
    }

    const draft = this.setupState.getOrganizationDraft();
    if (!draft) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Completa los datos de la organizacion antes de continuar.',
      });
      this.router.navigate(['/org/setup/create']);
      return;
    }

    const countryId = (draft.countryId ?? '').trim();
    const currencyId = (draft.currencyId ?? '').trim();
    if (!countryId || !currencyId) {
      this.isSubmitting = false;
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Selecciona pais y moneda para la organizacion.',
      });
      this.router.navigate(['/org/setup/create']);
      return;
    }

    this.isSubmitting = true;
    const formValue = this.form.getRawValue();
    const payload = {
      name: draft.name,
      countryIds: [countryId],
      currencyIds: [currencyId],
      companies: [
        {
          name: formValue.companyName.trim(),
          countryId: formValue.countryId,
          baseCurrencyId: currencyId,
          currencyIds: [currencyId],
        },
      ],
    };

    this.organizationsApi
      .bootstrap(payload)
      .pipe(take(1))
      .subscribe({
        next: (response) => {
          const organizationId = response?.result?.organization?.id;
          if (!organizationId) {
            this.isSubmitting = false;
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'No se recibio el identificador de la organizacion.',
            });
            return;
          }
          this.setupState.setOrganizationId(organizationId);
          this.isSubmitting = false;
          this.router.navigateByUrl('/org/setup', { state: { refresh: true } });
        },
        error: () => {
          this.isSubmitting = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo crear el bootstrap de la organizacion.',
          });
        },
      });
  }
}
