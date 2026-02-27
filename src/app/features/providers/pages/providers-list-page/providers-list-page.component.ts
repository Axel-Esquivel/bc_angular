import { Component, OnInit, inject } from '@angular/core';
import { MessageService } from 'primeng/api';

import { ActiveContextStateService } from '../../../../core/context/active-context-state.service';
import { ProvidersService } from '../../services/providers.service';
import { CreateOrUpdateProviderDto, Provider, ProviderStatus } from '../../../../shared/models/provider.model';

@Component({
  selector: 'app-providers-list-page',
  standalone: false,
  templateUrl: './providers-list-page.component.html',
  styleUrl: './providers-list-page.component.scss',
  providers: [MessageService],
})
export class ProvidersListPageComponent implements OnInit {
  private readonly providersService = inject(ProvidersService);
  private readonly activeContextState = inject(ActiveContextStateService);
  private readonly messageService = inject(MessageService);

  providers: Provider[] = [];
  loading = false;
  saving = false;
  dialogVisible = false;
  editingProvider: Provider | null = null;
  contextMissing = false;

  ngOnInit(): void {
    this.loadProviders();
  }

  openCreate(): void {
    this.editingProvider = null;
    this.dialogVisible = true;
  }

  openEdit(provider: Provider): void {
    this.editingProvider = provider;
    this.dialogVisible = true;
  }

  closeDialog(): void {
    this.dialogVisible = false;
  }

  onFormSave(payload: CreateOrUpdateProviderDto): void {
    const context = this.activeContextState.getActiveContext();
    const organizationId = context.organizationId ?? undefined;
    const companyId = context.companyId ?? undefined;
    if (!organizationId || !companyId) {
      this.showError('Selecciona organizacion y empresa antes de continuar.');
      return;
    }

    this.saving = true;

    const request$ = this.editingProvider
      ? this.providersService.update(this.editingProvider.id, {
          ...payload,
          OrganizationId: organizationId,
          companyId,
        })
      : this.providersService.create({
          ...payload,
          OrganizationId: organizationId,
          companyId,
        });

    request$.subscribe({
      next: ({ result }) => {
        if (result) {
          this.upsertProvider(result);
        }
        this.saving = false;
        this.dialogVisible = false;
      },
      error: () => {
        this.saving = false;
        this.showError('No se pudo guardar el proveedor.');
      },
    });
  }

  loadProviders(): void {
    const context = this.activeContextState.getActiveContext();
    const organizationId = context.organizationId ?? undefined;
    const companyId = context.companyId ?? undefined;
    if (!organizationId || !companyId) {
      this.providers = [];
      this.contextMissing = true;
      return;
    }

    this.contextMissing = false;
    this.loading = true;
    this.providersService.getAll().subscribe({
      next: ({ result }) => {
        const list = Array.isArray(result) ? result : [];
        this.providers = list.filter(
          (item) => item.OrganizationId === organizationId && item.companyId === companyId,
        );
        this.loading = false;
      },
      error: () => {
        this.providers = [];
        this.loading = false;
        this.showError('No se pudieron cargar los proveedores.');
      },
    });
  }

  resolveStatusLabel(status?: ProviderStatus): string {
    return status === 'inactive' ? 'Inactivo' : 'Activo';
  }

  private upsertProvider(provider: Provider): void {
    const index = this.providers.findIndex((item) => item.id === provider.id);
    if (index >= 0) {
      this.providers[index] = provider;
      this.providers = [...this.providers];
      return;
    }
    this.providers = [provider, ...this.providers];
  }

  private showError(detail: string): void {
    this.messageService.add({
      severity: 'error',
      summary: 'Proveedores',
      detail,
    });
  }
}
