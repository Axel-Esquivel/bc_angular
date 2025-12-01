import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output, Input, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
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

  private readonly fb = inject(FormBuilder);

  readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    description: [''],
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.create.emit(this.form.getRawValue());
  }
}
