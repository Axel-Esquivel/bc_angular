import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';

import { AuthService } from '../../../core/auth/auth.service';
import { RegisterRequest } from '../../../shared/models/auth.model';

@Component({
  selector: 'app-register-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CardModule, InputTextModule, PasswordModule, ButtonModule],
  templateUrl: './register-page.component.html',
  styleUrl: './register-page.component.scss',
})
export class RegisterPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  errorMessage = '';
  isSubmitting = false;

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    username: ['', Validators.required],
    password: ['', [Validators.required, Validators.minLength(6)]],
    workspaceId: [''],
  });

  submit(): void {
    if (this.form.invalid || this.isSubmitting) {
      this.form.markAllAsTouched();
      return;
    }

    this.errorMessage = '';
    this.isSubmitting = true;
    const formValue = this.form.getRawValue();
    const payload: RegisterRequest = {
      email: formValue.email,
      username: formValue.username,
      password: formValue.password,
      workspaceId: formValue.workspaceId || undefined,
    };

    this.authService.register(payload).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: (error) => {
        this.errorMessage = error?.error?.message ?? 'No se pudo completar el registro.';
        this.isSubmitting = false;
      },
      complete: () => (this.isSubmitting = false),
    });
  }
}
