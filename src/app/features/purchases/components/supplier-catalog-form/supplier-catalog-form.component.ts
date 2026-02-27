import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  inject,
} from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';

import {
  CreateSupplierCatalogDto,
  SupplierCatalogBonusType,
  SupplierCatalogItem,
  SupplierCatalogStatus,
} from '../../../../shared/models/supplier-catalog.model';

interface SelectOption {
  label: string;
  value: string;
}

interface BonusOption {
  label: string;
  value: SupplierCatalogBonusType;
}

interface StatusOption {
  label: string;
  value: SupplierCatalogStatus;
}

type SupplierCatalogFormGroup = FormGroup<{
  variantId: FormControl<string>;
  unitCost: FormControl<number | null>;
  currency: FormControl<string | null>;
  freightCost: FormControl<number | null>;
  bonusType: FormControl<SupplierCatalogBonusType>;
  bonusValue: FormControl<number | null>;
  minQty: FormControl<number | null>;
  leadTimeDays: FormControl<number | null>;
  validFrom: FormControl<Date | null>;
  validTo: FormControl<Date | null>;
  status: FormControl<SupplierCatalogStatus>;
}>;

@Component({
  selector: 'app-supplier-catalog-form',
  standalone: false,
  templateUrl: './supplier-catalog-form.component.html',
  styleUrl: './supplier-catalog-form.component.scss',
})
export class SupplierCatalogFormComponent implements OnChanges {
  private readonly fb = inject(FormBuilder);

  @Input() item?: SupplierCatalogItem;
  @Input() variantOptions: SelectOption[] = [];
  @Output() save = new EventEmitter<CreateSupplierCatalogDto>();
  @Output() cancel = new EventEmitter<void>();

  readonly bonusOptions: BonusOption[] = [
    { label: 'Sin bono', value: 'none' },
    { label: 'Descuento %', value: 'discount_percent' },
    { label: 'Bono cantidad', value: 'bonus_qty' },
  ];

  readonly statusOptions: StatusOption[] = [
    { label: 'Activo', value: 'active' },
    { label: 'Inactivo', value: 'inactive' },
  ];

  readonly form: SupplierCatalogFormGroup = this.fb.group(
    {
      variantId: this.fb.nonNullable.control('', { validators: [Validators.required] }),
      unitCost: this.fb.control<number | null>(null, {
        validators: [Validators.required, Validators.min(0)],
      }),
      currency: this.fb.control<string | null>(null),
      freightCost: this.fb.control<number | null>(null, { validators: [Validators.min(0)] }),
      bonusType: this.fb.nonNullable.control<SupplierCatalogBonusType>('none'),
      bonusValue: this.fb.control<number | null>(null, { validators: [Validators.min(0)] }),
      minQty: this.fb.control<number | null>(null, { validators: [Validators.min(0)] }),
      leadTimeDays: this.fb.control<number | null>(null, { validators: [Validators.min(0)] }),
      validFrom: this.fb.control<Date | null>(null),
      validTo: this.fb.control<Date | null>(null),
      status: this.fb.nonNullable.control<SupplierCatalogStatus>('active'),
    },
    { validators: [this.bonusValidator, this.dateRangeValidator] },
  );

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['item']) {
      this.applyItem(this.item);
    }
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const payload: CreateSupplierCatalogDto = {
      variantId: raw.variantId,
      unitCost: raw.unitCost ?? 0,
      currency: raw.currency?.trim() || undefined,
      freightCost: raw.freightCost ?? undefined,
      bonusType: raw.bonusType,
      bonusValue: raw.bonusValue ?? undefined,
      minQty: raw.minQty ?? undefined,
      leadTimeDays: raw.leadTimeDays ?? undefined,
      validFrom: raw.validFrom ? raw.validFrom.toISOString() : undefined,
      validTo: raw.validTo ? raw.validTo.toISOString() : undefined,
      status: raw.status,
      supplierId: this.item?.supplierId ?? '',
    };

    this.save.emit(payload);
  }

  onCancel(): void {
    this.cancel.emit();
  }

  get bonusValueInvalid(): boolean {
    return this.form.hasError('bonusValueRequired');
  }

  get dateRangeInvalid(): boolean {
    return this.form.hasError('invalidDateRange');
  }

  private applyItem(item?: SupplierCatalogItem): void {
    if (!item) {
      this.form.reset({
        variantId: '',
        unitCost: null,
        currency: null,
        freightCost: null,
        bonusType: 'none',
        bonusValue: null,
        minQty: null,
        leadTimeDays: null,
        validFrom: null,
        validTo: null,
        status: 'active',
      });
      return;
    }

    this.form.reset({
      variantId: item.variantId ?? '',
      unitCost: item.unitCost ?? null,
      currency: item.currency ?? null,
      freightCost: item.freightCost ?? null,
      bonusType: item.bonusType ?? 'none',
      bonusValue: item.bonusValue ?? null,
      minQty: item.minQty ?? null,
      leadTimeDays: item.leadTimeDays ?? null,
      validFrom: item.validFrom ? new Date(item.validFrom) : null,
      validTo: item.validTo ? new Date(item.validTo) : null,
      status: item.status ?? 'active',
    });
  }

  private bonusValidator(group: SupplierCatalogFormGroup): { bonusValueRequired?: true } | null {
    const bonusType = group.controls.bonusType.value;
    const bonusValue = group.controls.bonusValue.value;
    if (bonusType !== 'none' && (bonusValue === null || bonusValue === undefined)) {
      return { bonusValueRequired: true };
    }
    return null;
  }

  private dateRangeValidator(group: SupplierCatalogFormGroup): { invalidDateRange?: true } | null {
    const start = group.controls.validFrom.value;
    const end = group.controls.validTo.value;
    if (start && end && end.getTime() < start.getTime()) {
      return { invalidDateRange: true };
    }
    return null;
  }
}
