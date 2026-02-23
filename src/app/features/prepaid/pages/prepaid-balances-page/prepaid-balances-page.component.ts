import { Component, OnInit, inject } from '@angular/core';
import { MessageService } from 'primeng/api';

import { PrepaidApiService } from '../../../../core/api/prepaid-api.service';
import { ActiveContextStateService } from '../../../../core/context/active-context-state.service';
import { PrepaidProvider, PrepaidWallet } from '../../../../shared/models/prepaid.model';

type ProviderOption = { label: string; value: string };

@Component({
  selector: 'app-prepaid-balances-page',
  standalone: false,
  templateUrl: './prepaid-balances-page.component.html',
  styleUrl: './prepaid-balances-page.component.scss',
  providers: [MessageService],
})
export class PrepaidBalancesPageComponent implements OnInit {
  private readonly prepaidApi = inject(PrepaidApiService);
  private readonly activeContextState = inject(ActiveContextStateService);
  private readonly messageService = inject(MessageService);

  balances: PrepaidWallet[] = [];
  providers: PrepaidProvider[] = [];
  loading = false;
  selectedProviderId = '';

  get providerOptions(): ProviderOption[] {
    return [
      { label: 'Todos', value: '' },
      ...this.providers.map((provider) => ({ label: provider.name, value: provider.id })),
    ];
  }

  ngOnInit(): void {
    this.loadProviders();
    this.loadBalances();
  }

  onFilterChange(): void {
    this.loadBalances();
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

  private loadBalances(): void {
    const context = this.resolveContext();
    if (!context) {
      return;
    }
    this.loading = true;
    this.prepaidApi
      .listBalances({
        OrganizationId: context.organizationId,
        enterpriseId: context.enterpriseId,
        providerId: this.selectedProviderId || undefined,
      })
      .subscribe({
        next: (response) => {
          this.balances = response.result ?? [];
          this.loading = false;
        },
        error: () => {
          this.balances = [];
          this.loading = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudieron cargar los saldos',
          });
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
