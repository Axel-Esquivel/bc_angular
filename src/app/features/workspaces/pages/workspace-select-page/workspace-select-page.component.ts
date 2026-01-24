import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { take } from 'rxjs';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { Toast } from 'primeng/toast';

import { OrganizationsService } from '../../../../core/api/organizations-api.service';
import { WorkspacesApiService } from '../../../../core/api/workspaces-api.service';
import { TokenStorageService } from '../../../../core/auth/token-storage.service';
import { CompanyStateService } from '../../../../core/company/company-state.service';
import { Workspace } from '../../../../shared/models/workspace.model';

@Component({
  selector: 'app-workspace-select-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    Card,
    TableModule,
    Button,
    DialogModule,
    InputText,
    Select,
    Toast,
  ],
  templateUrl: './workspace-select-page.component.html',
  styleUrl: './workspace-select-page.component.scss',
  providers: [MessageService],
})
export class WorkspaceSelectPageComponent implements OnInit {
  private readonly organizationsApi = inject(OrganizationsService);
  private readonly workspacesApi = inject(WorkspacesApiService);
  private readonly companyState = inject(CompanyStateService);
  private readonly tokenStorage = inject(TokenStorageService);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);
  private readonly fb = inject(FormBuilder);

  workspaces: Workspace[] = [];
  loadingWorkspaces = false;

  createDialogOpen = false;
  joinDialogOpen = false;
  submittingCreate = false;
  submittingJoin = false;
  submittingDefault = '';

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
    this.loadWorkspaces();
    this.loadOrganizations();
    if (!this.createForm.controls.countryId.value) {
      this.createForm.controls.countryId.setValue(this.countryOptions[0]?.value ?? '');
    }
  }

  get activeWorkspaceId(): string | null {
    return this.companyState.getActiveCompanyId();
  }

  get defaultWorkspaceId(): string | null {
    return this.companyState.getDefaultCompanyId();
  }


  loadWorkspaces(): void {
    this.loadingWorkspaces = true;

    this.workspacesApi.listMine().pipe(take(1)).subscribe({
      next: (response) => {
        const payload = response.result;
        this.workspaces = payload?.workspaces ?? [];
        if (payload?.defaultWorkspaceId) {
          this.companyState.setDefaultCompanyId(payload.defaultWorkspaceId);
        }
        this.loadingWorkspaces = false;
      },
      error: () => {
        this.loadingWorkspaces = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar las companias.',
        });
      },
    });
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
          const createdId = this.getWorkspaceId(result);
          this.workspaces = [result, ...this.workspaces.filter((w) => this.getWorkspaceId(w) !== createdId)];
          this.companyState.setActiveCompanyId(createdId);
          if (!this.defaultWorkspaceId && createdId) {
            this.companyState.setDefaultCompanyId(createdId);
          }
          this.createDialogOpen = false;
          this.createForm.reset();
          this.loadWorkspaces();
          if (createdId) {
            this.router.navigateByUrl(`/company/${createdId}/setup`);
          }
        }
        this.submittingCreate = false;
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
          const id = this.getWorkspaceId(result);
          const exists = this.workspaces.some((workspace) => this.getWorkspaceId(workspace) === id);
          this.workspaces = exists ? this.workspaces : [result, ...this.workspaces];
          if (!this.defaultWorkspaceId && id) {
            this.companyState.setDefaultCompanyId(id);
          }
          this.joinDialogOpen = false;
          this.joinForm.reset();
          this.loadWorkspaces();
        }
        this.submittingJoin = false;
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

  setDefault(workspace: Workspace): void {
    const workspaceId = this.getWorkspaceId(workspace);
    if (!workspaceId || this.submittingDefault || this.isDefault(workspace)) {
      return;
    }

    this.submittingDefault = workspaceId;
    this.workspacesApi.setDefault({ workspaceId }).subscribe({
      next: (response) => {
        const user = response.result ?? null;
        if (user) {
          this.tokenStorage.setUser(user);
          this.companyState.syncFromUser(user);
        }
        this.submittingDefault = '';
      },
      error: () => {
        this.submittingDefault = '';
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo actualizar la compania por defecto.',
        });
      },
    });
  }

  enterWorkspace(workspace: Workspace): void {
    const workspaceId = this.getWorkspaceId(workspace);
    if (!workspaceId) {
      return;
    }

    this.companyState.setActiveCompanyId(workspaceId);
    this.router.navigateByUrl(`/company/${workspaceId}/dashboard`);
  }

  isDefault(workspace: Workspace): boolean {
    return this.getWorkspaceId(workspace) === this.defaultWorkspaceId;
  }

  isActive(workspace: Workspace): boolean {
    return this.getWorkspaceId(workspace) === this.activeWorkspaceId;
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
