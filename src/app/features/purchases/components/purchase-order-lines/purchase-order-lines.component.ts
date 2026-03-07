import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
} from '@angular/core';
import { FormArray, FormControl, FormGroup } from '@angular/forms';
import { inject } from '@angular/core';
import { Subscription } from 'rxjs';
import { applyMultiplierState } from '../../utils/packaging-multiplier.util';
import { BestPriceItem, PurchasesService } from '../../services/purchases.service';
import { ActiveContextStateService } from '../../../../core/context/active-context-state.service';

export interface PurchaseOrderLineView {
  productId?: string;
  variantId: string;
  variantLabel: string;
  uomLabel?: string;
  lastCost: number | null;
  lastCurrency: string | null;
  packagingId: string;
}

export interface CurrencyOption {
  label: string;
  value: string;
}

export interface PackagingOption {
  label: string;
  value: string;
  multiplier: number;
  allowCustomMultiplier: boolean;
}

export interface PurchaseOrderLineDraft {
  productId?: string;
  variantId: string;
  packagingId: string;
  packagingMultiplier: number;
  qty: number;
  unitCost: number;
  currency?: string;
  bonusQty?: number;
  discountType?: 'PERCENT' | 'AMOUNT';
  discountValue?: number;
}

export type LineFormGroup = FormGroup<{
  packagingId: FormControl<string | null>;
  packagingMultiplier: FormControl<number | null>;
  qty: FormControl<number | null>;
  unitCost: FormControl<number | null>;
  currency: FormControl<string | null>;
  freightCost: FormControl<number | null>;
  extraCosts: FormControl<number | null>;
  notes: FormControl<string | null>;
  bonusQty: FormControl<number | null>;
  discountType: FormControl<'PERCENT' | 'AMOUNT' | null>;
  discountValue: FormControl<number | null>;
}>;

@Component({
  selector: 'app-purchase-order-lines',
  standalone: false,
  templateUrl: './purchase-order-lines.component.html',
  styleUrl: './purchase-order-lines.component.scss',
})
export class PurchaseOrderLinesComponent implements OnChanges, OnDestroy {
  private formChangesSub?: Subscription;
  private readonly purchasesService = inject(PurchasesService);
  private readonly activeContextState = inject(ActiveContextStateService);

  @Input() lines: PurchaseOrderLineView[] = [];
  @Input() form!: FormGroup<{ lines: FormArray<LineFormGroup> }>;
  @Input() currencyOptions: CurrencyOption[] = [];
  @Input() packagingOptions: PackagingOption[] = [];
  @Input() organizationId: string | null = null;
  @Input() highlightedIndex: number | null = null;
  @Output() change = new EventEmitter<PurchaseOrderLineDraft[]>();
  @Output() remove = new EventEmitter<number>();

