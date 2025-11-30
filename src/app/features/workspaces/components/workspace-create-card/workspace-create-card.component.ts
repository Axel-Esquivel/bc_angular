import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output, Input } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextareaModule } from 'primeng/inputtextarea';

@Component({
  selector: 'app-workspace-create-card',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CardModule, InputTextModule, InputTextareaModule, ButtonModule],
  templateUrl: './workspace-create-card.component.html',
  styleUrl: './workspace-create-card.component.scss',
})
export class WorkspaceCreateCardComponent {
  @Input() loading = false;
  @Output() create = new EventEmitter<{ name: string; description?: string }>();

  readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    description: [''],
  });

  constructor(private readonly fb: FormBuilder) {}

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.create.emit(this.form.getRawValue());
  }
}
