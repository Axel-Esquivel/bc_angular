import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormArray, FormBuilder, FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { Checkbox } from 'primeng/checkbox';
import { switchMap, take } from 'rxjs';

import { AuthService } from '../../../../core/auth/auth.service';
import { OrganizationsService } from '../../../../core/api/organizations-api.service';
import { OrganizationModuleOverviewItem } from '../../../../shared/models/organization-modules.model';
import { SetupStateService } from '../../services/setup-state.service';

@Component({
  selector: 'app-setup-modules-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, Button, Card, Checkbox],
  templateUrl: './setup-modules-page.component.html',
  styleUrl: './setup-modules-page.component.scss',
  providers: [MessageService],
})
export class SetupModulesPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly setupState = inject(SetupStateService);
  private readonly organizationsApi = inject(OrganizationsService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);

  modules: OrganizationModuleOverviewItem[] = [];
  selectableModules: OrganizationModuleOverviewItem[] = [];
  isLoading = false;
  isSubmitting = false;

  readonly form = this.fb.group({
    modules: this.fb.array<FormControl<boolean>>([]),
  });

  get modulesArray(): FormArray<FormControl<boolean>> {
    return this.form.controls.modules as FormArray<FormControl<boolean>>;
  }

  ngOnInit(): void {
    const organizationId = this.setupState.getOrganizationId();
    if (!organizationId) {
      this.router.navigate(['/setup/create']);
      return;
    }

    this.loadModules(organizationId);
  }

  private loadModules(organizationId: string): void {
    this.isLoading = true;
    this.organizationsApi
      .getModulesOverview(organizationId)
      .pipe(take(1))
      .subscribe({
        next: (response) => {
          const modules = response?.result?.modules ?? [];
          this.modules = modules;
          this.selectableModules = modules.filter((module) => !module.isSystem);
          const controls = this.selectableModules.map((module) =>
            this.fb.nonNullable.control(module.state?.status !== 'disabled')
          );
          this.form.setControl('modules', this.fb.nonNullable.array(controls));
          this.isLoading = false;
        },
        error: () => {
          this.isLoading = false;
          this.modules = [];
          this.selectableModules = [];
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudieron cargar los modulos.',
          });
        },
      });
  }

  save(): void {
    if (this.form.invalid || this.isSubmitting) {
      this.form.markAllAsTouched();
      return;
    }

    const organizationId = this.setupState.getOrganizationId();
    if (!organizationId) {
      this.router.navigate(['/setup/create']);
      return;
    }

    this.isSubmitting = true;
    const selectedKeys = this.selectableModules
      .filter((_, index) => this.modulesArray.at(index).value)
      .map((module) => module.key);

    this.organizationsApi
      .updateModules(organizationId, { modules: selectedKeys })
      .pipe(
        switchMap(() => this.organizationsApi.setDefaultOrganization(organizationId)),
        switchMap(() => this.authService.loadMe()),
        take(1)
      )
      .subscribe({
        next: () => {
          this.setupState.clear();
          this.isSubmitting = false;
          this.router.navigate(['/context/select']);
        },
        error: () => {
          this.isSubmitting = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudieron guardar los modulos.',
          });
        },
      });
  }
}
