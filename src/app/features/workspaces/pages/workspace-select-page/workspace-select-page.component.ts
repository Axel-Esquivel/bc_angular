import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { Toast } from 'primeng/toast';

import { WorkspacesApiService } from '../../../../core/api/workspaces-api.service';
import { TokenStorageService } from '../../../../core/auth/token-storage.service';
import { WorkspaceStateService } from '../../../../core/workspace/workspace-state.service';
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
    Toast,
  ],
  templateUrl: './workspace-select-page.component.html',
  styleUrl: './workspace-select-page.component.scss',
  providers: [MessageService],
})
export class WorkspaceSelectPageComponent implements OnInit {
  private readonly workspacesApi = inject(WorkspacesApiService);
  private readonly workspaceState = inject(WorkspaceStateService);
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
  });

  readonly joinForm = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.minLength(4)]],
  });

  ngOnInit(): void {
    this.loadWorkspaces();
  }

  get activeWorkspaceId(): string | null {
    return this.workspaceState.getActiveWorkspaceId();
  }

  get defaultWorkspaceId(): string | null {
    return this.workspaceState.getDefaultWorkspaceId();
  }


  loadWorkspaces(): void {
    this.loadingWorkspaces = true;

    this.workspacesApi.listMine().subscribe({
      next: (response) => {
        const payload = response.result;
        this.workspaces = payload?.workspaces ?? [];
        if (payload?.defaultWorkspaceId) {
          this.workspaceState.setDefaultWorkspaceId(payload.defaultWorkspaceId);
        }
        this.loadingWorkspaces = false;
      },
      error: () => {
        this.loadingWorkspaces = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar los workspaces.',
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

    this.workspacesApi.create({ name: payload.name }).subscribe({
      next: ({ result }) => {
        if (result) {
          const createdId = this.getWorkspaceId(result);
          this.workspaces = [result, ...this.workspaces.filter((w) => this.getWorkspaceId(w) !== createdId)];
          this.workspaceState.setActiveWorkspaceId(createdId);
          if (!this.defaultWorkspaceId && createdId) {
            this.workspaceState.setDefaultWorkspaceId(createdId);
          }
          this.createDialogOpen = false;
          this.createForm.reset();
          if (createdId) {
            this.router.navigateByUrl(`/workspace/${createdId}/setup`);
          }
        }
        this.submittingCreate = false;
      },
      error: () => {
        this.submittingCreate = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo crear el workspace.',
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
            this.workspaceState.setDefaultWorkspaceId(id);
          }
          this.joinDialogOpen = false;
          this.joinForm.reset();
        }
        this.submittingJoin = false;
      },
      error: () => {
        this.submittingJoin = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo unir al workspace con ese codigo.',
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
          this.workspaceState.syncFromUser(user);
        }
        this.submittingDefault = '';
      },
      error: () => {
        this.submittingDefault = '';
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo actualizar el workspace por defecto.',
        });
      },
    });
  }

  enterWorkspace(workspace: Workspace): void {
    const workspaceId = this.getWorkspaceId(workspace);
    if (!workspaceId) {
      return;
    }

    this.workspaceState.setActiveWorkspaceId(workspaceId);
    this.router.navigateByUrl(`/workspace/${workspaceId}/dashboard`);
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
}
