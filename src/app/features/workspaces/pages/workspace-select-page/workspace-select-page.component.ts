import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';

import { WorkspacesApiService } from '../../../../core/api/workspaces-api.service';
import { WorkspaceSessionService } from '../../../../core/workspace/workspace-session.service';
import { Workspace } from '../../../../shared/models/workspace.model';
import { WorkspaceCreateCardComponent } from '../../components/workspace-create-card/workspace-create-card.component';
import { WorkspaceListComponent } from '../../components/workspace-list/workspace-list.component';

@Component({
  selector: 'app-workspace-select-page',
  standalone: true,
  imports: [CommonModule, WorkspaceCreateCardComponent, WorkspaceListComponent],
  templateUrl: './workspace-select-page.component.html',
  styleUrl: './workspace-select-page.component.scss',
})
export class WorkspaceSelectPageComponent implements OnInit {
  private readonly workspacesApi = inject(WorkspacesApiService);
  private readonly workspaceSession = inject(WorkspaceSessionService);
  private readonly router = inject(Router);

  workspaces: Workspace[] = [];
  loadingWorkspaces = false;
  workspacesUnavailable = false;
  creatingWorkspace = false;

  ngOnInit(): void {
    this.loadWorkspaces();
  }

  loadWorkspaces(): void {
    this.loadingWorkspaces = true;
    this.workspacesUnavailable = false;

    this.workspacesApi.listMyWorkspaces().subscribe({
      next: (response) => {
        this.workspaces = response.result ?? [];
        this.loadingWorkspaces = false;
      },
      error: () => {
        this.loadingWorkspaces = false;
        this.workspacesUnavailable = true;
      },
    });
  }

  createWorkspace(dto: { name: string; description?: string }): void {
    this.creatingWorkspace = true;

    this.workspacesApi.createWorkspace(dto).subscribe({
      next: ({ result }) => {
        if (result) {
          this.workspaces = [result, ...(this.workspaces ?? [])];
          this.workspaceSession.selectWorkspace(result);
          this.navigateToDashboard();
        }
        this.creatingWorkspace = false;
      },
      error: () => {
        this.creatingWorkspace = false;
      },
    });
  }

  selectWorkspace(workspace: Workspace): void {
    this.workspaceSession.selectWorkspace(workspace);
    this.navigateToDashboard();
  }

  private navigateToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }
}
