import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';

import { PrepaidApiService } from '../../../../core/api/prepaid-api.service';
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
  private readonly fb = inject(FormBuilder);
  private readonly messageService = inject(MessageService);

  providers: PrepaidProvider[] = [];
  loading = false;
  dialogVisible = false;
  saving = false;
  editingProvider: PrepaidProvider | null = null;

  readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    isActive: true,
  });

  ngOnInit(): void {
    this.loadProviders();
  }

  openCreate(): void {
    this.editingProvider = null;
    this.form.reset({ name: '', isActive: true });
    this.dialogVisible = true;
  }

  openEdit(provider: PrepaidProvider): void {
    this.editingProvider = provider;
    this.form.reset({
      name: provider.name,
      isActive: provider.isActive,
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
    const payload = {
      name: this.form.controls.name.value.trim(),
      isActive: this.form.controls.isActive.value,
      OrganizationId: context.organizationId,
      companyId: context.companyId,
      enterpriseId: context.enterpriseId,
    };
    this.saving = true;
    const request$ = this.editingProvider
      ? this.prepaidApi.updateProvider(this.editingProvider.id, context.organizationId, {
          name: payload.name,
          isActive: payload.isActive,
        })
      : this.prepaidApi.createProvider(payload);

    request$.subscribe({
      next: () => {
        this.dialogVisible = false;
        this.saving = false;
        this.loadProviders();
        this.showSuccess(this.editingProvider ? 'Proveedor actualizado' : 'Proveedor creado');
      },
      error: () => {
        this.saving = false;
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
