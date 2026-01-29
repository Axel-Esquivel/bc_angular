import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';

import { AuthService } from '../../../../core/auth/auth.service';
import { OrganizationsService } from '../../../../core/api/organizations-api.service';
import { IOrganization } from '../../../../shared/models/organization.model';

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
  createForm: FormGroup<{
    name: FormControl<string>;
  }>;
  organizations: IOrganization[] = [];
  submitting = false;
  createDialogOpen = false;

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
    this.createForm = this.fb.nonNullable.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
    });
  }

  ngOnInit(): void {
    const email = this.authService.getCurrentUser()?.email ?? '';
    if (email) {
      this.joinForm.patchValue({ email });
    }

    this.organizationsApi.list().subscribe({
      next: (res) => {
        this.organizations = res?.result ?? [];
      },
      error: () => {
        this.organizations = [];
      },
    });
  }

  openCreateDialog(): void {
    this.createForm.reset();
    this.createDialogOpen = true;
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

  createOrganization(): void {
    if (this.createForm.invalid || this.submitting) {
      this.createForm.markAllAsTouched();
      return;
    }

    this.submitting = true;
    const payload = this.createForm.getRawValue();
    this.organizationsApi.create({ name: payload.name.trim() }).subscribe({
      next: (res) => {
        const organization = res?.result ?? null;
        if (!organization?.id) {
          this.submitting = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Organizaciones',
            detail: 'No se pudo crear la organizacion.',
          });
          return;
        }

        this.organizations = [organization, ...this.organizations.filter((item) => item.id !== organization.id)];
        this.organizationsApi.setDefaultOrganization(organization.id).subscribe({
          next: () => {
            this.authService.refreshToken().subscribe({
              next: () => {
                this.submitting = false;
                this.createDialogOpen = false;
                this.router.navigateByUrl('/onboarding');
              },
              error: () => {
                this.submitting = false;
                this.createDialogOpen = false;
                this.router.navigateByUrl('/onboarding');
              },
            });
          },
          error: () => {
            this.submitting = false;
            this.createDialogOpen = false;
            this.router.navigateByUrl('/onboarding');
          },
        });
      },
      error: (error) => {
        this.submitting = false;
        const status = error?.status;
        const message = error?.error?.message ?? 'No se pudo crear la organizacion.';
        const detail = status ? `${status} - ${message}` : message;
        this.messageService.add({
          severity: 'error',
          summary: 'Organizaciones',
          detail,
        });
      },
    });
  }
}
