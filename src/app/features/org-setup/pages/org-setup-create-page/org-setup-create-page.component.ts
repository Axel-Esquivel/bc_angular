import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-org-setup-create-page',
  templateUrl: './org-setup-create-page.component.html',
  styleUrl: './org-setup-create-page.component.scss',
  standalone: false,
})
export class OrgSetupCreatePageComponent {
  isSubmitting = false;

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
  });

  constructor(private readonly fb: FormBuilder, private readonly router: Router) {}

  submit(): void {
    if (this.form.invalid || this.isSubmitting) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.router.navigateByUrl('/org/setup/bootstrap');
    this.isSubmitting = false;
  }

  cancel(): void {
    this.router.navigate(['/org/setup']);
  }
}
