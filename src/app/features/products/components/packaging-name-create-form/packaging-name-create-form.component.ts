import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';

type PackagingNameCreateFormGroup = FormGroup<{
  name: FormControl<string>;
  multiplier: FormControl<number | null>;
}>;

export interface PackagingNameCreateFormPayload {
  name: string;
  multiplier: number;
}

@Component({
  selector: 'app-packaging-name-create-form',
  standalone: false,
  templateUrl: './packaging-name-create-form.component.html',
  styleUrls: ['./packaging-name-create-form.component.scss'],
})
export class PackagingNameCreateFormComponent {
  @Input() loading = false;

  @Output() save = new EventEmitter<PackagingNameCreateFormPayload>();
  @Output() cancel = new EventEmitter<void>();

  private readonly fb = inject(FormBuilder);

  readonly form: PackagingNameCreateFormGroup = this.fb.group({
    name: this.fb.nonNullable.control('', [Validators.required]),
    multiplier: this.fb.control<number | null>(1, [Validators.required, Validators.min(1)]),
  });

  reset(): void {
    this.form.reset({ name: '', multiplier: 1 });
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
    this.save.emit({ name: raw.name.trim(), multiplier: raw.multiplier ?? 1 });
  }
}
