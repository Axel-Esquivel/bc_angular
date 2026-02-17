import { Injectable } from '@angular/core';
import { BehaviorSubject, combineLatest, distinctUntilChanged, filter, map, Subject } from 'rxjs';

import { RealtimeSocketService } from '../services/realtime-socket.service';
import { ActiveContextStateService } from '../context/active-context-state.service';

export interface InventoryStockChangedEvent {
  variantId: string;
  warehouseId: string;
  enterpriseId: string;
  onHand: number;
  reserved: number;
  available: number;
  version: number;
  companyId: string;
  changeType: 'movement' | 'reservation' | 'release';
  occurredAt: string;
}

export interface PosSalePostedEvent {
  saleId: string;
  status: string;
  totals: {
    subtotal: number;
    tax: number;
    discount: number;
    grandTotal: number;
  };
  payment: {
    method: string;
    amount: number;
  } | null;
  lines: Array<{
    productId: string;
    qty: number;
    unitPrice: number;
    total: number;
  }>;
  currency: string;
  occurredAt: string;
  companyId: string;
  enterpriseId: string;
  warehouseId: string;
  terminalId?: string;
}

interface ContextRoom {
  organizationId: string;
  enterpriseId: string;
}

@Injectable({ providedIn: 'root' })
export class RealtimeService {
  private readonly inventoryStockChangedSubject = new Subject<InventoryStockChangedEvent>();
  private readonly posSalePostedSubject = new Subject<PosSalePostedEvent>();
  private readonly contextRoomSubject = new BehaviorSubject<ContextRoom | null>(null);

  readonly inventoryStockChanged$ = this.inventoryStockChangedSubject.asObservable();
  readonly posSalePosted$ = this.posSalePostedSubject.asObservable();

  constructor(
    private readonly realtimeSocket: RealtimeSocketService,
    private readonly activeContextState: ActiveContextStateService
  ) {
    this.realtimeSocket.on<InventoryStockChangedEvent>('inventory.stock.changed', (payload) => {
      this.inventoryStockChangedSubject.next(payload);
    });

    this.realtimeSocket.on<PosSalePostedEvent>('pos.sale.posted', (payload) => {
      this.posSalePostedSubject.next(payload);
    });

    combineLatest([this.activeContextState.activeContext$, this.realtimeSocket.isConnected$])
      .pipe(
        map(([context, connected]) => ({
          connected,
          organizationId: context.organizationId ?? undefined,
          enterpriseId: context.enterpriseId ?? undefined,
        })),
        filter((state) => state.connected && !!state.organizationId && !!state.enterpriseId),
        distinctUntilChanged(
          (prev, next) =>
            prev.connected === next.connected &&
            prev.organizationId === next.organizationId &&
            prev.enterpriseId === next.enterpriseId
        )
      )
      .subscribe((state) => {
        this.joinContext(state.organizationId!, state.enterpriseId!);
      });
  }

  joinContext(organizationId: string, enterpriseId: string): void {
    const current = this.contextRoomSubject.value;
    if (current && current.organizationId === organizationId && current.enterpriseId === enterpriseId) {
      return;
    }
    this.contextRoomSubject.next({ organizationId, enterpriseId });
    this.realtimeSocket.emit('context:join', { organizationId, enterpriseId });
  }

  leaveContext(organizationId: string, enterpriseId: string): void {
    this.realtimeSocket.emit('context:leave', { organizationId, enterpriseId });
    const current = this.contextRoomSubject.value;
    if (current?.organizationId === organizationId && current.enterpriseId === enterpriseId) {
      this.contextRoomSubject.next(null);
    }
  }
}
