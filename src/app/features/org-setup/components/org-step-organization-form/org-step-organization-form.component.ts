import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { take } from 'rxjs/operators';

import { OrganizationsService } from '../../../../core/api/organizations-api.service';

@Component({
  selector: 'app-org-step-organization-form',
  templateUrl: './org-step-organization-form.component.html',
  styleUrl: './org-step-organization-form.component.scss',
  standalone: false,
})
export class OrgStepOrganizationFormComponent implements OnChanges {
  private readonly fb = inject(FormBuilder);
  private readonly organizationsApi = inject(OrganizationsService);
  private readonly messageService = inject(MessageService);

  @Input() isSubmitting = false;

  @Output() created = new EventEmitter<string>();
  @Output() validChange = new EventEmitter<boolean>();

  readonly form = this.fb.nonNullable.group({
    name: this.fb.nonNullable.control('', [Validators.required, Validators.minLength(2)]),
  });

  constructor() {
    this.form.statusChanges.subscribe(() => {
      this.validChange.emit(this.form.valid);
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isSubmitting'] && this.isSubmitting) {
      this.submit();
    }
  }

  private submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.created.emit('');
      return;
    }

    const name = this.form.value.name?.trim();
    if (!name) {
      this.form.controls.name.markAsTouched();
      this.created.emit('');
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
}
