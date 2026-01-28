import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';

import { AuthService } from '../../../../core/auth/auth.service';
import { OrganizationsService } from '../../../../core/api/organizations-api.service';

@Component({
  selector: 'app-organization-entry-page',
  templateUrl: './organization-entry-page.component.html',
  styleUrl: './organization-entry-page.component.scss',
  standalone: false,
  providers: [MessageService],
})
export class OrganizationEntryPageComponent implements OnInit {
  joinForm: FormGroup<{
    email: FormControl<string>;
    orgCode: FormControl<string>;
  }>;
  submitting = false;

  constructor(
    private readonly organizationsApi: OrganizationsService,
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly fb: FormBuilder,
    private readonly messageService: MessageService,
  ) {
    this.joinForm = this.fb.nonNullable.group({
      email: ['', [Validators.required, Validators.email]],
      orgCode: ['', [Validators.required, Validators.minLength(4)]],
    });
  }

  ngOnInit(): void {
    const email = this.authService.getCurrentUser()?.email ?? '';
    if (email) {
      this.joinForm.patchValue({ email });
    }
  }

  goToCreate(): void {
    this.router.navigateByUrl('/organizations/setup');
  }

  submitJoinRequest(): void {
    if (this.joinForm.invalid || this.submitting) {
      this.joinForm.markAllAsTouched();
      return;
    }

    this.submitting = true;
    const payload = this.joinForm.getRawValue();
    this.organizationsApi.joinRequest({
      email: payload.email.trim(),
      orgCode: payload.orgCode.trim().toUpperCase(),
    }).subscribe({
      next: () => {
        this.submitting = false;
        this.router.navigateByUrl('/organizations/pending');
      },
      error: (error) => {
        this.submitting = false;
        const message = error?.error?.message;
        const detail =
          message === 'Organization not found'
            ? 'No encontramos una organizacion con ese codigo.'
            : message === 'Email does not match requester'
              ? 'El correo no coincide con tu usuario.'
              : 'No se pudo enviar la solicitud.';
        this.messageService.add({
          severity: 'error',
          summary: 'Unirse a organizacion',
          detail,
        });
      },
    });
  }
}
