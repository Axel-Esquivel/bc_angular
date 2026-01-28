import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { take } from 'rxjs';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { InputText } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { Toast } from 'primeng/toast';

import { AuthService } from '../../../core/auth/auth.service';
import { WorkspacesApiService } from '../../../core/api/workspaces-api.service';
import { CompanyStateService } from '../../../core/company/company-state.service';
import { RegisterRequest } from '../../../shared/models/auth.model';

@Component({
  selector: 'app-register-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, Card, InputText, PasswordModule, Button, Toast],
  templateUrl: './register-page.component.html',
  styleUrl: './register-page.component.scss',
  providers: [MessageService],
})
export class RegisterPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly workspacesApi = inject(WorkspacesApiService);
  private readonly companyState = inject(CompanyStateService);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);

  isSubmitting = false;

  readonly form = this.fb.nonNullable.group({
    firstName: ['', [Validators.required, Validators.minLength(2)]],
    lastName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required, Validators.minLength(7)]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  submit(): void {
    if (this.form.invalid || this.isSubmitting) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    const formValue = this.form.getRawValue();
    const payload: RegisterRequest = {
      firstName: formValue.firstName,
      lastName: formValue.lastName,
      email: formValue.email,
      phone: formValue.phone,
      password: formValue.password,
    };

    this.authService.register(payload).subscribe({
      next: () => {
        this.authService.loadMe().pipe(take(1)).subscribe((user) => {
          if (user?.isFirstTime) {
            this.router.navigateByUrl('/onboarding');
            return;
          }
          this.resolvePostRegister(user?.defaultWorkspaceId ?? null);
        });
      },
      error: (error) => {
        const detail = error?.error?.message ?? 'No se pudo completar el registro.';
        this.messageService.add({ severity: 'error', summary: 'Error', detail });
        this.isSubmitting = false;
      },
      complete: () => (this.isSubmitting = false),
    });
  }

  private resolvePostRegister(userDefaultWorkspaceId: string | null): void {
    this.workspacesApi.listMine().subscribe({
      next: (response) => {
        const workspaces = response.result?.workspaces ?? [];
        const defaultId = response.result?.defaultWorkspaceId ?? userDefaultWorkspaceId;
        const resolvedDefault =
          defaultId && workspaces.some((workspace) => (workspace.id ?? workspace._id) === defaultId)
            ? defaultId
            : null;

        if (resolvedDefault) {
          this.companyState.setDefaultCompanyId(resolvedDefault);
          this.companyState.setActiveCompanyId(resolvedDefault);
          this.router.navigateByUrl(`/company/${resolvedDefault}/dashboard`);
          return;
        }

        if (workspaces.length === 0) {
          this.router.navigate(['/organizations/setup']);
          return;
        }

        this.router.navigate(['/organizations/setup']);
      },
      error: () => {
        this.router.navigate(['/organizations/setup']);
      },
    });
  }
}
