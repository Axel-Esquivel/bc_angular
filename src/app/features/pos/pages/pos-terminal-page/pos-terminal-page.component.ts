import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, map } from 'rxjs';

import { ActiveContextStateService } from '../../../../core/context/active-context-state.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { InventoryApiService } from '../../../../core/api/inventory-api.service';
import { WarehousesApiService, Warehouse } from '../../../../core/api/warehouses-api.service';
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
  private readonly inventoryApi = inject(InventoryApiService);
  private readonly warehousesApi = inject(WarehousesApiService);
  private readonly fb = inject(FormBuilder);

  products: PosProduct[] = [];
  productsLoading = false;
  cartLines: PosCartLine[] = [];
  subtotal = 0;
  discountTotal = 0;
  total = 0;
  sessionId: string | null = null;
  sessionLoading = false;
  warehouseOptions: Warehouse[] = [];
  selectedWarehouseId: string | null = null;
  private context: ActiveContext | null = null;

  readonly openingForm = this.fb.nonNullable.group({
    openingAmount: [0, [Validators.min(0)]],
  });

  ngOnInit(): void {
    const context = this.activeContext.getActiveContext();
    if (!this.activeContext.isComplete(context)) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Contexto incompleto',
        detail: 'Selecciona organizaciÃ³n, empresa y sucursal antes de usar POS.',
      });
      return;
    }

    this.context = context;
    this.loadWarehouses(context.companyId!);
    this.loadActiveSession();
  }

  onSearchProducts(term: string): void {
    if (!this.context?.enterpriseId) {
      return;
    }
    const query = term?.trim() || '';
    if (!query) {
      this.products = [];
      return;
    }
    this.productsLoading = true;
    this.productsService
      .search({
        enterpriseId: this.context.enterpriseId!,
        q: query,
        OrganizationId: this.context.organizationId ?? undefined,
        companyId: this.context.companyId ?? undefined,
      })
      .subscribe({
        next: (response) => {
          this.products = response;
          this.productsLoading = false;
        },
        error: (error: Error | { error?: { message?: string } } | null) => {
          this.products = [];
          this.productsLoading = false;
          this.handleError(error, 'No se pudieron cargar los productos');
        },
      });

    this.productsService
      .findByCode({
        enterpriseId: this.context.enterpriseId!,
        code: query,
        OrganizationId: this.context.organizationId ?? undefined,
        companyId: this.context.companyId ?? undefined,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          if (result) {
            this.onAddProduct(result);
          }
        },
      });
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
    this.addOrUpdateLine(product);
  }

  onQuantityChange(lineId: string, quantity: number): void {
    const safeQuantity = quantity > 0 ? quantity : 1;
    this.cartLines = this.cartLines.map((line) =>
      line.variantId === lineId
        ? {
            ...line,
            quantity: safeQuantity,
            subtotal: safeQuantity * line.unitPrice,
          }
        : line,
    );
    this.recalculateTotals();
  }

  onRemoveLine(lineId: string): void {
    this.cartLines = this.cartLines.filter((line) => line.variantId !== lineId);
    this.recalculateTotals();
  }

  onCheckout(payment: PosPayment): void {
    const context = this.context;
    const sessionId = this.sessionId;
    const warehouseId = this.selectedWarehouseId;
    if (!context?.enterpriseId || !sessionId || !warehouseId) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Falta contexto',
        detail: 'No se puede confirmar la venta sin sesiÃ³n abierta y almacÃ©n.',
      });
      return;
    }
    if (this.cartLines.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Carrito vacÃ­o',
        detail: 'Agrega productos antes de confirmar la venta.',
      });
      return;
    }

    this.validateStockAvailability((stockOk) => {
      if (!stockOk) {
        return;
      }
      const payload = {
        OrganizationId: context.organizationId!,
        companyId: context.companyId!,
        enterpriseId: context.enterpriseId!,
        sessionId,
        warehouseId,
        currency: context.currencyId ?? undefined,
        lines: this.cartLines.map((line) => ({
          variantId: line.variantId,
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
              OrganizationId: context.organizationId!,
              companyId: context.companyId!,
              enterpriseId: context.enterpriseId!,
            })
            .subscribe({
              next: () => {
                this.clearCart();
                this.messageService.add({
                  severity: 'success',
                  summary: 'Venta registrada',
                  detail: 'La venta se confirmÃ³ correctamente.',
                });
              },
              error: (error: Error | { error?: { message?: string } } | null) =>
                this.handleError(error, 'No se pudo confirmar la venta'),
            });
        },
        error: (error: Error | { error?: { message?: string } } | null) =>
          this.handleError(error, 'No se pudo crear la venta'),
      });
    });
  }

  openSession(): void {
    if (!this.context || !this.selectedWarehouseId) {
      return;
    }
    const user = this.authService.getCurrentUser();
    if (!user?.id) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Usuario no disponible',
        detail: 'No se pudo abrir sesiÃ³n sin usuario autenticado.',
      });
      return;
    }
    this.sessionLoading = true;
    this.posService
      .openSession({
        OrganizationId: this.context.organizationId!,
        companyId: this.context.companyId!,
        enterpriseId: this.context.enterpriseId!,
        warehouseId: this.selectedWarehouseId,
        cashierUserId: user.id,
        openingAmount: this.openingForm.controls.openingAmount.value,
      })
      .subscribe({
        next: (session) => {
          this.sessionId = session.id;
          this.sessionLoading = false;
        },
        error: (error: Error | { error?: { message?: string } } | null) => {
          this.sessionLoading = false;
          this.handleError(error, 'No se pudo abrir sesiÃ³n POS');
        },
      });
  }

  closeSession(): void {
    if (!this.context || !this.sessionId) {
      return;
    }
    const user = this.authService.getCurrentUser();
    if (!user?.id) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Usuario no disponible',
        detail: 'No se pudo cerrar sesiÃ³n sin usuario autenticado.',
      });
      return;
    }
    this.sessionLoading = true;
    this.posService
      .closeSession({
        OrganizationId: this.context.organizationId!,
        companyId: this.context.companyId!,
        enterpriseId: this.context.enterpriseId!,
        sessionId: this.sessionId,
        cashierUserId: user.id,
        closingAmount: this.total,
      })
      .subscribe({
        next: () => {
          this.sessionId = null;
          this.sessionLoading = false;
        },
        error: (error: Error | { error?: { message?: string } } | null) => {
          this.sessionLoading = false;
          this.handleError(error, 'No se pudo cerrar sesiÃ³n POS');
        },
      });
  }

  private loadWarehouses(companyId: string): void {
    this.warehousesApi.listByCompany(companyId).subscribe({
      next: (response) => {
        this.warehouseOptions = response.result ?? [];
        this.selectedWarehouseId = this.warehouseOptions[0]?.id ?? null;
      },
      error: (error: Error | { error?: { message?: string } } | null) => {
        this.handleError(error, 'No se pudieron cargar los almacenes');
      },
    });
  }

  private loadActiveSession(): void {
    if (!this.context) {
      return;
    }
    const user = this.authService.getCurrentUser();
    if (!user?.id) {
      return;
    }
    this.posService
      .getActiveSession({
        OrganizationId: this.context.organizationId!,
        companyId: this.context.companyId!,
        enterpriseId: this.context.enterpriseId!,
        cashierUserId: user.id,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (session) => {
          if (session) {
            this.sessionId = session.id;
            this.selectedWarehouseId = session.warehouseId ?? this.selectedWarehouseId;
          }
        },
      });
  }

  private addOrUpdateLine(product: PosProduct): void {
    const existing = this.cartLines.find((line) => line.variantId === product.id);
    if (existing) {
      const nextQuantity = existing.quantity + 1;
      this.cartLines = this.cartLines.map((line) =>
        line.variantId === product.id
          ? {
              ...line,
              quantity: nextQuantity,
              subtotal: nextQuantity * line.unitPrice,
            }
          : line,
      );
    } else {
      this.cartLines = [
        ...this.cartLines,
        {
          variantId: product.id,
          productName: product.name,
          quantity: 1,
          unitPrice: product.price,
          subtotal: product.price,
        },
      ];
    }
    this.recalculateTotals();
  }

  private recalculateTotals(): void {
    this.subtotal = this.cartLines.reduce((acc, line) => acc + line.quantity * line.unitPrice, 0);
    this.discountTotal = 0;
    this.total = this.subtotal - this.discountTotal;
  }

  private clearCart(): void {
    this.cartLines = [];
    this.recalculateTotals();
  }

  private validateStockAvailability(done: (ok: boolean) => void): void {
    if (!this.context?.enterpriseId || !this.selectedWarehouseId) {
      done(false);
      return;
    }
    const requests = this.cartLines.map((line) =>
      this.inventoryApi
        .getVariantStock({
          enterpriseId: this.context!.enterpriseId!,
          variantId: line.variantId,
          warehouseId: this.selectedWarehouseId ?? undefined,
        })
        .pipe(
          map((response) => ({
            line,
            stocks: response.result ?? [],
          })),
        ),
    );

    if (requests.length === 0) {
      done(true);
      return;
    }

    forkJoin(requests)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (results) => {
          const insufficient = results.find((result) => {
            const entry = result.stocks[0];
            const available = entry?.available ?? entry?.onHand ?? entry?.quantity ?? 0;
            return available < result.line.quantity;
          });
          if (insufficient) {
            this.messageService.add({
              severity: 'error',
              summary: 'Stock insuficiente',
              detail: `No hay stock disponible para ${insufficient.line.productName}.`,
            });
            done(false);
            return;
          }
          done(true);
        },
        error: (error: Error | { error?: { message?: string } } | null) => {
          this.handleError(error, 'No se pudo validar stock');
          done(false);
        },
      });
  }

  private handleError(error: Error | { error?: { message?: string } } | null, fallback: string): void {
    const detail = error instanceof Error ? error.message : error?.error?.message ?? fallback;
    this.messageService.add({
      severity: 'error',
      summary: 'Error',
      detail,
    });
  }
}
