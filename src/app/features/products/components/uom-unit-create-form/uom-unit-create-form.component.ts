import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';

export interface OptionItem {
  label: string;
  value: string;
}

type UomUnitCreateFormGroup = FormGroup<{
  name: FormControl<string>;
  symbol: FormControl<string>;
  factor: FormControl<number>;
  categoryId: FormControl<string>;
}>;

export interface UomUnitCreateFormPayload {
  name: string;
  symbol: string;
  factor: number;
  categoryId: string;
}

@Component({
  selector: 'app-uom-unit-create-form',
  standalone: false,
  templateUrl: './uom-unit-create-form.component.html',
  styleUrls: ['./uom-unit-create-form.component.scss'],
})
export class UomUnitCreateFormComponent {
  @Input() loading = false;
  @Input() uomCategoryOptions: OptionItem[] = [];
  @Input() categoryId: string | null = null;

  @Output() save = new EventEmitter<UomUnitCreateFormPayload>();
  @Output() cancel = new EventEmitter<void>();

  private readonly fb = inject(FormBuilder);

  readonly form: UomUnitCreateFormGroup = this.fb.group({
    name: this.fb.nonNullable.control('', [Validators.required]),
    symbol: this.fb.nonNullable.control('', [Validators.required]),
    factor: this.fb.nonNullable.control(1, [Validators.required, Validators.min(0.000001)]),
    categoryId: this.fb.nonNullable.control('', [Validators.required]),
  });

  reset(): void {
    this.form.reset({
      name: '',
      symbol: '',
      factor: 1,
      categoryId: this.categoryId ?? '',
    });
  }

  onCancel(): void {
    this.cancel.emit();
  }

  onSave(): void {
    if (this.form.invalid || this.loading) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    this.save.emit({
      name: raw.name.trim(),
      symbol: raw.symbol.trim(),
      factor: raw.factor,
      categoryId: raw.categoryId,
    });
  }
}
