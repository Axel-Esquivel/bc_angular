import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, inject } from '@angular/core';
import { FormArray, FormControl, FormGroup } from '@angular/forms';
import { take } from 'rxjs';

import { VariantOption } from '../../../../shared/services/variants-lookup.service';
import { ProductPackaging, ProductPackagingApiService } from '../../../../core/api/product-packaging-api.service';
import { PackagingNamesApiService, PackagingName } from '../../../../core/api/packaging-names-api.service';

interface SelectOption {
  label: string;
  value: string;
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
export class PriceListItemsComponent implements OnInit, OnChanges {
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
  private readonly packagingOptionsByVariant = new Map<string, SelectOption[]>();
  private readonly packagingLoading = new Set<string>();

  get itemGroups(): PriceListItemFormGroup[] {
    return this.items.controls;
  }

  ngOnInit(): void {
    this.loadPackagingNames();
    this.bootstrapPackagingOptions();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['organizationId'] && !changes['organizationId'].firstChange) {
      this.loadPackagingNames(true);
      this.bootstrapPackagingOptions();
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

  private toPackagingOptions(list: ProductPackaging[]): SelectOption[] {
    return list.map((packaging) => {
      const packagingName =
        this.packagingNamesById.get(packaging.packagingNameId)?.name ?? packaging.packagingNameId;
      const barcode = packaging.barcode?.trim() || packaging.internalBarcode?.trim() || '';
      const label = `${packagingName} · ${packaging.unitsPerPack} u${barcode ? ` · ${barcode}` : ''}`;
      return {
        label,
        value: packaging.id,
      };
    });
  }
}
