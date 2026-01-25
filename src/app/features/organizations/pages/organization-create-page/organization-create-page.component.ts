import { Component } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';

import { OrganizationsService } from '../../../../core/api/organizations-api.service';

@Component({
  selector: 'app-organization-create-page',
  templateUrl: './organization-create-page.component.html',
  styleUrl: './organization-create-page.component.scss',
  providers: [MessageService],
  standalone: false,
})
export class OrganizationCreatePageComponent {
  submitting = false;

  form!: FormGroup<{
    name: FormControl<string>;
  }>;

  constructor(
    private readonly organizationsApi: OrganizationsService,
    private readonly fb: FormBuilder,
    private readonly router: Router,
    private readonly messageService: MessageService,
  ) {
    this.form = this.fb.nonNullable.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
    });
  }

  submit(): void {
    if (this.form.invalid || this.submitting) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting = true;
    const payload = this.form.getRawValue();
    this.organizationsApi.create({ name: payload.name }).subscribe({
      next: () => {
        this.submitting = false;
        this.router.navigateByUrl('/organizations');
      },
      error: () => {
        this.submitting = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Organizacion',
          detail: 'No se pudo crear la organizacion.',
        });
      },
    });
  }

  cancel(): void {
    this.router.navigateByUrl('/organizations');
  }
}
