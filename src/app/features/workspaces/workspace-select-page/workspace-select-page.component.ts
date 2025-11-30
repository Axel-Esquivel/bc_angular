import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { TableModule } from 'primeng/table';

import { WorkspacesApiService } from '../../../core/api/workspaces-api.service';

interface Workspace {
  _id?: string;
  id?: string;
  name: string;
  description?: string;
}

@Component({
  selector: 'app-workspace-select-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CardModule,
    InputTextModule,
    InputTextareaModule,
    ButtonModule,
    TableModule,
  ],
  templateUrl: './workspace-select-page.component.html',
  styleUrl: './workspace-select-page.component.scss',
})
export class WorkspaceSelectPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly workspacesApi = inject(WorkspacesApiService);

  workspaces: Workspace[] = [];
  loadingWorkspaces = false;
  workspacesUnavailable = false;
  creating = false;

  readonly createForm = this.fb.nonNullable.group({
    name: ['', Validators.required],
    description: [''],
  });

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

  submitCreate(): void {
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }

    this.creating = true;
    const payload = this.createForm.getRawValue();

    this.workspacesApi.createWorkspace(payload).subscribe({
      next: (response) => {
        const created = response.result as Workspace | undefined;
        if (created) {
          this.workspaces = [created, ...this.workspaces];
        }
        this.createForm.reset();
        this.creating = false;
      },
      error: () => {
        this.creating = false;
      },
    });
  }
}
