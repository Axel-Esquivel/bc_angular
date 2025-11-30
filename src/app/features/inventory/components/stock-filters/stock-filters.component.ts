import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';

export interface StockFilterValues {
  search?: string;
  warehouseId?: string;
  category?: string;
}

@Component({
  selector: 'bc-stock-filters',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, InputTextModule, SelectModule, ButtonModule],
  templateUrl: './stock-filters.component.html',
  styleUrl: './stock-filters.component.scss',
})
export class StockFiltersComponent {
  @Output() applyFilters = new EventEmitter<StockFilterValues>();

  readonly warehouseOptions = [
    { label: 'Todas', value: '' },
    { label: 'Bodega Central', value: 'central' },
    { label: 'Bodega Norte', value: 'north' },
  ];

  readonly categoryOptions = [
    { label: 'Todas', value: '' },
    { label: 'General', value: 'general' },
    { label: 'Servicios', value: 'services' },
    { label: 'Electrónica', value: 'electronics' },
  ];

  readonly form = this.fb.nonNullable.group({
    search: [''],
    warehouseId: [''],
    category: [''],
  });

  constructor(private readonly fb: FormBuilder) {}

  onSubmit(): void {
    this.applyFilters.emit(this.form.getRawValue());
  }

  onReset(): void {
    this.form.reset({ search: '', warehouseId: '', category: '' });
    this.applyFilters.emit(this.form.getRawValue());
  }
}
