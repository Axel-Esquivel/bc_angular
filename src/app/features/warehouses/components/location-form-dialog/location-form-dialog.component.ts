import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Button } from 'primeng/button';
import { Checkbox } from 'primeng/checkbox';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';

import {
  LocationNode,
  LocationType,
  LocationUsage,
} from '../../services/warehouses.service';

export interface LocationFormValue {
  code: string;
  name: string;
  type: LocationType;
  usage: LocationUsage;
  active: boolean;
}

interface Option<T extends string> {
  label: string;
  value: T;
  description: string;
}

@Component({
  selector: 'app-location-form-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, InputText, Select, Checkbox, Button],
  templateUrl: './location-form-dialog.component.html',
  styleUrl: './location-form-dialog.component.scss',
})
export class LocationFormDialogComponent implements OnChanges {
  private readonly fb = inject(FormBuilder);

  @Input() location: LocationNode | null = null;
  @Input() parentLabel = 'Raiz';
  @Input() submitting = false;
  @Output() save = new EventEmitter<LocationFormValue>();
  @Output() cancel = new EventEmitter<void>();

  readonly typeOptions: Array<Option<LocationType>> = [
    { label: 'Interna', value: 'internal', description: 'Uso interno dentro de la empresa.' },
    { label: 'Proveedor', value: 'supplier', description: 'Ubicaciones asociadas a proveedor.' },
    { label: 'Cliente', value: 'customer', description: 'Ubicaciones asociadas a clientes.' },
    { label: 'Merma', value: 'inventory_loss', description: 'Perdidas y mermas de inventario.' },
    { label: 'Transito', value: 'transit', description: 'Stock en traslado entre bodegas.' },
    { label: 'Produccion', value: 'production', description: 'Proceso o area de produccion.' },
  ];

  readonly usageOptions: Array<Option<LocationUsage>> = [
    { label: 'Almacenaje', value: 'storage', description: 'Ubicacion principal de stock.' },
    { label: 'Picking', value: 'picking', description: 'Preparacion de pedidos.' },
    { label: 'Recepcion', value: 'receiving', description: 'Ingreso y control de recepcion.' },
    { label: 'Despacho', value: 'shipping', description: 'Salida y despacho de mercaderia.' },
    { label: 'Scrap', value: 'scrap', description: 'Desechos o material inutilizable.' },
    { label: 'Transito', value: 'transit', description: 'Stock en movimiento.' },
    { label: 'Virtual', value: 'virtual', description: 'Ubicacion virtual o logica.' },
  ];

  readonly form = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.minLength(2)]],
    name: ['', [Validators.required, Validators.minLength(2)]],
    type: 'internal' as LocationType,
    usage: 'storage' as LocationUsage,
    active: true,
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['location']) {
      this.form.reset({
        code: this.location?.code ?? '',
        name: this.location?.name ?? '',
        type: this.location?.type ?? 'internal',
        usage: this.location?.usage ?? 'storage',
        active: this.location?.active ?? true,
      });
    }
  }

  get typeHelp(): string {
    const selected = this.typeOptions.find((option) => option.value === this.form.controls.type.value);
    return selected?.description ?? 'Define el rol de la ubicacion en el inventario.';
  }

  get usageHelp(): string {
    const selected = this.usageOptions.find((option) => option.value === this.form.controls.usage.value);
    return selected?.description ?? 'Define como se utiliza esta ubicacion.';
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
      type: raw.type,
      usage: raw.usage,
      active: raw.active,
    });
  }

  onCancel(): void {
    this.cancel.emit();
  }
}
