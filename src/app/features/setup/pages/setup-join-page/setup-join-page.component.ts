import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { FloatLabel } from 'primeng/floatlabel';
import { InputText } from 'primeng/inputtext';

import { OrganizationService } from '../../services/organization.service';

@Component({
  selector: 'app-setup-join-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, Button, Card, FloatLabel, InputText],
  templateUrl: './setup-join-page.component.html',
  styleUrl: './setup-join-page.component.scss',
  providers: [MessageService],
})
export class SetupJoinPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly organizationService = inject(OrganizationService);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);

  readonly form = this.fb.nonNullable.group({
    codeOrName: ['', [Validators.required, Validators.minLength(2)]],
  });

  isSubmitting = false;

  submit(): void {
    if (this.form.invalid || this.isSubmitting) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.organizationService.joinOrganization(this.form.getRawValue()).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.messageService.add({
          severity: 'success',
          summary: 'Listo',
          detail: 'Solicitud enviada. Espera la aprobacion de un administrador.',
        });
        this.router.navigateByUrl('/setup', { state: { refresh: true } });
      },
      error: () => {
        this.isSubmitting = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo enviar la solicitud.',
        });
      },
    });
  }
}
