import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';

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

  readonly form = this.fb.nonNullable.group({
    providerId: ['', Validators.required],
    variantId: ['', Validators.required],
    denomination: [0, [Validators.required, Validators.min(0)]],
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
    const providerId = this.providers[0]?.id ?? '';
    this.form.reset({
      providerId,
      variantId: '',
      denomination: 0,
      isActive: true,
    });
    this.dialogVisible = true;
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
      variantId: this.form.controls.variantId.value.trim(),
      denomination: this.form.controls.denomination.value,
      isActive: this.form.controls.isActive.value,
      OrganizationId: context.organizationId,
      companyId: context.companyId,
      enterpriseId: context.enterpriseId,
    };
    this.prepaidApi.createVariantConfig(payload).subscribe({
      next: () => {
        this.dialogVisible = false;
        this.saving = false;
        this.loadConfigs();
        this.messageService.add({ severity: 'success', summary: 'Ok', detail: 'Configuración creada' });
      },
      error: () => {
        this.saving = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo crear la configuración' });
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
