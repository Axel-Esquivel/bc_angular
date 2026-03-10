import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges, DestroyRef, ViewChild, inject } from '@angular/core';
import { FormArray, FormGroup } from '@angular/forms';
import { Subscription } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { PurchasesProductsLookupService } from '../../services/purchases-products-lookup.service';
import { VariantPickerComponent } from '../../../../shared/components/variant-picker/variant-picker.component';
import { VariantOption } from '../../../../shared/services/variants-lookup.service';

interface BonusSelection {
  id: string;
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

  @ViewChild('bonusVariantPicker') bonusVariantPicker?: VariantPickerComponent;

  private readonly destroyRef = inject(DestroyRef);
  private bonusesSub: Subscription | null = null;

  readonly numberLocale = 'en-US';
  selections: (BonusSelection | null)[] = [];
  activeBonusIndex: number | null = null;

  constructor(private readonly lookupService: PurchasesProductsLookupService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['bonuses']) {
      this.syncSelections();
      this.bindBonusesChanges();
    }
  }

  get bonusesForm(): FormArray<BonusLineForm> {
    return this.bonuses;
  }

  openVariantPicker(index: number): void {
    this.activeBonusIndex = index;
    this.bonusVariantPicker?.openDialog();
  }

  onVariantPicked(option: VariantOption): void {
    if (this.activeBonusIndex === null) {
      return;
    }
    const group = this.bonusesForm.at(this.activeBonusIndex);
    group.controls.variantId.setValue(option.id);
    this.selections[this.activeBonusIndex] = {
      id: option.id,
      label: option.label || option.name || option.id,
    };
    this.activeBonusIndex = null;
  }

  getSelectionLabel(index: number): string {
    const selection = this.selections[index];
    if (selection?.label) {
      return selection.label;
    }
    const group = this.bonusesForm.at(index);
    const variantId = group?.controls.variantId.value ?? '';
    return variantId || '';
  }

  private syncSelections(): void {
    const length = this.bonuses.length;
    if (this.selections.length !== length) {
      this.selections = Array.from({ length }, (_, index) => this.selections[index] ?? null);
    }
    this.selections = this.selections.map((current, index) => {
      const group = this.bonuses.at(index);
      const variantId = group?.controls.variantId.value ?? '';
      if (!variantId) {
        return null;
      }
      if (current?.id === variantId) {
        return current;
      }
      const cached = this.lookupService.getVariantById(variantId);
      const label = cached ? this.buildLabel(cached) : variantId;
      return { id: variantId, label };
    });
  }

  private bindBonusesChanges(): void {
    this.bonusesSub?.unsubscribe();
    this.bonusesSub = this.bonuses.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.syncSelections());
  }

  private buildLabel(option: { name: string; sku?: string; barcode?: string }): string {
    const skuPart = option.sku ? option.sku : '';
    const barcodePart = option.barcode ? ` - ${option.barcode}` : '';
    const namePart = option.name ? ` - ${option.name}` : '';
    return `${skuPart}${barcodePart}${namePart}`.trim().replace(/^-\s*/, '');
  }
}

