import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { MessageService } from 'primeng/api';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { ActiveContextStateService } from '../../../../core/context/active-context-state.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { WarehousesApiService, Warehouse } from '../../../../core/api/warehouses-api.service';
import { RealtimeService } from '../../../../core/realtime/realtime.service';
import { PosCartLine, PosPayment } from '../../../../shared/models/pos.model';
import { ActiveContext } from '../../../../shared/models/active-context.model';
import { PosProduct } from '../../models/pos-product.model';
import { PosHttpService } from '../../services/pos.service';
import { PosProductsService } from '../../services/products.service';

@Component({
  standalone: false,
  selector: 'app-pos-terminal-page',
  templateUrl: './pos-terminal-page.component.html',
  styleUrl: './pos-terminal-page.component.scss',
})
export class PosTerminalPageComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly messageService = inject(MessageService);
  private readonly productsService = inject(PosProductsService);
  private readonly posService = inject(PosHttpService);
  private readonly activeContext = inject(ActiveContextStateService);
  private readonly authService = inject(AuthService);
  private readonly realtimeService = inject(RealtimeService);
  private readonly warehousesApi = inject(WarehousesApiService);

  products: PosProduct[] = [];
  productsLoading = false;
  cartLines: PosCartLine[] = [];
  total = 0;
  sessionId: string | null = null;
  warehouseOptions: Warehouse[] = [];
  selectedWarehouseId: string | null = null;
  readonly stockByVariant = new Map<string, number>();
  private context: ActiveContext | null = null;

  ngOnInit(): void {
    const context = this.activeContext.getActiveContext();
    if (!this.activeContext.isComplete(context)) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Contexto incompleto',
        detail: 'Selecciona organizaci\u00f3n, empresa y sucursal antes de usar POS.',
      });
      return;
    }

    this.context = context;
    this.realtimeService.joinContext(context.organizationId!, context.enterpriseId!);
    this.realtimeService.inventoryStockChanged$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((payload) => {
        this.stockByVariant.set(payload.variantId, payload.available);
      });
    this.realtimeService.posSalePosted$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.messageService.add({
          severity: 'success',
          summary: 'Venta registrada',
          detail: 'La venta se confirm\u00f3 correctamente.',
        });
      });

    this.loadWarehouses(context.companyId!);
    this.onSearchProducts('');
  }

  onSearchProducts(term: string): void {
    if (!this.context?.enterpriseId) {
      return;
    }
    this.productsLoading = true;
    const query = term?.trim() || '';
    this.productsService
      .search({
        enterpriseId: this.context.enterpriseId!,
        q: query || '',
        OrganizationId: this.context.organizationId ?? undefined,
        companyId: this.context.companyId ?? undefined,
      })
      .subscribe({
        next: (response) => {
          this.products = response;
          this.productsLoading = false;
        },
        error: (error) => {
          this.products = [];
          this.productsLoading = false;
          this.handleError(error, 'No se pudieron cargar los productos');
        },
      });

    if (query) {
      this.productsService
        .findByCode({
          enterpriseId: this.context.enterpriseId!,
          code: query,
          OrganizationId: this.context.organizationId ?? undefined,
          companyId: this.context.companyId ?? undefined,
        })
        .subscribe({
          next: (result) => {
            if (result) {
              this.onAddProduct(result);
            }
          },
        });
    }
  }

  onAddProduct(product: PosProduct): void {
    if (!product.isActive) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Producto inactivo',
        detail: 'No se puede agregar un producto inactivo.',
      });
      return;
    }
    const existing = this.cartLines.find((line) => line.productId === product.id);
    if (existing) {
      this.cartLines = this.cartLines.map((line) =>
        line.productId === product.id
          ? {
              ...line,
              quantity: line.quantity + 1,
              subtotal: (line.quantity + 1) * (line.unitPrice ?? 0),
            }
          : line
      );
    } else {
      this.cartLines = [
        ...this.cartLines,
        {
          productId: product.id,
          productName: product.name,
          quantity: 1,
          unitPrice: product.price,
          subtotal: product.price,
        },
      ];
    }
    this.recalculateTotals();
  }

  onQuantityChange(lineId: string, quantity: number): void {
    const safeQuantity = quantity > 0 ? quantity : 1;
    this.cartLines = this.cartLines.map((line) =>
      line.productId === lineId
        ? { ...line, quantity: safeQuantity, subtotal: safeQuantity * (line.unitPrice ?? 0) }
        : line
    );
    this.recalculateTotals();
  }

  onRemoveLine(lineId: string): void {
    this.cartLines = this.cartLines.filter((line) => line.productId !== lineId);
    this.recalculateTotals();
  }

  onCheckout(payment: PosPayment): void {
    if (!this.context?.enterpriseId || !this.sessionId || !this.selectedWarehouseId) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Falta contexto',
        detail: 'No se puede confirmar la venta sin sesi\u00f3n abierta y almac\u00e9n.',
      });
      return;
    }

    const payload = {
      OrganizationId: this.context.organizationId!,
      companyId: this.context.companyId!,
      enterpriseId: this.context.enterpriseId!,
      sessionId: this.sessionId,
      warehouseId: this.selectedWarehouseId,
      currency: this.context.currencyId ?? undefined,
      lines: this.cartLines.map((line) => ({
        productId: line.productId,
        qty: line.quantity,
        unitPrice: line.unitPrice,
      })),
      payments: [
        {
          method: payment.method,
          amount: payment.amount,
          received: payment.received,
          change: payment.change,
        },
      ],
    };

    this.posService.createSale(payload).subscribe({
      next: (sale) => {
        this.posService
          .postSale(sale.id, {
            OrganizationId: this.context!.organizationId!,
            companyId: this.context!.companyId!,
            enterpriseId: this.context!.enterpriseId!,
          })
          .subscribe({
            next: () => {
              this.cartLines = [];
              this.recalculateTotals();
            },
            error: (error) => this.handleError(error, 'No se pudo confirmar la venta'),
          });
      },
      error: (error) => this.handleError(error, 'No se pudo crear la venta'),
    });
  }

  private recalculateTotals(): void {
    this.total = this.cartLines.reduce((acc, line) => acc + line.subtotal, 0);
  }

  private loadWarehouses(companyId: string) {
    this.warehousesApi.listByCompany(companyId).subscribe({
      next: (response) => {
        this.warehouseOptions = response.result ?? [];
        this.selectedWarehouseId = this.warehouseOptions[0]?.id ?? null;
        this.openSession();
      },
      error: (error) => {
        this.handleError(error, 'No se pudieron cargar los almacenes');
      },
    });
  }

  openSession(): void {
    if (!this.context || !this.selectedWarehouseId) {
      return;
    }
    const user = this.authService.getCurrentUser();
    this.posService
      .openSession({
        OrganizationId: this.context.organizationId!,
        companyId: this.context.companyId!,
        enterpriseId: this.context.enterpriseId!,
        warehouseId: this.selectedWarehouseId,
        cashierUserId: user?.id,
        openingAmount: 0,
      })
      .subscribe({
        next: (session) => {
          this.sessionId = session.id;
        },
        error: (error) => {
          this.handleError(error, 'No se pudo abrir sesi\u00f3n POS');
        },
      });
  }

  private handleError(error: unknown, fallback: string): void {
    const detail =
      typeof error === 'object' && error !== null && 'error' in error
        ? (error as { error?: { message?: string } }).error?.message ?? fallback
        : fallback;
    this.messageService.add({
      severity: 'error',
      summary: 'Error',
      detail,
    });
  }
}
