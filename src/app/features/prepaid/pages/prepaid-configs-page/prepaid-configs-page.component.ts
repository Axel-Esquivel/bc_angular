import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { finalize } from 'rxjs/operators';

import { PrepaidApiService } from '../../../../core/api/prepaid-api.service';
import { ActiveContextStateService } from '../../../../core/context/active-context-state.service';
import { PrepaidProvider, PrepaidVariantConfig } from '../../../../shared/models/prepaid.model';

type ProviderOption = { label: string; value: string };

@Component({
  selector: 'app-prepaid-configs-page',
  standalone: false,
  templateUrl: './prepaid-configs-page.component.html',
  styleUrl: './prepaid-configs-page.component.scss',
  providers: [MessageService],
})
export class PrepaidConfigsPageComponent implements OnInit {
  private readonly prepaidApi = inject(PrepaidApiService);
  private readonly activeContextState = inject(ActiveContextStateService);
  private readonly fb = inject(FormBuilder);
  private readonly messageService = inject(MessageService);

  configs: PrepaidVariantConfig[] = [];
  providers: PrepaidProvider[] = [];
  loading = false;
  dialogVisible = false;
  saving = false;
  updatingIds = new Set<string>();
  editingConfig: PrepaidVariantConfig | null = null;

  readonly form = this.fb.nonNullable.group({
    providerId: ['', Validators.required],
    name: ['', Validators.required],
    requestCodeTemplate: ['', Validators.required],
    denomination: [0, [Validators.required, Validators.min(0)]],
    durationDays: [null as number | null],
    isActive: true,
  });

  get providerOptions(): ProviderOption[] {
    return this.providers.map((provider) => ({
      label: provider.name,
      value: provider.id,
    }));
  }

  ngOnInit(): void {
    this.loadProviders();
    this.loadConfigs();
  }

  openCreate(): void {
    this.editingConfig = null;
    const providerId = this.providers[0]?.id ?? '';
    this.form.reset({
      providerId,
      name: '',
      requestCodeTemplate: '',
      denomination: 0,
      durationDays: null,
      isActive: true,
    });
    this.dialogVisible = true;
  }

  openEdit(config: PrepaidVariantConfig): void {
    this.editingConfig = config;
    this.form.reset({
      providerId: config.providerId,
      name: config.name,
      requestCodeTemplate: config.requestCodeTemplate,
      denomination: config.denomination,
      durationDays: config.durationDays ?? null,
      isActive: config.isActive,
    });
    this.dialogVisible = true;
  }

  isUpdating(configId: string): boolean {
    return this.updatingIds.has(configId);
  }

  toggleActive(config: PrepaidVariantConfig, nextValue: boolean): void {
    if (this.updatingIds.has(config.id)) {
      return;
    }
    const context = this.resolveContext();
    if (!context) {
      return;
    }
    const previous = config.isActive;
    config.isActive = nextValue;
    this.updatingIds.add(config.id);
    this.prepaidApi
      .updateVariantConfig(config.id, context.organizationId, { isActive: nextValue })
      .pipe(
        finalize(() => {
          this.updatingIds.delete(config.id);
        }),
      )
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Ok',
            detail: nextValue ? 'Denominación activada' : 'Denominación desactivada',
          });
        },
        error: () => {
          config.isActive = previous;
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo actualizar el estado',
          });
        },
      });
  }

  save(): void {
    if (this.saving || this.form.invalid) {
      return;
    }
    const context = this.resolveContext();
    if (!context) {
      return;
    }
    this.saving = true;
    const payload = {
      providerId: this.form.controls.providerId.value,
      name: this.form.controls.name.value.trim(),
      requestCodeTemplate: this.form.controls.requestCodeTemplate.value.trim(),
      denomination: this.form.controls.denomination.value,
      durationDays: this.form.controls.durationDays.value ?? undefined,
      isActive: this.form.controls.isActive.value,
      OrganizationId: context.organizationId,
      companyId: context.companyId,
      enterpriseId: context.enterpriseId,
    };
    const request$ = this.editingConfig
      ? this.prepaidApi.updateVariantConfig(this.editingConfig.id, context.organizationId, {
          providerId: payload.providerId,
          name: payload.name,
          requestCodeTemplate: payload.requestCodeTemplate,
          denomination: payload.denomination,
          durationDays: payload.durationDays,
          isActive: payload.isActive,
        })
      : this.prepaidApi.createVariantConfig(payload);

    request$
      .pipe(
        finalize(() => {
          this.saving = false;
        }),
      )
      .subscribe({
        next: () => {
          const wasEditing = Boolean(this.editingConfig);
          this.dialogVisible = false;
          this.editingConfig = null;
          this.loadConfigs();
          this.messageService.add({
            severity: 'success',
            summary: 'Ok',
            detail: wasEditing ? 'Configuración actualizada' : 'Configuración creada',
          });
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: this.editingConfig
              ? 'No se pudo actualizar la configuración'
              : 'No se pudo crear la configuración',
          });
        },
      });
  }

  getProviderName(providerId: string): string {
    return this.providers.find((provider) => provider.id === providerId)?.name ?? providerId;
  }

  private loadProviders(): void {
    const context = this.resolveContext();
    if (!context) {
      return;
    }
    this.prepaidApi
      .listProviders({ organizationId: context.organizationId, enterpriseId: context.enterpriseId })
      .subscribe({
        next: (response) => {
          this.providers = response.result ?? [];
        },
        error: () => {
          this.providers = [];
        },
      });
  }

  private loadConfigs(): void {
    const context = this.resolveContext();
    if (!context) {
      return;
    }
    this.loading = true;
    this.prepaidApi
      .listVariantConfigs({ organizationId: context.organizationId, enterpriseId: context.enterpriseId })
      .subscribe({
        next: (response) => {
          this.configs = response.result ?? [];
          this.loading = false;
        },
        error: () => {
          this.configs = [];
          this.loading = false;
        },
      });
  }

  private resolveContext(): { organizationId: string; companyId: string; enterpriseId: string } | null {
    const context = this.activeContextState.getActiveContext();
    if (context.organizationId && context.companyId && context.enterpriseId) {
      return {
        organizationId: context.organizationId,
        companyId: context.companyId,
        enterpriseId: context.enterpriseId,
      };
    }
    return null;
  }
}
