import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { InputText } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';

import { AuthService } from '../../../core/auth/auth.service';
import { LoginRequest } from '../../../shared/models/auth.model';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, Card, InputText, PasswordModule, Button],
  templateUrl: './login-page.component.html',
  styleUrl: './login-page.component.scss',
})
export class LoginPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  errorMessage = '';
  isSubmitting = false;

  readonly form = this.fb.nonNullable.group({
    identifier: ['', [Validators.required]],
    password: ['', Validators.required],
    workspaceId: [''],
    deviceId: [''],
  });

  submit(): void {
    if (this.form.invalid || this.isSubmitting) {
      this.form.markAllAsTouched();
      return;
    }

    this.errorMessage = '';
    this.isSubmitting = true;
    const credentials = this.form.getRawValue();
    const payload: LoginRequest = {
      identifier: credentials.identifier,
      password: credentials.password,
      workspaceId: credentials.workspaceId || undefined,
      deviceId: credentials.deviceId || undefined,
    };

    this.authService.login(payload).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: (error) => {
        this.errorMessage = error?.error?.message ?? 'No se pudo iniciar sesión.';
        this.isSubmitting = false;
      },
      complete: () => (this.isSubmitting = false),
    });
  }
}
