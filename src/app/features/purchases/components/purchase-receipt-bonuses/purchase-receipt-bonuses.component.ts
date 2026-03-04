import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges } from '@angular/core';
import { FormArray, FormGroup } from '@angular/forms';

import { PurchasesProductsLookupService } from '../../services/purchases-products-lookup.service';

interface VariantOption {
  id: string;
  name: string;
  sku?: string;
}

type BonusLineForm = FormGroup<{
  variantId: import('@angular/forms').FormControl<string>;
  quantity: import('@angular/forms').FormControl<number>;
  bonusSourceLineId: import('@angular/forms').FormControl<string | null>;
}>;

@Component({
  selector: 'app-purchase-receipt-bonuses',
  standalone: false,
  templateUrl: './purchase-receipt-bonuses.component.html',
  styleUrl: './purchase-receipt-bonuses.component.scss',
})
export class PurchaseReceiptBonusesComponent implements OnChanges {
  @Input() bonuses: FormArray<BonusLineForm> = new FormArray<BonusLineForm>([]);
  @Output() addBonus = new EventEmitter<void>();
  @Output() removeBonus = new EventEmitter<number>();

  readonly numberLocale = 'en-US';
  variantOptions: VariantOption[] = [];
  selections: (VariantOption | null)[] = [];

  constructor(private readonly lookupService: PurchasesProductsLookupService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['bonuses']) {
      this.syncSelections();
    }
  }

  get bonusesForm(): FormArray<BonusLineForm> {
    this.syncSelections();
    return this.bonuses;
  }

  syncSelections(): void {
    const length = this.bonusesForm.length;
    if (this.selections.length !== length) {
      this.selections = Array.from({ length }, (_, index) => this.selections[index] ?? null);
    }
  }

  searchVariants(event: { query: string }): void {
    const term = event.query ?? '';
    this.lookupService.searchVariants(term).subscribe({
      next: (items) => {
        this.variantOptions = items.map((item) => ({
          id: item.id,
          name: item.name,
          sku: item.sku,
        }));
      },
      error: () => {
        this.variantOptions = [];
      },
    });
  }

  resolveLabel(option: VariantOption): string {
    return option.sku ? `${option.name} (${option.sku})` : option.name;
  }

  toOption(value: VariantOption | string | null): VariantOption | null {
    if (!value || typeof value === 'string') {
      return null;
    }
    return value;
  }

  setVariant(index: number, option: VariantOption): void {
    const group = this.bonusesForm.at(index);
    group.controls.variantId.setValue(option.id);
    this.selections[index] = option;
  }

  clearVariant(index: number): void {
    const group = this.bonusesForm.at(index);
    group.controls.variantId.setValue('');
    this.selections[index] = null;
  }
}
