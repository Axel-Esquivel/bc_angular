import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Card } from 'primeng/card';
import { Button } from 'primeng/button';
import { Toast } from 'primeng/toast';
import { forkJoin, take } from 'rxjs';

import { WorkspacesApiService } from '../../../../core/api/workspaces-api.service';
import { ModuleDefinition, ModulesApiService } from '../../../../core/api/modules-api.service';

@Component({
  selector: 'app-workspace-setup',
  standalone: true,
  imports: [
    CommonModule,
    Card,
    Button,
    Toast,
  ],
  templateUrl: './workspace-setup.component.html',
  styleUrl: './workspace-setup.component.scss',
  providers: [MessageService],
})
export class WorkspaceSetupComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly workspacesApi = inject(WorkspacesApiService);
  private readonly modulesApi = inject(ModulesApiService);
  private readonly messageService = inject(MessageService);

  workspaceId = this.route.snapshot.paramMap.get('id') ?? '';
  modules: ModuleDefinition[] = [];

  enabledModules: string[] = [];
  submitting = false;

  toggleModule(module: ModuleDefinition): void {
    if (!this.workspaceId) {
      return;
    }

    const previous = [...this.enabledModules];
    const isEnabled = this.enabledModules.includes(module.id);
    this.enabledModules = isEnabled
      ? this.enabledModules.filter((id) => id !== module.id)
      : [...this.enabledModules, module.id];

    const modules = this.modules.map((entry) => ({
      key: entry.id,
      enabled: this.enabledModules.includes(entry.id),
    }));

    this.workspacesApi
      .updateWorkspaceModules(this.workspaceId, modules)
      .pipe(take(1))
      .subscribe({
        error: () => {
          this.enabledModules = previous;
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo actualizar el modulo.',
          });
        },
      });
  }

  isEnabled(moduleId: string): boolean {
    return this.enabledModules.includes(moduleId);
  }

  continue(): void {
    if (!this.workspaceId || this.submitting) {
      return;
    }

    this.submitting = true;
    const modules = this.modules.map((module) => ({
      key: module.id,
      enabled: this.enabledModules.includes(module.id),
    }));

    this.workspacesApi
      .updateWorkspaceModules(this.workspaceId, modules)
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.submitting = false;
          this.router.navigateByUrl(`/workspace/${this.workspaceId}/dashboard`);
        },
        error: () => {
          this.submitting = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo completar el setup.',
          });
        },
      });
  }

  ngOnInit(): void {
    if (!this.workspaceId) {
      this.workspaceId = this.route.parent?.snapshot.paramMap.get('id') ?? '';
    }

    if (!this.workspaceId) {
      return;
    }

    forkJoin({
      definitions: this.modulesApi.getDefinitions(this.workspaceId),
      overview: this.workspacesApi.getWorkspaceModules(this.workspaceId),
    })
      .pipe(take(1))
      .subscribe({
        next: ({ definitions, overview }) => {
          const list = definitions.result ?? [];
          this.modules = list.filter(
            (module) => module.isSystem !== true && module.isInstallable !== false
          );
          const enabled = overview.result?.enabledModules ?? [];
          this.enabledModules = enabled.filter((module) => module.enabled).map((module) => module.key);
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudieron cargar los modulos.',
          });
        },
      });
  }

}
