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
  lastCost: number | null;
  lastCurrency: string | null;
}

export interface PurchaseOrderLineDraft {
  variantId: string;
  qty: number;
  unitCost: number;
  currency?: string;
}

export type LineFormGroup = FormGroup<{
  qty: FormControl<number | null>;
  unitCost: FormControl<number | null>;
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
  @Output() change = new EventEmitter<PurchaseOrderLineDraft[]>();
  @Output() remove = new EventEmitter<number>();

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['form']) {
      this.bindFormChanges();
    }
    if (changes['lines']) {
      this.emitDrafts();
    }
  }

  private emitDrafts(): void {
    if (!this.form) {
      return;
    }
    const drafts: PurchaseOrderLineDraft[] = this.lines.map((line, index) => {
      const group = this.formArray.at(index);
      const value = group?.getRawValue();
      return {
        variantId: line.variantId,
        qty: value?.qty ?? 0,
        unitCost: value?.unitCost ?? line.lastCost ?? 0,
        currency: line.lastCurrency ?? undefined,
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
  }

  get formArray(): FormArray<LineFormGroup> {
    return this.form.controls.lines;
  }

  ngOnDestroy(): void {
    this.formChangesSub?.unsubscribe();
  }
}
