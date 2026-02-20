import { Component, EventEmitter, Input, Output, ViewChild, inject } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';

type UomCategoryCreateFormGroup = FormGroup<{
  name: FormControl<string>;
}>;

export interface UomCategoryCreateFormPayload {
  name: string;
}

@Component({
  selector: 'app-uom-category-create-form',
  standalone: false,
  templateUrl: './uom-category-create-form.component.html',
  styleUrls: ['./uom-category-create-form.component.scss'],
})
export class UomCategoryCreateFormComponent {
  @Input() loading = false;

  @Output() save = new EventEmitter<UomCategoryCreateFormPayload>();
  @Output() cancel = new EventEmitter<void>();

  private readonly fb = inject(FormBuilder);

  readonly form: UomCategoryCreateFormGroup = this.fb.group({
    name: this.fb.nonNullable.control('', [Validators.required]),
  });

  reset(): void {
    this.form.reset({ name: '' });
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
    this.save.emit({ name: raw.name.trim() });
  }
}
