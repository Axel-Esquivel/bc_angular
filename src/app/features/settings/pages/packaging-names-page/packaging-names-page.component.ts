import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';

import { PackagingName, PackagingNamesApiService } from '../../../../core/api/packaging-names-api.service';
import { ActiveContextStateService } from '../../../../core/context/active-context-state.service';

type PackagingFormGroup = FormGroup<{
  name: FormControl<string>;
  multiplier: FormControl<number | null>;
  isActive: FormControl<boolean>;
  variableMultiplier: FormControl<boolean>;
}>;

@Component({
  selector: 'app-packaging-names-page',
  standalone: false,
  templateUrl: './packaging-names-page.component.html',
  styleUrl: './packaging-names-page.component.scss',
  providers: [MessageService],
})
export class PackagingNamesPageComponent implements OnInit {
  private readonly packagingNamesApi = inject(PackagingNamesApiService);
  private readonly activeContextState = inject(ActiveContextStateService);
  private readonly messageService = inject(MessageService);
  private readonly fb = inject(FormBuilder);

  packagingNames: PackagingName[] = [];
  loading = false;
  dialogVisible = false;
  saving = false;
  editing: PackagingName | null = null;

  readonly form: PackagingFormGroup = this.fb.group({
    name: this.fb.nonNullable.control('', [Validators.required]),
    multiplier: this.fb.control<number | null>(1, [Validators.required, Validators.min(1)]),
    isActive: this.fb.nonNullable.control(true),
    variableMultiplier: this.fb.nonNullable.control(false),
  });

  ngOnInit(): void {
    this.loadPackagings();
  }

  get organizationId(): string | null {
    return this.activeContextState.getActiveContext().organizationId ?? null;
  }

  openCreate(): void {
    this.editing = null;
    this.form.reset({ name: '', multiplier: 1, isActive: true, variableMultiplier: false });
    this.dialogVisible = true;
  }

  openEdit(item: PackagingName): void {
    this.editing = item;
    this.form.reset({
      name: item.name,
      multiplier: item.multiplier ?? 1,
      isActive: item.isActive ?? true,
      variableMultiplier: item.variableMultiplier ?? false,
    });
    this.dialogVisible = true;
  }

  closeDialog(): void {
    if (this.saving) {
      return;
    }
    this.dialogVisible = false;
  }

  save(): void {
    const organizationId = this.organizationId;
    if (!organizationId) {
      this.showError('Selecciona una organización.');
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    const payload = {
      name: raw.name.trim(),
      multiplier: raw.multiplier ?? 1,
      isActive: raw.isActive,
      variableMultiplier: raw.variableMultiplier,
    };
    this.saving = true;
    const request$ = this.editing
      ? this.packagingNamesApi.update(this.editing.id, organizationId, payload)
      : this.packagingNamesApi.create({
          organizationId,
          ...payload,
        });
    request$.subscribe({
      next: () => {
        this.saving = false;
        this.dialogVisible = false;
        this.loadPackagings();
        this.messageService.add({
          severity: 'success',
          summary: 'Empaques',
          detail: this.editing ? 'Empaque actualizado.' : 'Empaque creado.',
        });
      },
      error: () => {
        this.saving = false;
        this.showError(this.editing ? 'No se pudo actualizar.' : 'No se pudo crear.');
      },
    });
  }

  deactivate(item: PackagingName): void {
    const organizationId = this.organizationId;
    if (!organizationId) {
      this.showError('Selecciona una organización.');
      return;
    }
    this.packagingNamesApi.update(item.id, organizationId, { isActive: false }).subscribe({
      next: () => {
        this.loadPackagings();
      },
      error: () => {
        this.showError('No se pudo desactivar el empaque.');
      },
    });
  }

  private loadPackagings(): void {
    const organizationId = this.organizationId;
    if (!organizationId) {
      this.packagingNames = [];
      return;
    }
    this.loading = true;
    this.packagingNamesApi.list(organizationId).subscribe({
      next: ({ result }) => {
        this.packagingNames = Array.isArray(result) ? result : [];
        this.loading = false;
      },
      error: () => {
        this.packagingNames = [];
        this.loading = false;
        this.showError('No se pudieron cargar los empaques.');
      },
    });
  }

  private showError(detail: string): void {
    this.messageService.add({
      severity: 'error',
      summary: 'Empaques',
      detail,
    });
  }
}
