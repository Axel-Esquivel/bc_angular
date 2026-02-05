import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MessageService } from 'primeng/api';

import { BranchesApiService } from '../../../../core/api/branches-api.service';
import { CountriesApiService } from '../../../../core/api/countries-api.service';
import { Branch } from '../../../../shared/models/branch.model';
import { Country } from '../../../../shared/models/country.model';

@Component({
  selector: 'app-branches-page',
  templateUrl: './branches-page.component.html',
  styleUrl: './branches-page.component.scss',
  providers: [MessageService],
  standalone: false,
})
export class BranchesPageComponent implements OnInit {
  branches: Branch[] = [];
  loading = false;
  dialogOpen = false;
  submitting = false;
  editingBranch: Branch | null = null;
  companyId = '';

  countryOptions: Array<{ label: string; value: string }> = [];

  form!: FormGroup<{
    name: FormControl<string>;
    countryId: FormControl<string>;
    currencyIds: FormControl<string>;
  }>;

  constructor(
    private readonly branchesApi: BranchesApiService,
    private readonly countriesApi: CountriesApiService,
    private readonly route: ActivatedRoute,
    private readonly fb: FormBuilder,
    private readonly messageService: MessageService,
  ) {
    this.form = this.fb.nonNullable.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      countryId: ['', [Validators.required]],
      currencyIds: [''],
    });
  }

  ngOnInit(): void {
    this.companyId = this.route.parent?.snapshot.paramMap.get('id') ?? '';
    if (!this.companyId) {
      return;
    }
    this.loadBranches();
    this.loadCountries();
  }

  openCreate(): void {
    this.editingBranch = null;
    this.form.reset({ name: '', countryId: this.countryOptions[0]?.value ?? '', currencyIds: '' });
    this.dialogOpen = true;
  }

  openEdit(branch: Branch): void {
    this.editingBranch = branch;
    this.form.reset({
      name: branch.name,
      countryId: branch.countryId,
      currencyIds: (branch.currencyIds ?? []).join(', '),
    });
    this.dialogOpen = true;
  }

  save(): void {
    if (this.form.invalid || this.submitting || !this.companyId) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting = true;
    const payload = this.form.getRawValue();
    const currencyIds = payload.currencyIds
      ? payload.currencyIds.split(',').map((value) => value.trim()).filter(Boolean)
      : [];

    const request$ = this.editingBranch?.id
      ? this.branchesApi.update(this.editingBranch.id, {
          name: payload.name,
          countryId: payload.countryId,
          currencyIds,
        })
      : this.branchesApi.create(this.companyId, {
          name: payload.name,
          countryId: payload.countryId,
          currencyIds,
        });

    request$.subscribe({
      next: ({ result }) => {
        if (result) {
          const id = result.id ?? '';
          const index = this.branches.findIndex((item) => item.id === id);
          if (index >= 0) {
            this.branches[index] = result;
          } else {
            this.branches = [result, ...this.branches];
          }
        }
        this.dialogOpen = false;
        this.submitting = false;
      },
      error: () => {
        this.submitting = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Sucursales',
          detail: 'No se pudo guardar la sucursal.',
        });
      },
    });
  }

  private loadBranches(): void {
    this.loading = true;
    this.branchesApi.listByCompany(this.companyId).subscribe({
      next: ({ result }) => {
        this.branches = result ?? [];
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Sucursales',
          detail: 'No se pudieron cargar las sucursales.',
        });
      },
    });
  }

  private loadCountries(): void {
    this.countriesApi.list().subscribe({
      next: ({ result }) => {
        const countries = result ?? [];
        this.countryOptions = countries.map((country: Country) => ({
          label: `${country.nameEs} (${country.iso2})`,
          value: country.iso2,
        }));
        if (!this.form.controls.countryId.value && this.countryOptions.length > 0) {
          this.form.controls.countryId.setValue(this.countryOptions[0].value);
        }
      },
      error: () => {
        this.countryOptions = [];
      },
    });
  }
}
