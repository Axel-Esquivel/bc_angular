import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { FormArray, FormControl, FormGroup } from '@angular/forms';

import { VariantsLookupService, VariantOption } from '../../services/variants-lookup.service';

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
  private readonly lookupService = inject(VariantsLookupService);

  @Input() items: FormArray<PriceListItemFormGroup> = new FormArray<PriceListItemFormGroup>([]);
  @Input() currencyOptions: SelectOption[] = [];
  @Input() defaultCurrencyId: string | null = null;
  @Input() disabled = false;
  @Output() addItem = new EventEmitter<void>();
  @Output() removeItem = new EventEmitter<number>();

  readonly numberLocale = 'en-US';
  private readonly suggestions = new Map<number, VariantOption[]>();

  get itemGroups(): PriceListItemFormGroup[] {
    return this.items.controls;
  }

  onAddItem(): void {
    this.addItem.emit();
  }

  onRemoveItem(index: number): void {
    this.removeItem.emit(index);
  }

  onVariantSearch(index: number, event: { query: string }): void {
    const term = event.query ?? '';
    this.lookupService.searchVariants(term).subscribe({
      next: (options) => {
        this.suggestions.set(index, options);
      },
      error: () => {
        this.suggestions.set(index, []);
      },
    });
  }

  onVariantSelect(index: number, event: { value: VariantOption }): void {
    const group = this.itemGroups[index];
    if (!group) {
      return;
    }
    group.controls.variantId.setValue(event.value.id);
    group.controls.variantLabel.setValue(event.value.label);
  }

  onVariantClear(index: number): void {
    const group = this.itemGroups[index];
    if (!group) {
      return;
    }
    group.controls.variantId.setValue('');
    group.controls.variantLabel.setValue('');
  }

  getSuggestions(index: number): VariantOption[] {
    return this.suggestions.get(index) ?? [];
  }

  trackByIndex(index: number): number {
    return index;
  }

}
