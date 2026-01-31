import { HttpErrorResponse } from '@angular/common/http';
import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { take } from 'rxjs';

import { CurrenciesApiService } from '../../../../core/api/currencies-api.service';
import { Currency } from '../../../../shared/models/currency.model';

@Component({
  selector: 'app-create-currency-form',
  templateUrl: './create-currency-form.component.html',
  standalone: false,
})
export class CreateCurrencyFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly currenciesApi = inject(CurrenciesApiService);

  @Input() showActions = true;

  @Output() created = new EventEmitter<Currency>();
  @Output() cancelled = new EventEmitter<void>();
  @Output() error = new EventEmitter<string>();

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    code: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(6)]],
    symbol: [''],
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.emit('Completa el nombre de la moneda.');
      return;
    }

    const { name, code, symbol } = this.form.getRawValue();
    const trimmedName = name.trim();
    const trimmedCode = code.trim().toUpperCase();
    if (!trimmedName || trimmedCode.length < 2) {
      this.error.emit('El codigo debe tener al menos 2 letras.');
      return;
    }

    this.currenciesApi
      .create({ code: trimmedCode, name: trimmedName, symbol: symbol?.trim() || undefined })
      .pipe(take(1))
      .subscribe({
        next: (response) => {
          const currency: Currency = response?.result ?? {
            id: '',
            name: trimmedName,
            code: trimmedCode,
            symbol: symbol?.trim() || undefined,
          };
          this.created.emit(currency);
          this.form.reset({ name: '', code: '', symbol: '' });
        },
        error: (err) => {
          const status = err instanceof HttpErrorResponse ? err.status : null;
          if (status === 401 || status === 403) {
            this.error.emit('Sin permisos.');
            return;
          }
          this.error.emit('No se pudo crear la moneda.');
        },
      });
  }

  cancel(): void {
    this.form.reset({ name: '', code: '', symbol: '' });
    this.cancelled.emit();
  }
}
