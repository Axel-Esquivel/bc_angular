import { Component, DoCheck, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, inject } from '@angular/core';
import { FormArray, FormControl, FormGroup } from '@angular/forms';
import { Subscription, take } from 'rxjs';

import { VariantOption } from '../../../../shared/services/variants-lookup.service';
import { ProductPackaging, ProductPackagingApiService } from '../../../../core/api/product-packaging-api.service';
import { PackagingNamesApiService, PackagingName } from '../../../../core/api/packaging-names-api.service';

interface SelectOption {
  label: string;
  value: string;
}

interface PackagingOption extends SelectOption {
  unitsPerPack: number;
}

export type PriceListItemFormGroup = FormGroup<{
  variantId: FormControl<string>;
  variantLabel: FormControl<string>;
  packagingId: FormControl<string | null>;
  price: FormControl<number | null>;
  currency: FormControl<string | null>;
  minQuantity: FormControl<number | null>;
  customerSegment: FormControl<string | null>;
  channel: FormControl<string | null>;
  discountPercentage: FormControl<number | null>;
}>;

@Component({
  selector: 'app-price-list-items',
  standalone: false,
  templateUrl: './price-list-items.component.html',
  styleUrl: './price-list-items.component.scss',
})
export class PriceListItemsComponent implements OnInit, OnChanges, DoCheck {
  private readonly packagingApi = inject(ProductPackagingApiService);
  private readonly packagingNamesApi = inject(PackagingNamesApiService);

  @Input() items: FormArray<PriceListItemFormGroup> = new FormArray<PriceListItemFormGroup>([]);
  @Input() currencyOptions: SelectOption[] = [];
  @Input() defaultCurrencyId: string | null = null;
  @Input() organizationId: string | null = null;
  @Input() disabled = false;
  @Output() addItem = new EventEmitter<void>();
  @Output() removeItem = new EventEmitter<number>();

  readonly numberLocale = 'en-US';
  private readonly packagingNamesById = new Map<string, PackagingName>();
  private readonly packagingByVariant = new Map<string, ProductPackaging[]>();
  private readonly packagingOptionsByVariant = new Map<string, PackagingOption[]>();
  private readonly packagingLoading = new Set<string>();
  private readonly autoMinQuantityByIndex = new Map<number, number>();
  private readonly packagingIdSubscriptions = new Map<PriceListItemFormGroup, Subscription>();
  private lastItemsLength = 0;

  get itemGroups(): PriceListItemFormGroup[] {
    return this.items.controls;
  }

