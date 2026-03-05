import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges, DestroyRef, inject } from '@angular/core';
import { FormArray, FormGroup } from '@angular/forms';
import { Subscription, Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { PurchasesProductsLookupService } from '../../services/purchases-products-lookup.service';

interface VariantOption {
  id: string;
  name: string;
  sku?: string;
  barcode?: string;
  label: string;
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

  private readonly destroyRef = inject(DestroyRef);
  private bonusesSub: Subscription | null = null;
  private readonly searchSubject = new Subject<string>();

  readonly numberLocale = 'en-US';
  variantOptions: VariantOption[] = [];
  selections: (VariantOption | null)[] = [];

  constructor(private readonly lookupService: PurchasesProductsLookupService) {
    this.searchSubject
      .pipe(
        debounceTime(250),
        distinctUntilChanged(),
        switchMap((term) => this.lookupService.searchVariants(term)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (items) => {
          this.variantOptions = items.map((item) => ({
            id: item.id,
            name: item.name,
            sku: item.sku,
            barcode: item.barcode,
            label: this.buildLabel(item),
          }));
        },
        error: () => {
          this.variantOptions = [];
        },
      });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['bonuses']) {
      this.syncSelections();
      this.bindBonusesChanges();
    }
  }

  get bonusesForm(): FormArray<BonusLineForm> {
    return this.bonuses;
  }

  syncSelections(): void {
    const length = this.bonuses.length;
    if (this.selections.length !== length) {
      this.selections = Array.from({ length }, (_, index) => this.selections[index] ?? null);
    }
  }

  private bindBonusesChanges(): void {
    this.bonusesSub?.unsubscribe();
    this.bonusesSub = this.bonuses.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.syncSelections());
  }

  searchVariants(event: { query: string }): void {
    const term = event.query ?? '';
    this.searchSubject.next(term);
  }

  private buildLabel(option: { name: string; sku?: string; barcode?: string }): string {
    const skuPart = option.sku ? option.sku : '';
    const barcodePart = option.barcode ? ` · ${option.barcode}` : '';
    const namePart = option.name ? ` · ${option.name}` : '';
    return `${skuPart}${barcodePart}${namePart}`.trim().replace(/^·\s*/, '');
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
