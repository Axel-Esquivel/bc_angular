import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { Toast } from 'primeng/toast';

import { OrganizationsService } from '../../../../core/api/organizations-api.service';
import { WorkspacesApiService } from '../../../../core/api/workspaces-api.service';
import { CompanyStateService } from '../../../../core/company/company-state.service';
import { Workspace } from '../../../../shared/models/workspace.model';

@Component({
  selector: 'app-workspace-onboarding',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    Card,
    Button,
    DialogModule,
    InputText,
    Select,
    Toast,
  ],
  templateUrl: './workspace-onboarding.component.html',
  styleUrl: './workspace-onboarding.component.scss',
  providers: [MessageService],
})
export class WorkspaceOnboardingComponent implements OnInit {
  private readonly organizationsApi = inject(OrganizationsService);
  private readonly workspacesApi = inject(WorkspacesApiService);
  private readonly companyState = inject(CompanyStateService);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);
  private readonly fb = inject(FormBuilder);

  createDialogOpen = false;
  joinDialogOpen = false;
  submittingCreate = false;
  submittingJoin = false;

  readonly createForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    organizationId: ['', [Validators.required]],
    countryId: ['', [Validators.required]],
  });

  readonly joinForm = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.minLength(4)]],
  });

  organizationOptions: { label: string; value: string }[] = [];
  countryOptions: { label: string; value: string }[] = [
    { label: 'Argentina', value: 'AR' },
    { label: 'Chile', value: 'CL' },
    { label: 'Colombia', value: 'CO' },
    { label: 'Mexico', value: 'MX' },
    { label: 'Peru', value: 'PE' },
  ];

  ngOnInit(): void {
    this.loadOrganizations();
    if (!this.createForm.controls.countryId.value) {
      this.createForm.controls.countryId.setValue(this.countryOptions[0]?.value ?? '');
    }
  }

  openCreateDialog(): void {
    this.createDialogOpen = true;
  }

  openJoinDialog(): void {
    this.joinDialogOpen = true;
  }

  createWorkspace(): void {
    if (this.createForm.invalid || this.submittingCreate) {
      this.createForm.markAllAsTouched();
      return;
    }

    this.submittingCreate = true;
    const payload = this.createForm.getRawValue();

    this.workspacesApi
      .create({
        name: payload.name,
        organizationId: payload.organizationId,
        countryId: payload.countryId,
      })
      .subscribe({
      next: ({ result }) => {
        if (result) {
          this.finishOnboardingSetup(result);
        }
        this.submittingCreate = false;
        this.createDialogOpen = false;
        this.createForm.reset();
      },
      error: () => {
        this.submittingCreate = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo crear la compania.',
        });
      },
    });
  }

  joinWorkspace(): void {
    if (this.joinForm.invalid || this.submittingJoin) {
      this.joinForm.markAllAsTouched();
      return;
    }

    this.submittingJoin = true;
    const payload = this.joinForm.getRawValue();
    const code = payload.code.trim().toUpperCase();

    this.workspacesApi.join({ code }).subscribe({
      next: ({ result }) => {
        if (result) {
          this.finishOnboarding(result);
        }
        this.submittingJoin = false;
        this.joinDialogOpen = false;
        this.joinForm.reset();
      },
      error: () => {
        this.submittingJoin = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo unir a la compania con ese codigo.',
        });
      },
    });
  }

  private finishOnboarding(workspace: Workspace): void {
    this.refreshWorkspaces(() => {
      const workspaceId = this.getWorkspaceId(workspace);
      if (!workspaceId) {
        return;
      }

      this.companyState.setActiveCompanyId(workspaceId);
      if (!this.companyState.getDefaultCompanyId()) {
        this.companyState.setDefaultCompanyId(workspaceId);
      }
      this.router.navigateByUrl(`/company/${workspaceId}/dashboard`);
    });
  }

  private finishOnboardingSetup(workspace: Workspace): void {
    this.refreshWorkspaces(() => {
      const workspaceId = this.getWorkspaceId(workspace);
      if (!workspaceId) {
        return;
      }

      this.companyState.setActiveCompanyId(workspaceId);
      if (!this.companyState.getDefaultCompanyId()) {
        this.companyState.setDefaultCompanyId(workspaceId);
      }
      this.router.navigateByUrl(`/company/${workspaceId}/setup`);
    });
  }

  private refreshWorkspaces(onDone: () => void): void {
    this.workspacesApi.listMine().subscribe({
      next: (response) => {
        const payload = response.result;
        if (payload?.defaultWorkspaceId) {
          this.companyState.setDefaultCompanyId(payload.defaultWorkspaceId);
        }
        onDone();
      },
      error: () => onDone(),
    });
  }

  private getWorkspaceId(workspace: Workspace | null | undefined): string | null {
    return workspace?.id ?? workspace?._id ?? null;
  }

  private loadOrganizations(): void {
    this.organizationsApi.list().subscribe({
      next: ({ result }) => {
        this.organizationOptions = (result ?? []).map((org) => ({
          label: org.name,
          value: org.id ?? '',
        }));
        const first = this.organizationOptions[0]?.value ?? '';
        if (first && !this.createForm.controls.organizationId.value) {
          this.createForm.controls.organizationId.setValue(first);
        }
      },
      error: () => {
        this.organizationOptions = [];
        this.messageService.add({
          severity: 'warn',
          summary: 'Organizaciones',
          detail: 'No se pudieron cargar las organizaciones.',
        });
      },
    });
  }
}
