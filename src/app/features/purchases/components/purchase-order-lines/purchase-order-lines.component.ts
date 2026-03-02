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
import { Subscription } from 'rxjs';

export interface PurchaseOrderLineView {
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
  variableMultiplier: boolean;
}

export interface PurchaseOrderLineDraft {
  variantId: string;
  packagingId: string;
  packagingMultiplier: number;
  qty: number;
  unitCost: number;
  currency?: string;
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
}>;

@Component({
  selector: 'app-purchase-order-lines',
  standalone: false,
  templateUrl: './purchase-order-lines.component.html',
  styleUrl: './purchase-order-lines.component.scss',
})
export class PurchaseOrderLinesComponent implements OnChanges, OnDestroy {
  private formChangesSub?: Subscription;

  @Input() lines: PurchaseOrderLineView[] = [];
  @Input() form!: FormGroup<{ lines: FormArray<LineFormGroup> }>;
  @Input() currencyOptions: CurrencyOption[] = [];
  @Input() packagingOptions: PackagingOption[] = [];
  @Output() change = new EventEmitter<PurchaseOrderLineDraft[]>();
  @Output() remove = new EventEmitter<number>();

  readonly numberLocale = 'en-US';

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
        variantId: line.variantId,
        packagingId: value?.packagingId ?? line.packagingId,
        packagingMultiplier,
        qty: value?.qty ?? 0,
        unitCost: value?.unitCost ?? line.lastCost ?? 0,
        currency: value?.currency ?? line.lastCurrency ?? undefined,
      };
    });
    this.change.emit(drafts);
  }

  onRemove(index: number): void {
    this.remove.emit(index);
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
    return (qty || 0) * (unitCost || 0) + (freight || 0) + (extras || 0);
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
    const option = this.packagingOptions.find((item) => item.value === packagingId);
    if (option) {
      group?.controls.packagingMultiplier.setValue(option.multiplier);
      if (option.variableMultiplier) {
        group?.controls.packagingMultiplier.enable({ emitEvent: false });
      } else {
        group?.controls.packagingMultiplier.disable({ emitEvent: false });
      }
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
      const option = this.packagingOptions.find((item) => item.value === packagingId);
      if (!group.controls.packagingMultiplier.value) {
        const multiplier = this.resolvePackagingMultiplier(packagingId);
        if (multiplier > 0) {
          group.controls.packagingMultiplier.setValue(multiplier, { emitEvent: false });
        }
      }
      if (option && !option.variableMultiplier) {
        group.controls.packagingMultiplier.disable({ emitEvent: false });
      } else {
        group.controls.packagingMultiplier.enable({ emitEvent: false });
      }
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
