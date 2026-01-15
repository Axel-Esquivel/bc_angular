import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { InputText } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { Toast } from 'primeng/toast';
import { MessageService } from 'primeng/api';

import { SetupApiService } from '../../../core/api/setup-api.service';

@Component({
  selector: 'app-initial-setup-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, Card, InputText, PasswordModule, Button, Toast],
  templateUrl: './initial-setup-page.component.html',
  styleUrl: './initial-setup-page.component.scss',
  providers: [MessageService],
})
export class InitialSetupPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly setupApi = inject(SetupApiService);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);

  loading = false;

  form = this.fb.nonNullable.group({
    dbName: ['', [Validators.required, Validators.minLength(2)]],
    adminName: ['', [Validators.required, Validators.minLength(3)]],
    adminEmail: ['', [Validators.required, Validators.email]],
    adminPassword: ['', [Validators.required, Validators.minLength(6)]],
  });

  submit(): void {
    if (this.form.invalid || this.loading) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.setupApi.initialize(this.form.getRawValue()).subscribe({
      next: () => {
        this.loading = false;
        void this.router.navigate(['/setup/modules']);
      },
      error: (error) => {
        this.loading = false;
        const detail = error?.error?.message || 'No se pudo completar la configuracion inicial.';
        this.messageService.add({ severity: 'error', summary: 'Error', detail });
      },
    });
  }
}
