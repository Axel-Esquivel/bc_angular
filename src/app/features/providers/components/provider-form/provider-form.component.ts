import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';

import { CreateOrUpdateProviderDto, Provider, ProviderStatus } from '../../../../shared/models/provider.model';

interface ProviderStatusOption {
  label: string;
  value: ProviderStatus;
}

type ProviderFormGroup = FormGroup<{
  name: FormControl<string>;
  nit: FormControl<string | null>;
  address: FormControl<string | null>;
  creditDays: FormControl<number | null>;
  creditLimit: FormControl<number | null>;
  status: FormControl<ProviderStatus>;
}>;

@Component({
  selector: 'app-provider-form',
  standalone: false,
  templateUrl: './provider-form.component.html',
  styleUrl: './provider-form.component.scss',
})
export class ProviderFormComponent implements OnChanges {
  private readonly fb = inject(FormBuilder);

  @Input() provider?: Provider;
  @Output() save = new EventEmitter<CreateOrUpdateProviderDto>();
  @Output() cancel = new EventEmitter<void>();

  readonly statusOptions: ProviderStatusOption[] = [
    { label: 'Activo', value: 'active' },
    { label: 'Inactivo', value: 'inactive' },
  ];

  readonly form: ProviderFormGroup = this.fb.group({
    name: this.fb.nonNullable.control('', { validators: [Validators.required] }),
    nit: this.fb.control<string | null>(null),
    address: this.fb.control<string | null>(null),
    creditDays: this.fb.control<number | null>(null),
    creditLimit: this.fb.control<number | null>(null),
    status: this.fb.nonNullable.control<ProviderStatus>('active'),
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['provider']) {
      this.applyProvider(this.provider);
    }
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const payload: CreateOrUpdateProviderDto = {
      name: raw.name.trim(),
      nit: raw.nit?.trim() || undefined,
      address: raw.address?.trim() || undefined,
      creditDays: raw.creditDays ?? undefined,
      creditLimit: raw.creditLimit ?? undefined,
      status: raw.status,
    };

    this.save.emit(payload);
  }

  onCancel(): void {
    this.cancel.emit();
  }

  private applyProvider(provider?: Provider): void {
    if (!provider) {
      this.form.reset({
        name: '',
        nit: null,
        address: null,
        creditDays: null,
        creditLimit: null,
        status: 'active',
      });
      return;
    }

    this.form.reset({
      name: provider.name ?? '',
      nit: provider.nit ?? null,
      address: provider.address ?? null,
      creditDays: provider.creditDays ?? null,
      creditLimit: provider.creditLimit ?? null,
      status: provider.status ?? 'active',
    });
  }
}
