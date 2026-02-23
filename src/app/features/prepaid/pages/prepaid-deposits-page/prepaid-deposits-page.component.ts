import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ConfirmationService, MessageService } from 'primeng/api';
import { finalize } from 'rxjs/operators';

import { PrepaidApiService } from '../../../../core/api/prepaid-api.service';
import { ActiveContextStateService } from '../../../../core/context/active-context-state.service';
import { PrepaidDeposit, PrepaidProvider } from '../../../../shared/models/prepaid.model';

type ProviderOption = { label: string; value: string };

@Component({
  selector: 'app-prepaid-deposits-page',
  standalone: false,
  templateUrl: './prepaid-deposits-page.component.html',
  styleUrl: './prepaid-deposits-page.component.scss',
  providers: [MessageService],
})
export class PrepaidDepositsPageComponent implements OnInit {
  private readonly prepaidApi = inject(PrepaidApiService);
  private readonly activeContextState = inject(ActiveContextStateService);
  private readonly fb = inject(FormBuilder);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);

  deposits: PrepaidDeposit[] = [];
  providers: PrepaidProvider[] = [];
  loading = false;
  dialogVisible = false;
  saving = false;
  deletingId: string | null = null;

  readonly form = this.fb.nonNullable.group({
    providerId: ['', Validators.required],
    depositAmount: [0, [Validators.required, Validators.min(0)]],
    creditedAmount: [0, [Validators.required, Validators.min(0)]],
    reference: '',
  });

  get providerOptions(): ProviderOption[] {
    return this.providers.map((provider) => ({
      label: provider.name,
      value: provider.id,
    }));
  }

  ngOnInit(): void {
    this.loadProviders();
    this.loadDeposits();
  }

  openCreate(): void {
    const providerId = this.providers[0]?.id ?? '';
    this.form.reset({
      providerId,
      depositAmount: 0,
      creditedAmount: 0,
      reference: '',
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
      depositAmount: this.form.controls.depositAmount.value,
      creditedAmount: this.form.controls.creditedAmount.value,
      reference: this.form.controls.reference.value?.trim() || undefined,
      OrganizationId: context.organizationId,
      companyId: context.companyId,
      enterpriseId: context.enterpriseId,
    };
    this.prepaidApi
      .createDeposit(payload)
      .pipe(
        finalize(() => {
          this.saving = false;
        }),
      )
      .subscribe({
        next: () => {
          this.dialogVisible = false;
          this.loadDeposits();
          this.showSuccess('Depósito registrado');
        },
        error: () => {
          this.showError('No se pudo registrar el depósito');
        },
      });
  }

  confirmDelete(deposit: PrepaidDeposit): void {
    if (this.deletingId) {
      return;
    }
    this.confirmationService.confirm({
      header: 'Eliminar depósito',
      message: '¿Seguro que deseas eliminar este depósito?',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      accept: () => this.deleteDeposit(deposit),
    });
  }

  private deleteDeposit(deposit: PrepaidDeposit): void {
    if (this.deletingId) {
      return;
    }
    const context = this.resolveContext();
    if (!context) {
      return;
    }
    this.deletingId = deposit.id;
    this.prepaidApi
      .deleteDeposit({
        id: deposit.id,
        organizationId: context.organizationId,
        enterpriseId: context.enterpriseId,
      })
      .pipe(
        finalize(() => {
          this.deletingId = null;
        }),
      )
      .subscribe({
        next: () => {
          this.loadDeposits();
          this.showSuccess('Depósito eliminado');
        },
        error: () => {
          this.showError('No se pudo eliminar el depósito');
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

  private loadDeposits(): void {
    const context = this.resolveContext();
    if (!context) {
      return;
    }
    this.loading = true;
    this.prepaidApi
      .listDeposits({ organizationId: context.organizationId, enterpriseId: context.enterpriseId })
      .subscribe({
        next: (response) => {
          this.deposits = response.result ?? [];
          this.loading = false;
        },
        error: () => {
          this.deposits = [];
          this.loading = false;
          this.showError('No se pudieron cargar los depósitos');
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

  private showSuccess(detail: string): void {
    this.messageService.add({ severity: 'success', summary: 'Ok', detail });
  }

  private showError(detail: string): void {
    this.messageService.add({ severity: 'error', summary: 'Error', detail });
  }
}