  readonly numberLocale = 'en-US';
  bestPriceVisible = false;
  bestPriceLoading = false;
  bestPriceItems: BestPriceItem[] = [];
  bestPriceFxNote: string | null = null;
  bestPriceLineIndex = -1;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['form']) {
      this.bindFormChanges();
    }
    if (changes['lines']) {
      this.emitDrafts();
    }
    if (changes['currencyOptions']) {
      this.syncCurrencyControls();
    }
    if (changes['packagingOptions']) {
      this.syncPackagingControls();
    }
  }

  private emitDrafts(): void {
    if (!this.form) {
      return;
    }
    const drafts: PurchaseOrderLineDraft[] = this.lines.map((line, index) => {
      const group = this.formArray.at(index);
      const value = group?.getRawValue();
      const packagingMultiplier =
        value?.packagingMultiplier ??
        this.resolvePackagingMultiplier(value?.packagingId ?? line.packagingId);
      return {
        productId: line.productId,
        variantId: line.variantId,
        packagingId: value?.packagingId ?? line.packagingId,
        packagingMultiplier,
        qty: value?.qty ?? 0,
        unitCost: value?.unitCost ?? line.lastCost ?? 0,
        currency: value?.currency ?? line.lastCurrency ?? undefined,
        bonusQty: value?.bonusQty ?? undefined,
        discountType: value?.discountType ?? undefined,
        discountValue: value?.discountValue ?? undefined,
      };
    });
    this.change.emit(drafts);
  }

  onRemove(index: number): void {
    this.remove.emit(index);
  }

  openBestPrice(index: number): void {
    const line = this.lines[index];
    if (!line?.productId) {
      return;
    }
    const orgId = this.organizationId ?? this.activeContextState.getActiveContext().organizationId ?? null;
    if (!orgId) {
      return;
    }
    this.bestPriceLineIndex = index;
    this.bestPriceVisible = true;
    this.bestPriceLoading = true;
    this.bestPriceItems = [];
    this.bestPriceFxNote = null;
    this.purchasesService
      .getBestPrices({
        organizationId: orgId,
        productId: line.productId,
        variantId: line.variantId,
        packagingId: line.packagingId || undefined,
        limit: 10,
      })
      .subscribe({
        next: ({ result }) => {
          this.bestPriceItems = result?.items ?? [];
          this.bestPriceFxNote = result?.fxNote ?? null;
          this.bestPriceLoading = false;
        },
        error: () => {
          this.bestPriceItems = [];
          this.bestPriceFxNote = null;
          this.bestPriceLoading = false;
        },
      });
  }

  closeBestPrice(): void {
    this.bestPriceVisible = false;
    this.bestPriceLineIndex = -1;
  }

  applyBestPrice(item: BestPriceItem): void {
    if (this.bestPriceLineIndex < 0) {
      return;
    }
    const group = this.formArray.at(this.bestPriceLineIndex);
    group.controls.unitCost.setValue(item.unitCost);
    group.controls.currency.setValue(item.currency);
    this.closeBestPrice();
  }

  private bindFormChanges(): void {
    this.formChangesSub?.unsubscribe();
    if (!this.form) {
      return;
    }
    this.formChangesSub = this.formArray.valueChanges.subscribe(() => this.emitDrafts());
    this.emitDrafts();
    this.syncCurrencyControls();
    this.syncPackagingControls();
  }

  get formArray(): FormArray<LineFormGroup> {
    return this.form.controls.lines;
  }

  getLineVariantLabel(index: number): string {
    const line = this.lines[index];
    if (!line) {
      return '';
    }
    const uom = line.uomLabel?.trim();
    return uom ? `${line.variantLabel} - ${uom}` : line.variantLabel;
  }

  getLineQty(index: number): number {
    const group = this.formArray.at(index);
    const qty = group?.controls.qty.value;
    return typeof qty === 'number' ? qty : 0;
  }

  getLineTotal(index: number): number {
    const group = this.formArray.at(index);
    const qty = group?.controls.qty.value ?? 0;
    const unitCost = group?.controls.unitCost.value ?? 0;
    const freight = group?.controls.freightCost.value ?? 0;
    const extras = group?.controls.extraCosts.value ?? 0;
    const base = (qty || 0) * (unitCost || 0) + (freight || 0) + (extras || 0);
    const discount = this.resolveLineDiscount(group, base);
    return base - discount;
  }

  getLineBonusUnits(index: number): number {
    const group = this.formArray.at(index);
    const bonusQty = group?.controls.bonusQty.value ?? 0;
    const multiplier = this.getLinePackagingMultiplier(index);
    return bonusQty * multiplier;
  }

  private resolveLineDiscount(group: LineFormGroup | undefined, base: number): number {
    if (!group) {
      return 0;
    }
    const discountType = group.controls.discountType.value;
    const discountValue = group.controls.discountValue.value ?? 0;
    if (!discountType || discountValue <= 0) {
      return 0;
    }
    if (discountType === 'PERCENT') {
      return (base * discountValue) / 100;
    }
    return discountValue;
  }

  getLinePackagingLabel(index: number): string {
    const group = this.formArray.at(index);
    const packagingId = group?.controls.packagingId.value ?? '';
    const option = this.packagingOptions.find((item) => item.value === packagingId);
    return option?.label ?? '';
  }

  getLinePackagingMultiplier(index: number): number {
    const group = this.formArray.at(index);
    const value = group?.controls.packagingMultiplier.value;
    if (typeof value === 'number' && value > 0) {
      return value;
    }
    const packagingId = group?.controls.packagingId.value ?? '';
    return this.resolvePackagingMultiplier(packagingId);
  }

  getLineBaseQty(index: number): number {
    const qty = this.getLineQty(index);
    const multiplier = this.getLinePackagingMultiplier(index);
    return qty * multiplier;
  }

  onPackagingChange(index: number): void {
    const group = this.formArray.at(index);
    const packagingId = group?.controls.packagingId.value ?? '';
    const option = this.packagingOptions.find((item) => item.value === packagingId) ?? null;
    if (group) {
      applyMultiplierState(group, option);
    }
  }

  private syncCurrencyControls(): void {
    if (!this.form) {
      return;
    }
    const enable = this.currencyOptions.length > 0;
    this.formArray.controls.forEach((group) => {
      if (enable) {
        group.controls.currency.enable({ emitEvent: false });
      } else {
        group.controls.currency.disable({ emitEvent: false });
      }
    });
  }

  private syncPackagingControls(): void {
    if (!this.form) {
      return;
    }
    const enable = this.packagingOptions.length > 0;
    this.formArray.controls.forEach((group) => {
      if (enable) {
        group.controls.packagingId.enable({ emitEvent: false });
      } else {
        group.controls.packagingId.disable({ emitEvent: false });
      }
      const packagingId = group.controls.packagingId.value ?? '';
      const option = this.packagingOptions.find((item) => item.value === packagingId) ?? null;
      applyMultiplierState(group, option);
    });
  }

  private resolvePackagingMultiplier(packagingId: string): number {
    const option = this.packagingOptions.find((item) => item.value === packagingId);
    return option?.multiplier ?? 1;
  }

  

  ngOnDestroy(): void {
    this.formChangesSub?.unsubscribe();
  }
}
