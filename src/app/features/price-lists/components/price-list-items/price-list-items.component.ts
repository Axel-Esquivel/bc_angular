import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormArray, FormControl, FormGroup } from '@angular/forms';

import { VariantOption } from '../../../../shared/services/variants-lookup.service';

interface SelectOption {
  label: string;
  value: string;
}

export type PriceListItemFormGroup = FormGroup<{
  variantId: FormControl<string>;
  variantLabel: FormControl<string>;
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
export class PriceListItemsComponent {
  @Input() items: FormArray<PriceListItemFormGroup> = new FormArray<PriceListItemFormGroup>([]);
  @Input() currencyOptions: SelectOption[] = [];
  @Input() defaultCurrencyId: string | null = null;
  @Input() disabled = false;
  @Output() addItem = new EventEmitter<void>();
  @Output() removeItem = new EventEmitter<number>();

  readonly numberLocale = 'en-US';

  get itemGroups(): PriceListItemFormGroup[] {
    return this.items.controls;
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
  }

}
