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
import {
  PurchasesProductsLookupService,
  VariantOption,
} from '../../services/purchases-products-lookup.service';

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
  variantOption: FormControl<ProductOptionDisplay | null>;
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
  private readonly lookupService = inject(PurchasesProductsLookupService);

  @Input() item?: SupplierCatalogItem;
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
      variantOption: this.fb.control<ProductOptionDisplay | null>(null, { validators: [Validators.required] }),
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

  variantSuggestions: ProductOptionDisplay[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['item']) {
      this.applyItem(this.item);
    }
  }

  onVariantSearch(event: { query: string }): void {
    const term = event.query ?? '';
    this.lookupService.searchVariants(term).subscribe({
      next: (options) => {
        this.variantSuggestions = options.map((option) => ({
          ...option,
          display: this.formatOption(option),
        }));
      },
      error: () => {
        this.variantSuggestions = [];
      },
    });
  }

  onVariantSelect(event: { value: ProductOptionDisplay }): void {
    const option = event.value;
    this.form.controls.variantId.setValue(option.id);
  }

  onVariantClear(): void {
    this.form.controls.variantId.setValue('');
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
        variantOption: null,
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

    const cached = this.lookupService.getVariantById(item.variantId);
    const baseOption: VariantOption = cached ?? { id: item.variantId, name: item.variantId };
    const option: ProductOptionDisplay = {
      ...baseOption,
      display: this.formatOption(baseOption),
    };

    this.form.reset({
      variantId: item.variantId ?? '',
      variantOption: option,
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

  private formatOption(option: VariantOption): string {
    return option.sku ? `${option.name} (${option.sku})` : option.name;
  }
}

interface ProductOptionDisplay extends VariantOption {
  display: string;
}