  ngOnInit(): void {
    this.loadPackagingNames();
    this.bootstrapPackagingOptions();
    this.syncPackagingSubscriptions();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['organizationId'] && !changes['organizationId'].firstChange) {
      this.loadPackagingNames(true);
      this.bootstrapPackagingOptions();
    }
  }

  ngDoCheck(): void {
    const nextLength = this.items.length;
    if (nextLength !== this.lastItemsLength) {
      this.lastItemsLength = nextLength;
      this.syncPackagingSubscriptions();
    }
  }

  onAddItem(): void {
    this.addItem.emit();
  }

  onRemoveItem(index: number): void {
    this.removeItem.emit(index);
  }

  trackByIndex(index: number): number {
    return index;
  }

  onVariantSelected(index: number, option: VariantOption): void {
    const group = this.itemGroups[index];
    if (!group) {
      return;
    }
    group.controls.variantId.setValue(option.id);
    group.controls.variantLabel.setValue(option.label);
    group.controls.packagingId.setValue(null);
    this.clearAutoMinQuantity(index, group, true);
    this.loadPackagingsForVariant(option.id);
  }

  onVariantValueChange(index: number, value: string | null): void {
    if (value === null) {
      this.onVariantCleared(index);
    }
  }

  onVariantCleared(index: number): void {
    const group = this.itemGroups[index];
    if (!group) {
      return;
    }
    group.controls.variantId.setValue('');
    group.controls.variantLabel.setValue('');
    group.controls.packagingId.setValue(null);
    this.clearAutoMinQuantity(index, group, true);
  }

  onPackagingSelected(index: number): void {
    const group = this.itemGroups[index];
    if (!group) {
      return;
    }
    this.handlePackagingChange(group, index);
  }

  packagingOptionsFor(group: PriceListItemFormGroup): SelectOption[] {
    const variantId = group.controls.variantId.value;
    if (!variantId) {
      return [];
    }
    return this.packagingOptionsByVariant.get(variantId) ?? [];
  }

  isPackagingDisabled(group: PriceListItemFormGroup): boolean {
    const variantId = group.controls.variantId.value;
    if (!variantId) {
      return true;
    }
    return this.packagingLoading.has(variantId);
  }

  private applyAutoMinQuantity(
    index: number,
    group: PriceListItemFormGroup,
    unitsPerPack: number,
  ): void {
    const safeUnits = Number.isFinite(unitsPerPack) && unitsPerPack > 0 ? unitsPerPack : 1;
    const current = group.controls.minQuantity.value ?? null;
    const lastAuto = this.autoMinQuantityByIndex.get(index);
    const shouldOverride = current === null || current === 0 || current === 1 || current === lastAuto;
    if (!shouldOverride) {
      return;
    }
    group.controls.minQuantity.setValue(safeUnits);
    this.autoMinQuantityByIndex.set(index, safeUnits);
  }

  private clearAutoMinQuantity(
    index: number,
    group: PriceListItemFormGroup,
    resetValue: boolean,
  ): void {
    const lastAuto = this.autoMinQuantityByIndex.get(index);
    const current = group.controls.minQuantity.value ?? null;
    if (resetValue && lastAuto !== undefined && current === lastAuto) {
      group.controls.minQuantity.setValue(1);
    }
    this.autoMinQuantityByIndex.delete(index);
  }

  private loadPackagingNames(force = false): void {
    if (!this.organizationId) {
      this.packagingNamesById.clear();
      return;
    }
    if (!force && this.packagingNamesById.size > 0) {
      return;
    }
    this.packagingNamesApi
      .list(this.organizationId)
      .pipe(take(1))
      .subscribe({
        next: (response) => {
          const list = response.result ?? [];
          this.packagingNamesById.clear();
          list.forEach((item) => {
            this.packagingNamesById.set(item.id, item);
          });
          this.refreshPackagingLabels();
        },
        error: () => {
          this.packagingNamesById.clear();
        },
      });
  }

  private bootstrapPackagingOptions(): void {
    this.itemGroups.forEach((group) => {
      const variantId = group.controls.variantId.value;
      if (variantId) {
        this.loadPackagingsForVariant(variantId);
      }
    });
  }

  private loadPackagingsForVariant(variantId: string): void {
    if (!variantId || this.packagingOptionsByVariant.has(variantId) || this.packagingLoading.has(variantId)) {
      return;
    }
    this.packagingLoading.add(variantId);
    this.packagingApi
      .listByVariant(variantId)
      .pipe(take(1))
      .subscribe({
        next: (response) => {
          const list = response.result ?? [];
          this.packagingByVariant.set(variantId, list);
          this.packagingOptionsByVariant.set(variantId, this.toPackagingOptions(list));
          this.packagingLoading.delete(variantId);
          this.applyAutoForVariant(variantId);
        },
        error: () => {
          this.packagingByVariant.set(variantId, []);
          this.packagingOptionsByVariant.set(variantId, []);
          this.packagingLoading.delete(variantId);
        },
      });
  }

  private refreshPackagingLabels(): void {
    this.packagingByVariant.forEach((list, key) => {
      this.packagingOptionsByVariant.set(key, this.toPackagingOptions(list));
    });
  }

  private syncPackagingSubscriptions(): void {
    const groups = new Set(this.itemGroups);
    this.packagingIdSubscriptions.forEach((subscription, group) => {
      if (!groups.has(group)) {
        subscription.unsubscribe();
        this.packagingIdSubscriptions.delete(group);
      }
    });
    this.itemGroups.forEach((group) => {
      if (this.packagingIdSubscriptions.has(group)) {
        return;
      }
      const sub = group.controls.packagingId.valueChanges.subscribe(() => {
        this.handlePackagingChange(group);
      });
      this.packagingIdSubscriptions.set(group, sub);
    });
  }

  private handlePackagingChange(group: PriceListItemFormGroup, indexOverride?: number): void {
    const variantId = group.controls.variantId.value;
    const packagingId = group.controls.packagingId.value ?? '';
    if (!variantId || !packagingId) {
      return;
    }
    const options = this.packagingOptionsByVariant.get(variantId) ?? [];
    const match = options.find((option) => option.value === packagingId);
    if (!match) {
      return;
    }
    const index = indexOverride ?? this.itemGroups.indexOf(group);
    if (index < 0) {
      return;
    }
    this.applyAutoMinQuantity(index, group, match.unitsPerPack);
  }

  private applyAutoForVariant(variantId: string): void {
    const options = this.packagingOptionsByVariant.get(variantId) ?? [];
    if (options.length === 0) {
      return;
    }
    this.itemGroups.forEach((group, index) => {
      if (group.controls.variantId.value !== variantId) {
        return;
      }
      const packagingId = group.controls.packagingId.value ?? '';
      if (!packagingId) {
        return;
      }
      const match = options.find((option) => option.value === packagingId);
      if (!match) {
        return;
      }
      this.applyAutoMinQuantity(index, group, match.unitsPerPack);
    });
  }

  private toPackagingOptions(list: ProductPackaging[]): PackagingOption[] {
    return list.map((packaging) => {
      const rawName = this.packagingNamesById.get(packaging.packagingNameId)?.name?.trim();
      const packagingName = rawName || packaging.packagingNameId?.trim() || 'Presentación';
      const units = Number.isFinite(packaging.unitsPerPack) && packaging.unitsPerPack > 0
        ? packaging.unitsPerPack
        : 1;
      const barcode = packaging.barcode?.trim() || packaging.internalBarcode?.trim() || '';
      const label = `${packagingName} - ${units} u${barcode ? ` - ${barcode}` : ''}`;
      return {
        label,
        value: packaging.id,
        unitsPerPack: units,
      };
    });
  }
}
