import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { finalize } from 'rxjs/operators';

import { PrepaidApiService } from '../../../../core/api/prepaid-api.service';
import { DashboardApiService } from '../../../../core/api/dashboard-api.service';
import { ActiveContextStateService } from '../../../../core/context/active-context-state.service';
import { PrepaidProvider } from '../../../../shared/models/prepaid.model';

@Component({
  selector: 'app-prepaid-providers-page',
  standalone: false,
  templateUrl: './prepaid-providers-page.component.html',
  styleUrl: './prepaid-providers-page.component.scss',
  providers: [MessageService],
})
export class PrepaidProvidersPageComponent implements OnInit {
  private readonly prepaidApi = inject(PrepaidApiService);
  private readonly activeContextState = inject(ActiveContextStateService);
  private readonly dashboardApi = inject(DashboardApiService);
  private readonly fb = inject(FormBuilder);
  private readonly messageService = inject(MessageService);

  providers: PrepaidProvider[] = [];
  loading = false;
  dialogVisible = false;
  saving = false;
  pinLoading = false;
  isOwner = false;
  editingProvider: PrepaidProvider | null = null;

  readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    pin: '',
    isActive: true,
    minimumBalance: this.fb.nonNullable.control(0, { validators: [Validators.min(0)] }),
  });

  ngOnInit(): void {
    this.loadProviders();
    this.loadOwnerStatus();
  }

  openCreate(): void {
    this.editingProvider = null;
    this.form.reset({ name: '', isActive: true, minimumBalance: 0 });
    this.dialogVisible = true;
  }

  openEdit(provider: PrepaidProvider): void {
    this.editingProvider = provider;
    this.form.reset({
      name: provider.name,
      pin: '',
      isActive: provider.isActive,
      minimumBalance: provider.minimumBalance ?? 0,
    });
    this.dialogVisible = true;
  }

  showPin(): void {
    if (this.pinLoading || !this.editingProvider) {
      return;
    }
    const context = this.resolveContext();
    if (!context) {
      return;
    }
    this.pinLoading = true;
    this.prepaidApi
      .getProviderSecret({
        id: this.editingProvider.id,
        organizationId: context.organizationId,
        enterpriseId: context.enterpriseId,
      })
      .pipe(
        finalize(() => {
          this.pinLoading = false;
        }),
      )
      .subscribe({
        next: (response) => {
          const pin = response.result?.pin ?? '';
          this.form.controls.pin.setValue(pin);
        },
        error: () => {
          this.showError('No se pudo obtener el PIN');
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
    const payload = {
      name: this.form.controls.name.value.trim(),
      pin: this.form.controls.pin.value?.trim() || undefined,
      isActive: this.form.controls.isActive.value,
      minimumBalance: this.form.controls.minimumBalance.value,
      OrganizationId: context.organizationId,
      companyId: context.companyId,
      enterpriseId: context.enterpriseId,
    };
    this.saving = true;
    const request$ = this.editingProvider
      ? this.prepaidApi.updateProvider(this.editingProvider.id, context.organizationId, {
          name: payload.name,
          pin: payload.pin,
          isActive: payload.isActive,
          minimumBalance: payload.minimumBalance,
        })
      : this.prepaidApi.createProvider(payload);

    request$
      .pipe(
        finalize(() => {
          this.saving = false;
        }),
      )
      .subscribe({
        next: () => {
          this.dialogVisible = false;
          this.loadProviders();
          this.showSuccess(this.editingProvider ? 'Proveedor actualizado' : 'Proveedor creado');
        },
        error: () => {
          this.showError('No se pudo guardar el proveedor');
        },
      });
  }

  private loadProviders(): void {
    const context = this.resolveContext();
    if (!context) {
      return;
    }
    this.loading = true;
    this.prepaidApi
      .listProviders({ organizationId: context.organizationId, enterpriseId: context.enterpriseId })
      .subscribe({
        next: (response) => {
          this.providers = response.result ?? [];
          this.loading = false;
        },
        error: () => {
          this.providers = [];
          this.loading = false;
          this.showError('No se pudieron cargar los proveedores');
        },
      });
  }

  private loadOwnerStatus(): void {
    const context = this.activeContextState.getActiveContext();
    if (!context.organizationId || !context.companyId) {
      this.isOwner = false;
      return;
    }
    this.dashboardApi
      .getOverview({ orgId: context.organizationId, companyId: context.companyId })
      .subscribe({
        next: (response) => {
          this.isOwner = response.result?.currentOrgRoleKey === 'owner';
        },
        error: () => {
          this.isOwner = false;
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
    this.showError('Selecciona un contexto válido');
    return null;
  }

  private showSuccess(detail: string): void {
    this.messageService.add({ severity: 'success', summary: 'Ok', detail });
  }

  private showError(detail: string): void {
    this.messageService.add({ severity: 'error', summary: 'Error', detail });
  }
}
