import { Component } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';

import { OrganizationsService } from '../../../../core/api/organizations-api.service';
import { AuthService } from '../../../../core/auth/auth.service';

@Component({
  selector: 'app-organization-join-page',
  templateUrl: './organization-join-page.component.html',
  styleUrl: './organization-join-page.component.scss',
  providers: [MessageService],
  standalone: false,
})
export class OrganizationJoinPageComponent {
  submitting = false;

  form!: FormGroup<{
    selector: FormControl<string>;
  }>;

  constructor(
    private readonly organizationsApi: OrganizationsService,
    private readonly fb: FormBuilder,
    private readonly router: Router,
    private readonly messageService: MessageService,
    private readonly authService: AuthService,
  ) {
    this.form = this.fb.nonNullable.group({
      selector: ['', [Validators.required, Validators.minLength(4)]],
    });
  }

  submit(): void {
    if (this.form.invalid || this.submitting) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting = true;
    const payload = this.form.getRawValue();
    const input = payload.selector.trim();
    const request =
      input.includes('@')
        ? { email: input.toLowerCase() }
        : { code: input.toUpperCase() };

    this.organizationsApi.requestJoinByCode(request).subscribe({
      next: (res) => {
        this.submitting = false;
        const organization = res?.result;
        const currentUserId = this.authService.getCurrentUser()?.id ?? null;
        const member = organization?.members?.find((item) => item.userId === currentUserId);
        if (member?.status === 'active') {
          this.router.navigateByUrl('/companies/select');
          return;
        }
        this.router.navigateByUrl('/organizations/pending');
      },
      error: () => {
        this.submitting = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Organizacion',
          detail: 'No se pudo enviar la solicitud.',
        });
      },
    });
  }

  cancel(): void {
    this.router.navigateByUrl('/organizations');
  }
}
