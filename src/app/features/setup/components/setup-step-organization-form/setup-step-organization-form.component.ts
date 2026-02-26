import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ConfirmationService, MessageService } from 'primeng/api';
import { take } from 'rxjs/operators';

import { OrganizationsService } from '../../../../core/api/organizations-api.service';

@Component({
  selector: 'app-setup-step-organization-form',
  templateUrl: './setup-step-organization-form.component.html',
  styleUrl: './setup-step-organization-form.component.scss',
  standalone: false,
})
export class SetupStepOrganizationFormComponent implements OnChanges, OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly organizationsApi = inject(OrganizationsService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);

  @Input() isSubmitting = false;
  @Input() organizationId?: string | null;
  @Input() existingOrganizations: Array<{ id: string; name: string }> = [];

  @Output() created = new EventEmitter<string>();
  @Output() validChange = new EventEmitter<boolean>();

  readonly form = this.fb.nonNullable.group({
    name: this.fb.nonNullable.control('', [Validators.required, Validators.minLength(2)]),
  });

  private loadedOrganizationId: string | null = null;
  private loadedOrganizationName: string | null = null;

  constructor() {
    this.form.statusChanges.subscribe(() => {
      this.validChange.emit(this.form.valid);
    });
  }

  ngOnInit(): void {
    if (this.organizationId) {
      this.loadOrganization(this.organizationId);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isSubmitting'] && this.isSubmitting) {
      this.submit();
    }
    if (changes['organizationId'] && this.organizationId) {
      this.loadOrganization(this.organizationId);
    }
  }

  private submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.created.emit('');
      return;
    }

    const name = this.normalizeName(this.form.value.name);
    if (!name) {
      this.form.controls.name.markAsTouched();
      this.created.emit('');
      return;
    }

    if (this.organizationId) {
      if (this.loadedOrganizationName && this.normalizeName(this.loadedOrganizationName) === name) {
        this.created.emit(this.organizationId);
        return;
      }
      this.organizationsApi
        .updateOrganization(this.organizationId, { name })
        .pipe(take(1))
        .subscribe({
          next: () => {
            this.loadedOrganizationName = name;
            this.messageService.add({
              severity: 'success',
              summary: 'Listo',
              detail: 'Organizacion actualizada.',
            });
            this.created.emit(this.organizationId ?? '');
          },
          error: () => {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'No se pudo actualizar la organizacion.',
            });
            this.created.emit('');
          },
        });
      return;
    }

    const existing = this.findExistingOrganization(name);
    if (existing) {
      this.confirmationService.confirm({
        header: 'Organizacion existente',
        message: `Ya existe la organizacion "${existing.name}". ¿Quieres usarla y continuar su configuracion?`,
        acceptLabel: 'Usar',
        rejectLabel: 'Cancelar',
        accept: () => {
          this.messageService.add({
            severity: 'info',
            summary: 'Organizacion',
            detail: 'Usando organizacion existente.',
          });
          this.created.emit(existing.id);
        },
        reject: () => {
          this.created.emit('');
        },
      });
      return;
    }

    this.organizationsApi
      .create({ name })
      .pipe(take(1))
      .subscribe({
        next: (response) => {
          const organizationId = response?.result?.id ?? '';
          if (!organizationId) {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'No se pudo obtener el identificador de la organizacion.',
            });
            this.created.emit('');
            return;
          }
          this.messageService.add({
            severity: 'success',
            summary: 'Listo',
            detail: 'Organizacion creada. Ahora configura paises y monedas.',
          });
          this.created.emit(organizationId);
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo crear la organizacion.',
          });
          this.created.emit('');
        },
      });
  }

  private loadOrganization(organizationId: string): void {
    if (!organizationId || this.loadedOrganizationId === organizationId) {
      return;
    }
    this.organizationsApi
      .getById(organizationId)
      .pipe(take(1))
      .subscribe({
        next: (response) => {
          const name = response?.result?.name;
          if (name) {
            this.form.patchValue({ name });
            this.loadedOrganizationName = name;
          }
          this.loadedOrganizationId = organizationId;
        },
        error: () => {
          this.loadedOrganizationId = organizationId;
        },
      });
  }

  private normalizeName(value: string | null | undefined): string {
    return (value ?? '').replace(/\s+/g, ' ').trim();
  }

  private findExistingOrganization(normalizedName: string): { id: string; name: string } | null {
    const target = normalizedName.toLowerCase();
    const candidates = this.existingOrganizations ?? [];
    for (const org of candidates) {
      if (!org?.id || !org?.name) {
        continue;
      }
      if (this.normalizeName(org.name).toLowerCase() === target) {
        return { id: org.id, name: org.name };
      }
    }
    return null;
  }
}
