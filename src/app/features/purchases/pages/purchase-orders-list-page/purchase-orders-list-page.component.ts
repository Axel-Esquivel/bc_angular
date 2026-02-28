import { Component, OnInit, inject } from '@angular/core';
import { MessageService } from 'primeng/api';
import { Router } from '@angular/router';

import { ActiveContextStateService } from '../../../../core/context/active-context-state.service';
import { ProvidersService } from '../../../providers/services/providers.service';
import { PurchasesService, PurchaseOrder } from '../../services/purchases.service';
import { Provider } from '../../../../shared/models/provider.model';

interface PurchaseOrderRow {
  id: string;
  createdAt?: string | Date;
  expectedDeliveryDate?: string | Date;
  supplierName: string;
  status: string;
}

@Component({
  selector: 'app-purchase-orders-list-page',
  standalone: false,
  templateUrl: './purchase-orders-list-page.component.html',
  styleUrl: './purchase-orders-list-page.component.scss',
  providers: [MessageService],
})
export class PurchaseOrdersListPageComponent implements OnInit {
  private readonly purchasesService = inject(PurchasesService);
  private readonly providersService = inject(ProvidersService);
  private readonly activeContextState = inject(ActiveContextStateService);
  private readonly messageService = inject(MessageService);
  private readonly router = inject(Router);

  rows: PurchaseOrderRow[] = [];
  loading = false;
  contextMissing = false;

  private providerIndex = new Map<string, string>();

  ngOnInit(): void {
    this.loadProviders();
  }

  openNewOrder(): void {
    void this.router.navigateByUrl('/app/purchases/orders/new');
  }

  private loadProviders(): void {
    const context = this.activeContextState.getActiveContext();
    const organizationId = context.organizationId ?? undefined;
    const companyId = context.companyId ?? undefined;
    if (!organizationId || !companyId) {
      this.contextMissing = true;
      this.rows = [];
      return;
    }
    this.contextMissing = false;

    this.providersService.getAll().subscribe({
      next: ({ result }) => {
        const list = Array.isArray(result) ? result : [];
        const filtered = list.filter(
          (item) => item.OrganizationId === organizationId && item.companyId === companyId,
        );
        this.providerIndex = new Map(filtered.map((provider) => [provider.id, provider.name]));
        this.loadOrders(organizationId, companyId);
      },
      error: () => {
        this.providerIndex.clear();
        this.loadOrders(organizationId, companyId);
      },
    });
  }

  private loadOrders(OrganizationId: string, companyId: string): void {
    this.loading = true;
    this.purchasesService.listPurchaseOrders({ OrganizationId, companyId }).subscribe({
      next: ({ result }) => {
        const list = Array.isArray(result) ? result : [];
        this.rows = list
          .filter((order) => order.OrganizationId === OrganizationId && order.companyId === companyId)
          .map((order) => this.mapRow(order));
        this.loading = false;
      },
      error: () => {
        this.rows = [];
        this.loading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Pedidos',
          detail: 'No se pudieron cargar los pedidos.',
        });
      },
    });
  }

  private mapRow(order: PurchaseOrder): PurchaseOrderRow {
    return {
      id: order.id,
      createdAt: order.createdAt,
      expectedDeliveryDate: order.expectedDeliveryDate,
      supplierName: this.providerIndex.get(order.supplierId) ?? order.supplierId,
      status: order.status,
    };
  }
}
