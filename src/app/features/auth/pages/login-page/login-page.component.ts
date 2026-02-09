import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize, of, switchMap, tap } from 'rxjs';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { FloatLabel } from 'primeng/floatlabel';
import { InputText } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';

import { AuthService } from '../../../../core/auth/auth.service';
import { UsersApiService } from '../../../../core/api/users-api.service';
import { LoggerService } from '../../../../core/logging/logger.service';
import { ActiveContextStateService } from '../../../../core/context/active-context-state.service';
import { CompanyStateService } from '../../../../core/company/company-state.service';
import { LoginRequest } from '../../../../shared/models/auth.model';
import { DefaultContext } from '../../../../shared/models/default-context.model';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, Card, FloatLabel, InputText, PasswordModule, Button],
  templateUrl: './login-page.component.html',
  styleUrl: './login-page.component.scss',
  providers: [MessageService],
})
export class LoginPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly usersApi = inject(UsersApiService);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);
  private readonly logger = inject(LoggerService);
  private readonly activeContextState = inject(ActiveContextStateService);
  private readonly companyState = inject(CompanyStateService);

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
        switchMap((user) => {
          const defaultContext = user?.preferences?.defaultContext ?? null;
          if (!defaultContext) {
            return of({ defaultContext, validation: null });
          }
          return this.usersApi.validateDefaultContext(defaultContext).pipe(
            switchMap((response) => of({ defaultContext, validation: response.result ?? null })),
          );
        }),
        finalize(() => {
          this.logger.debug('[auth] login finalize');
          this.isSubmitting = false;
        })
      )
      .subscribe({
        next: ({ defaultContext, validation }) => {
          if (validation?.isComplete && validation.isValid) {
            const context = validation.sanitizedContext ?? (defaultContext as DefaultContext);
            this.activeContextState.setActiveContext({
              organizationId: context.organizationId ?? null,
              companyId: context.companyId ?? null,
              countryId: context.countryId ?? null,
              enterpriseId: context.enterpriseId ?? null,
              currencyId: context.currencyId ?? null,
            });
            if (context.companyId) {
              this.companyState.setActiveCompanyId(context.companyId);
              this.companyState.setDefaultCompanyId(context.companyId);
            }
            this.router.navigateByUrl('/dashboard');
            return;
          }
          this.router.navigateByUrl('/context/select');
        },
        error: (error) => {
          const detail = error?.error?.message ?? 'No se pudo iniciar sesion.';
          this.messageService.add({ severity: 'error', summary: 'Error', detail });
        },
      });
  }

}
