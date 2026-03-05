import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, inject } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, ValidationErrors, Validators } from '@angular/forms';

import {
  CreatePriceListPayload,
  PriceList,
  PriceListItem,
} from '../../models/price-list.model';
import { VariantsLookupService, VariantOption } from '../../services/variants-lookup.service';
import { PriceListItemFormGroup } from '../price-list-items/price-list-items.component';

interface SelectOption {
  label: string;
  value: string;
}

type PriceListFormGroup = FormGroup<{
  name: FormControl<string>;
  description: FormControl<string | null>;
  OrganizationId: FormControl<string>;
  companyId: FormControl<string>;
  items: FormArray<PriceListItemFormGroup>;
}>;

@Component({
  selector: 'app-price-list-form',
  standalone: false,
  templateUrl: './price-list-form.component.html',
  styleUrl: './price-list-form.component.scss',
})
export class PriceListFormComponent implements OnChanges, OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly lookupService = inject(VariantsLookupService);

  @Input() priceList?: PriceList;
  @Input() companyOptions: SelectOption[] = [];
  @Input() currencyOptions: SelectOption[] = [];
  @Input() defaultCurrencyId: string | null = null;
  @Input() organizationId: string | null = null;
  @Input() organizationName: string | null = null;
  @Input() companyId: string | null = null;
  @Input() saving = false;
  @Output() save = new EventEmitter<CreatePriceListPayload>();
  @Output() cancel = new EventEmitter<void>();

  readonly form: PriceListFormGroup = this.fb.group({
    name: this.fb.nonNullable.control('', { validators: [Validators.required] }),
    description: this.fb.control<string | null>(null),
    OrganizationId: this.fb.nonNullable.control('', { validators: [Validators.required] }),
    companyId: this.fb.nonNullable.control('', { validators: [Validators.required] }),
    items: this.fb.array<PriceListItemFormGroup>([]),
  });

  get itemsArray(): FormArray<PriceListItemFormGroup> {
    return this.form.controls.items;
  }

  ngOnInit(): void {
    if (this.itemsArray.length === 0) {
      this.onAddItem();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['priceList']) {
      this.applyPriceList(this.priceList);
    }
    if (changes['organizationId'] && !this.priceList) {
      this.form.controls.OrganizationId.setValue(this.organizationId ?? '');
    }
    if (changes['companyId'] && !this.priceList) {
      this.form.controls.companyId.setValue(this.companyId ?? '');
    }
  }

  onAddItem(): void {
    this.itemsArray.push(this.buildItemGroup());
  }

  onRemoveItem(index: number): void {
    this.itemsArray.removeAt(index);
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const items = raw.items
      .filter((item) => item.variantId && item.price !== null && item.price !== undefined)
      .map((item) => this.normalizeItem(item));

    const payload: CreatePriceListPayload = {
      name: raw.name.trim(),
      description: raw.description?.trim() || undefined,
      items,
      OrganizationId: raw.OrganizationId.trim(),
      companyId: raw.companyId.trim(),
    };

    this.save.emit(payload);
  }

  onCancel(): void {
    this.cancel.emit();
  }

  private applyPriceList(priceList?: PriceList): void {
    this.itemsArray.clear();
    if (!priceList) {
      this.form.reset({
        name: '',
        description: null,
        OrganizationId: this.organizationId ?? '',
        companyId: this.companyId ?? '',
      });
      this.onAddItem();
      return;
    }

    this.form.reset({
      name: priceList.name ?? '',
      description: priceList.description ?? null,
      OrganizationId: priceList.OrganizationId ?? '',
      companyId: priceList.companyId ?? '',
    });

    if (!priceList.items || priceList.items.length === 0) {
      this.onAddItem();
      return;
    }

    priceList.items.forEach((item) => this.itemsArray.push(this.buildItemGroup(item)));
  }

  private buildItemGroup(item?: PriceListItem): PriceListItemFormGroup {
    const option = item?.variantId ? this.resolveVariantOption(item.variantId) : null;
    return this.fb.group(
      {
      variantId: this.fb.nonNullable.control(item?.variantId ?? '', { validators: [Validators.required] }),
      variantLabel: this.fb.nonNullable.control(option?.label ?? '', { validators: [Validators.required] }),
      price: this.fb.control<number | null>(item?.price ?? null, {
        validators: [Validators.required, Validators.min(0)],
      }),
      currency: this.fb.control<string | null>(item?.currency ?? this.resolveDefaultCurrencyId()),
      minQuantity: this.fb.control<number | null>(item?.minQuantity ?? 1, { validators: [Validators.min(1)] }),
      customerSegment: this.fb.control<string | null>(item?.customerSegment ?? null),
      channel: this.fb.control<string | null>(item?.channel ?? null),
      discountPercentage: this.fb.control<number | null>(item?.discountPercentage ?? null, {
        validators: [Validators.min(0), Validators.max(100)],
      }),
      },
      { validators: [this.priceCurrencyValidator] },
    );
  }

  private resolveVariantOption(variantId: string): VariantOption {
    const cached = this.lookupService.getVariantById(variantId);
    return (
      cached ?? {
      id: variantId,
      productId: '',
      name: variantId,
      label: variantId,
    }
    );
  }

  private resolveDefaultCurrencyId(): string | null {
    const defaultValue = this.defaultCurrencyId ?? null;
    if (!defaultValue) {
      return null;
    }
    const exists = this.currencyOptions.some((option) => option.value === defaultValue);
    return exists ? defaultValue : this.currencyOptions[0]?.value ?? null;
  }

  private normalizeItem(item: {
    variantId: string;
    price: number | null;
    currency: string | null;
    minQuantity: number | null;
    customerSegment: string | null;
    channel: string | null;
    discountPercentage: number | null;
  }): PriceListItem {
    return {
      variantId: item.variantId,
      price: item.price ?? 0,
      currency: item.currency?.trim() || undefined,
      minQuantity: item.minQuantity ?? undefined,
      customerSegment: item.customerSegment?.trim() || undefined,
      channel: item.channel?.trim() || undefined,
      discountPercentage: item.discountPercentage ?? undefined,
    };
  }

  private priceCurrencyValidator(group: PriceListItemFormGroup): ValidationErrors | null {
    const price = group.controls.price.value;
    const currency = group.controls.currency.value;
    if (price !== null && price !== undefined && price >= 0 && !currency) {
      return { currencyRequired: true };
    }
    return null;
  }
}
