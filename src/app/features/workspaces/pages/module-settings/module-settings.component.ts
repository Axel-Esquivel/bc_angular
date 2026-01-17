import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { InputNumber } from 'primeng/inputnumber';
import { MultiSelect } from 'primeng/multiselect';
import { Select } from 'primeng/select';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { Toast } from 'primeng/toast';
import { forkJoin, of } from 'rxjs';

import { ModuleDefinition, ModulesApiService } from '../../../../core/api/modules-api.service';
import { WorkspacesApiService } from '../../../../core/api/workspaces-api.service';

type FieldType =
  | 'text'
  | 'number'
  | 'boolean'
  | 'select'
  | 'multiselect'
  | 'textarea'
  | 'divider'
  | 'note';

interface FieldOption {
  label: string;
  value: string | number | boolean;
}

interface SettingsField {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  default?: string | number | boolean | string[] | number[];
  options?: FieldOption[];
  dataSource?: string;
  validators?: string[];
}

interface SettingsGroup {
  id: string;
  title: string;
  fields: SettingsField[];
}

interface SettingsSection {
  id: string;
  title: string;
  description?: string;
  groups?: SettingsGroup[];
  fields?: SettingsField[];
}

interface SettingsSchema {
  sections: SettingsSection[];
}

@Component({
  selector: 'app-module-settings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    Card,
    Button,
    InputNumber,
    MultiSelect,
    Select,
    ToggleSwitchModule,
    Toast,
  ],
  templateUrl: './module-settings.component.html',
  styleUrl: './module-settings.component.scss',
  providers: [MessageService],
})
export class ModuleSettingsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly modulesApi = inject(ModulesApiService);
  private readonly workspacesApi = inject(WorkspacesApiService);
  private readonly messageService = inject(MessageService);

  readonly workspaceId = this.route.parent?.snapshot.paramMap.get('id') ?? '';
  readonly moduleId = this.route.snapshot.paramMap.get('moduleId') ?? '';

  moduleDefinition: ModuleDefinition | null = null;
  settingsSchema: SettingsSchema | null = null;
  settingsData: Record<string, any> = {};
  loading = false;
  saving = false;

  ngOnInit(): void {
    if (!this.workspaceId || !this.moduleId) {
      return;
    }

    this.loading = true;
    forkJoin({
      definitions: this.modulesApi.getDefinitions(this.workspaceId),
      settings: this.workspacesApi.getModuleSettings(this.workspaceId, this.moduleId),
    }).subscribe({
      next: ({ definitions, settings }) => {
        const modules = definitions.result ?? [];
        this.moduleDefinition = modules.find((module) => module.id === this.moduleId) ?? null;
        this.settingsSchema = (this.moduleDefinition?.settingsSchema as SettingsSchema) ?? null;
        this.settingsData = this.mergeDefaults(settings.result ?? {});
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo cargar la configuracion del modulo.',
        });
      },
    });
  }

  get sections(): SettingsSection[] {
    return this.settingsSchema?.sections ?? [];
  }

  save(): void {
    if (!this.workspaceId || !this.moduleId || this.saving) {
      return;
    }

    this.saving = true;
    this.workspacesApi
      .updateModuleSettings(this.workspaceId, this.moduleId, this.settingsData)
      .subscribe({
        next: () => {
          this.saving = false;
          this.messageService.add({
            severity: 'success',
            summary: 'Guardado',
            detail: 'Configuracion actualizada.',
          });
        },
        error: () => {
          this.saving = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo guardar la configuracion.',
          });
        },
      });
  }

  back(): void {
    if (this.workspaceId) {
      this.router.navigateByUrl(`/workspace/${this.workspaceId}/dashboard`);
    }
  }

  private mergeDefaults(payload: Record<string, any>): Record<string, any> {
    const defaults: Record<string, any> = {};
    (this.settingsSchema?.sections ?? []).forEach((section) => {
      section.fields?.forEach((field) => {
        this.assignDefault(defaults, field);
      });
      section.groups?.forEach((group) => {
        group.fields.forEach((field) => {
          this.assignDefault(defaults, field);
        });
      });
    });

    return { ...defaults, ...payload };
  }

  private assignDefault(target: Record<string, any>, field: SettingsField): void {
    if (field.default !== undefined) {
      target[field.key] = field.default;
      return;
    }

    switch (field.type) {
      case 'boolean':
        target[field.key] = false;
        break;
      case 'multiselect':
        target[field.key] = [];
        break;
      case 'number':
        target[field.key] = null;
        break;
      default:
        target[field.key] = '';
    }
  }
}
