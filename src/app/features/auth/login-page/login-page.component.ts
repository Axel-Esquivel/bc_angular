import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize, take, tap } from 'rxjs';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { InputText } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { Toast } from 'primeng/toast';

import { AuthService } from '../../../core/auth/auth.service';
import { WorkspacesApiService } from '../../../core/api/workspaces-api.service';
import { LoggerService } from '../../../core/logging/logger.service';
import { LoginRequest } from '../../../shared/models/auth.model';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, Card, InputText, PasswordModule, Button, Toast],
  templateUrl: './login-page.component.html',
  styleUrl: './login-page.component.scss',
  providers: [MessageService],
})
export class LoginPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly workspacesApi = inject(WorkspacesApiService);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);
  private readonly logger = inject(LoggerService);

  isSubmitting = false;

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  onSubmit(): void {
    if (this.form.invalid || this.isSubmitting) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.logger.debug('[auth] login start');
    const credentials = this.form.getRawValue();
    const payload: LoginRequest = {
      email: credentials.email,
      password: credentials.password,
    };

    this.authService
      .login(payload)
      .pipe(
        tap(() => {
          this.logger.debug('[auth] login success');
        }),
        finalize(() => {
          this.logger.debug('[auth] login finalize');
          this.isSubmitting = false;
        })
      )
      .subscribe({
        next: () => {
          this.workspacesApi
            .listMine()
            .pipe(take(1))
            .subscribe((response) => {
              const workspaces = response.result?.workspaces ?? [];
              if (workspaces.length === 0) {
                this.router.navigateByUrl('/workspaces/onboarding');
                return;
              }

              const defaultId = response.result?.defaultWorkspaceId ?? null;
              if (defaultId) {
                this.router.navigateByUrl(`/workspace/${defaultId}/dashboard`);
                return;
              }

              this.router.navigateByUrl('/workspaces/select');
            });
        },
        error: (error) => {
          const detail = error?.error?.message ?? 'No se pudo iniciar sesion.';
          this.messageService.add({ severity: 'error', summary: 'Error', detail });
        },
      });
  }

}
