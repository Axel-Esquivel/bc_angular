import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output, Input } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';

@Component({
  selector: 'app-workspace-create-card',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CardModule, InputTextModule, TextareaModule, ButtonModule],
  templateUrl: './workspace-create-card.component.html',
  styleUrl: './workspace-create-card.component.scss',
})
export class WorkspaceCreateCardComponent {
  @Input() loading = false;
  @Output() create = new EventEmitter<{ name: string; description?: string }>();

  readonly form: FormGroup<{ name: FormControl<string>; description: FormControl<string> }>;

  constructor(private readonly fb: FormBuilder) {
    this.form = this.fb.nonNullable.group({
      name: this.fb.nonNullable.control('', Validators.required),
      description: this.fb.nonNullable.control(''),
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.create.emit(this.form.getRawValue());
  }
}
