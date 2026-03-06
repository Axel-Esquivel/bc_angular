import { CommonModule } from '@angular/common';
import { Component, DestroyRef, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged, switchMap, tap } from 'rxjs';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { FloatLabel } from 'primeng/floatlabel';
import { InputGroup } from 'primeng/inputgroup';
import { InputText } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';

import { VariantOption, VariantsLookupService } from '../../services/variants-lookup.service';

@Component({
  selector: 'app-variant-picker',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, Button, Dialog, FloatLabel, InputGroup, InputText, TableModule],
  templateUrl: './variant-picker.component.html',
  styleUrl: './variant-picker.component.scss',
})
export class VariantPickerComponent implements OnInit, OnChanges {
  private static nextId = 0;
  private readonly destroyRef = inject(DestroyRef);
  private readonly variantsLookup = inject(VariantsLookupService);

  @Input() label = 'Variante';
  @Input() placeholder = 'Seleccionar variante';
  @Input() disabled = false;
  @Input() value: string | null = null;
  @Input() displayValue: string | null = null;

  @Output() valueChange = new EventEmitter<string | null>();
  @Output() variantSelected = new EventEmitter<VariantOption>();

  dialogVisible = false;
  loading = false;
  results: VariantOption[] = [];

  readonly searchControl = new FormControl<string>('', { nonNullable: true });
  displayText = '';
  readonly inputId = `variantPicker_${VariantPickerComponent.nextId++}`;

  ngOnInit(): void {
    this.searchControl.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        tap(() => {
          this.loading = true;
        }),
        switchMap((term) => this.variantsLookup.searchVariants({ term, limit: 50 })),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (options) => {
          this.results = options;
          this.loading = false;
        },
        error: () => {
          this.results = [];
          this.loading = false;
        },
      });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['displayValue']) {
      this.displayText = this.displayValue ?? '';
    }
  }

  openDialog(): void {
    if (this.disabled) {
      return;
    }
    this.dialogVisible = true;
    this.searchControl.setValue('');
    this.triggerInitialSearch();
  }

  closeDialog(): void {
    this.dialogVisible = false;
  }

  clearSelection(): void {
    this.displayText = '';
    this.value = null;
    this.valueChange.emit(null);
  }

  selectVariant(option: VariantOption): void {
    this.displayText = option.label;
    this.value = option.id;
    this.valueChange.emit(option.id);
    this.variantSelected.emit(option);
    this.dialogVisible = false;
  }

  private triggerInitialSearch(): void {
    this.loading = true;
    this.variantsLookup.searchVariants({ term: '', limit: 50 }).subscribe({
      next: (options) => {
        this.results = options;
        this.loading = false;
      },
      error: () => {
        this.results = [];
        this.loading = false;
      },
    });
  }
}
