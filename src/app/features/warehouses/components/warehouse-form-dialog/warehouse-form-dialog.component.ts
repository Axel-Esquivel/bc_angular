import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Button } from 'primeng/button';
import { Checkbox } from 'primeng/checkbox';
import { InputText } from 'primeng/inputtext';

import { Warehouse } from '../../services/warehouses.service';

export interface WarehouseFormValue {
  code: string;
  name: string;
  active: boolean;
}

@Component({
  selector: 'app-warehouse-form-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, InputText, Checkbox, Button],
  templateUrl: './warehouse-form-dialog.component.html',
  styleUrl: './warehouse-form-dialog.component.scss',
})
export class WarehouseFormDialogComponent implements OnChanges {
  private readonly fb = inject(FormBuilder);

  @Input() warehouse: Warehouse | null = null;
  @Input() submitting = false;
  @Output() save = new EventEmitter<WarehouseFormValue>();
  @Output() cancel = new EventEmitter<void>();

  readonly form = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.minLength(2)]],
    name: ['', [Validators.required, Validators.minLength(2)]],
    active: true,
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['warehouse']) {
      this.form.reset({
        code: this.warehouse?.code ?? '',
        name: this.warehouse?.name ?? '',
        active: this.warehouse?.active ?? true,
      });
    }
  }

  onSave(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    this.save.emit({
      code: raw.code.trim().toUpperCase(),
      name: raw.name.trim(),
      active: raw.active,
    });
  }

  onCancel(): void {
    this.cancel.emit();
  }
}
