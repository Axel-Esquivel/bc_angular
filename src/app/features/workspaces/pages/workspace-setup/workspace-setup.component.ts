import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Card } from 'primeng/card';
import { Button } from 'primeng/button';
import { Badge } from 'primeng/badge';
import { DialogModule } from 'primeng/dialog';
import { InputNumber } from 'primeng/inputnumber';
import { Select } from 'primeng/select';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { MultiSelect } from 'primeng/multiselect';
import { Toast } from 'primeng/toast';
import { switchMap, take } from 'rxjs';

import { WorkspacesApiService } from '../../../../core/api/workspaces-api.service';
import { ModuleDefinition, ModulesApiService } from '../../../../core/api/modules-api.service';
import { WorkspaceModulesService } from '../../../../core/workspace/workspace-modules.service';
import { WorkspaceStateService } from '../../../../core/workspace/workspace-state.service';

type FieldType =
  | 'text'
  | 'number'
  | 'boolean'
  | 'select'
  | 'multiselect'
  | 'textarea'
  | 'divider'
  | 'note';

interface SetupFieldOption {
  label: string;
  value: string | number | boolean;
}

interface SetupField {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  default?: string | number | boolean | string[] | number[];
  options?: SetupFieldOption[];
  dataSource?: string;
  validators?: string[];
}

interface SetupStep {
  id: string;
  title: string;
  description?: string;
  fields: SetupField[];
}

interface SetupWizardConfig {
  steps: SetupStep[];
}

interface ModuleConfig {
  enabled: boolean;
  allowImport: boolean;
  allowExport: boolean;
  allowEdit: boolean;
}

@Component({
  selector: 'app-workspace-setup',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    Card,
    Button,
    DialogModule,
    ToggleSwitchModule,
    Badge,
    InputNumber,
    Select,
    MultiSelect,
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
  private readonly workspaceModules = inject(WorkspaceModulesService);
  private readonly workspaceState = inject(WorkspaceStateService);

  workspaceId = this.route.snapshot.paramMap.get('id') ?? '';
  modules: ModuleDefinition[] = [];

  enabledModules: string[] = [];
  moduleConfigs: Record<string, ModuleConfig> = {};
  moduleInitialized = new Set<string>();
  dialogOpen = false;
  activeModule: ModuleDefinition | null = null;
  activeWizard: SetupWizardConfig | null = null;
  wizardStepIndex = 0;
  wizardData: Record<string, any> = {};
  wizardFromActivation = false;
  submitting = false;

  toggleModule(module: ModuleDefinition): void {
    const isEnabled = this.enabledModules.includes(module.id);
    if (isEnabled) {
      this.enabledModules = this.enabledModules.filter((id) => id !== module.id);
      return;
    }

    this.enabledModules = [...this.enabledModules, module.id];
    if (module.setupWizard && !this.moduleInitialized.has(module.id)) {
      this.openWizard(module, true);
    }
  }

  openWizard(module: ModuleDefinition, fromActivation = false): void {
    this.activeModule = module;
    this.activeWizard = this.isSetupWizardConfig(module.setupWizard) ? module.setupWizard : null;
    this.wizardStepIndex = 0;
    this.wizardData = this.buildDefaultWizardData(this.activeWizard);
    this.wizardFromActivation = fromActivation;
    this.dialogOpen = true;
  }

  cancelWizard(): void {
    if (this.activeModule && this.wizardFromActivation) {
      this.enabledModules = this.enabledModules.filter((id) => id !== this.activeModule!.id);
    }
    this.dialogOpen = false;
    this.activeModule = null;
    this.activeWizard = null;
    this.wizardFromActivation = false;
  }

  isEnabled(moduleId: string): boolean {
    return this.enabledModules.includes(moduleId);
  }

  isInitialized(moduleId: string): boolean {
    return this.moduleInitialized.has(moduleId);
  }

  get activeStep(): SetupStep | null {
    return this.activeWizard?.steps?.[this.wizardStepIndex] ?? null;
  }

  canGoBack(): boolean {
    return this.wizardStepIndex > 0;
  }

  canGoNext(): boolean {
    return !!this.activeWizard && this.wizardStepIndex < (this.activeWizard.steps.length - 1);
  }

  nextStep(): void {
    if (this.canGoNext()) {
      this.wizardStepIndex += 1;
    }
  }

  prevStep(): void {
    if (this.canGoBack()) {
      this.wizardStepIndex -= 1;
    }
  }

  finishWizard(): void {
    if (!this.activeModule || !this.workspaceId) {
      return;
    }

    this.workspacesApi
      .updateModuleSettings(this.workspaceId, this.activeModule.id, {
        stepId: this.activeStep?.id ?? 'complete',
        data: this.wizardData,
      })
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.moduleInitialized.add(this.activeModule!.id);
          this.dialogOpen = false;
          this.activeModule = null;
          this.activeWizard = null;
          this.wizardFromActivation = false;
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo guardar la configuracion del modulo.',
          });
        },
      });
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
      .pipe(
        take(1),
        switchMap(() => this.workspacesApi.completeSetup(this.workspaceId).pipe(take(1)))
      )
      .subscribe({
        next: () => {
          this.submitting = false;
          this.workspaceState.setActiveWorkspaceSetupCompleted(true);
          this.workspaceModules.load(this.workspaceId).pipe(take(1)).subscribe();
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

    this.modulesApi
      .getDefinitions(this.workspaceId)
      .pipe(take(1))
      .subscribe({
        next: (response) => {
          const list = response.result ?? [];
          this.modules = list.filter(
            (module) => module.isSystem !== true && module.isInstallable !== false
          );
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

  private buildDefaultWizardData(config: SetupWizardConfig | null): Record<string, any> {
    const values: Record<string, any> = {};
    if (!config?.steps) {
      return values;
    }

    config.steps.forEach((step) => {
      step.fields?.forEach((field) => {
        if (field.default !== undefined) {
          values[field.key] = field.default;
          return;
        }

        switch (field.type) {
          case 'boolean':
            values[field.key] = false;
            break;
          case 'multiselect':
            values[field.key] = [];
            break;
          case 'number':
            values[field.key] = null;
            break;
          default:
            values[field.key] = '';
        }
      });
    });

    return values;
  }

  private isSetupWizardConfig(value: unknown): value is SetupWizardConfig {
    return !!value && Array.isArray((value as SetupWizardConfig).steps);
  }
}
