import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';
import { Toast } from 'primeng/toast';

import { WorkspacesApiService } from '../../../../core/api/workspaces-api.service';
import { WorkspaceStateService } from '../../../../core/workspace/workspace-state.service';
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
    Toast,
  ],
  templateUrl: './workspace-onboarding.component.html',
  styleUrl: './workspace-onboarding.component.scss',
  providers: [MessageService],
})
export class WorkspaceOnboardingComponent {
  private readonly workspacesApi = inject(WorkspacesApiService);
  private readonly workspaceState = inject(WorkspaceStateService);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);
  private readonly fb = inject(FormBuilder);

  createDialogOpen = false;
  joinDialogOpen = false;
  submittingCreate = false;
  submittingJoin = false;

  readonly createForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
  });

  readonly joinForm = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.minLength(4)]],
  });

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
          detail: 'No se pudo unir al workspace con ese codigo.',
        });
      },
    });
  }

  private finishOnboarding(workspace: Workspace): void {
    const workspaceId = this.getWorkspaceId(workspace);
    if (!workspaceId) {
      return;
    }

    this.workspaceState.setActiveWorkspaceId(workspaceId);
    if (!this.workspaceState.getDefaultWorkspaceId()) {
      this.workspaceState.setDefaultWorkspaceId(workspaceId);
    }
    this.router.navigateByUrl(`/workspace/${workspaceId}/dashboard`);
  }

  private finishOnboardingSetup(workspace: Workspace): void {
    const workspaceId = this.getWorkspaceId(workspace);
    if (!workspaceId) {
      return;
    }

    this.workspaceState.setActiveWorkspaceId(workspaceId);
    if (!this.workspaceState.getDefaultWorkspaceId()) {
      this.workspaceState.setDefaultWorkspaceId(workspaceId);
    }
    this.router.navigateByUrl(`/workspace/${workspaceId}/setup`);
  }

  private getWorkspaceId(workspace: Workspace | null | undefined): string | null {
    return workspace?.id ?? workspace?._id ?? null;
  }
}
