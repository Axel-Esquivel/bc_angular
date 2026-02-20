import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';

type PackagingNameCreateFormGroup = FormGroup<{
  name: FormControl<string>;
}>;

export interface PackagingNameCreateFormPayload {
  name: string;
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
