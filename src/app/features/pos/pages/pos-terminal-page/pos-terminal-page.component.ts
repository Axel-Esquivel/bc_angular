import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { MessageService } from 'primeng/api';
import { catchError, forkJoin, map, of } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { ActiveContextStateService } from '../../../../core/context/active-context-state.service';
import { ActiveEnterpriseLabelService } from '../../../../core/context/active-enterprise-label.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { InventoryApiService } from '../../../../core/api/inventory-api.service';
import { OrganizationsService } from '../../../../core/api/organizations-api.service';
import { ProductsApiService } from '../../../../core/api/products-api.service';
import { ActiveContext } from '../../../../shared/models/active-context.model';
import { WarehousesService, Warehouse } from '../../../warehouses/services/warehouses.service';
import { PosCartLine, PosPayment } from '../../models/pos.model';
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
  private readonly enterpriseLabelService = inject(ActiveEnterpriseLabelService);
  private readonly authService = inject(AuthService);
  private readonly inventoryApi = inject(InventoryApiService);
  private readonly warehousesApi = inject(WarehousesService);
  private readonly organizationsApi = inject(OrganizationsService);
  private readonly productsApi = inject(ProductsApiService);

  products: PosProduct[] = [];
  productsLoading = false;
  cartLines: PosCartLine[] = [];
  subtotal = 0;
  discountTotal = 0;
  total = 0;
  sessionId: string | null = null;
  sessionLoading = false;
  sessionOpenedAt: string | null = null;
  warehouses: Warehouse[] = [];
  selectedWarehouseId: string | null = null;
  openingAmount = 0;
  context: ActiveContext | null = null;
  priceListsEnabled = false;
  readonly enterpriseName$ = this.enterpriseLabelService.enterpriseName$;

  ngOnInit(): void {
    const context = this.activeContext.getActiveContext();
    if (!this.activeContext.isComplete(context)) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Contexto incompleto',
        detail: 'Selecciona organización, compañía, empresa y almacén antes de usar POS.',
      });
      return;
    }

    this.context = context;
    this.loadModuleFlags(context.organizationId!);
    this.loadWarehouses(context.organizationId!, context.enterpriseId!);
    this.loadActiveSession();
  }

  onSearchProducts(term: string): void {
    if (!this.context?.enterpriseId) {
      return;
    }
    const query = term.trim();
    if (!query) {
      this.products = [];
      return;
    }

    this.productsLoading = true;
    this.productsService
      .search({
        OrganizationId: this.context.organizationId!,
        enterpriseId: this.context.enterpriseId!,
        companyId: this.context.companyId ?? undefined,
        q: query,
      })
      .subscribe({
        next: (response) => {
          this.products = response;
          this.productsLoading = false;
        },
        error: (error: Error | { error?: { message?: string } } | null) => {
          this.products = [];
          this.productsLoading = false;
          this.handleError(error, 'No se pudieron cargar las variantes.');
        },
      });

    this.productsService
      .findByCode({
        OrganizationId: this.context.organizationId!,
        enterpriseId: this.context.enterpriseId!,
        companyId: this.context.companyId ?? undefined,
        code: query,
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
        detail: 'No se puede agregar una variante inactiva.',
      });
      return;
    }
    this.resolveUnitPrice(product.id, 1, product.price).subscribe((unitPrice) => {
      this.addOrUpdateLine(product, unitPrice);
    });
  }

  onQuantityChange(event: { variantId: string; quantity: number }): void {
    const { variantId, quantity } = event;
    const safeQuantity = quantity > 0 ? quantity : 1;
    const currentLine = this.cartLines.find((line) => line.variantId === variantId);
    if (!currentLine) {
      return;
    }

    if (!this.priceListsEnabled) {
      this.cartLines = this.cartLines.map((line) =>
        line.variantId === variantId
          ? { ...line, quantity: safeQuantity, subtotal: safeQuantity * line.unitPrice }
          : line,
      );
      this.recalculateTotals();
      return;
    }

    this.resolveUnitPrice(variantId, safeQuantity, currentLine.unitPrice).subscribe((unitPrice) => {
      this.cartLines = this.cartLines.map((line) =>
        line.variantId === variantId
          ? { ...line, quantity: safeQuantity, unitPrice, subtotal: safeQuantity * unitPrice }
          : line,
      );
      this.recalculateTotals();
    });
  }

  onRemoveLine(variantId: string): void {
    this.cartLines = this.cartLines.filter((line) => line.variantId !== variantId);
    this.recalculateTotals();
  }

  onCheckout(payment: PosPayment): void {
    const context = this.context;
    const sessionId = this.sessionId;
    const warehouseId = this.selectedWarehouseId;
    if (!context?.enterpriseId || !sessionId || !warehouseId) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Contexto incompleto',
        detail: 'Abre una sesión y selecciona un almacén antes de confirmar la venta.',
      });
      return;
    }
    if (this.cartLines.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Carrito vacío',
        detail: 'Agrega productos antes de confirmar la venta.',
      });
      return;
    }

    this.validateStockAvailability((ok) => {
      if (!ok) {
        return;
      }
      const user = this.authService.getCurrentUser();
      if (!user?.id) {
        this.messageService.add({
          severity: 'warn',
          summary: 'Usuario no encontrado',
          detail: 'Se requiere un usuario para confirmar la venta.',
        });
        return;
      }

      const payload = {
        OrganizationId: context.organizationId!,
        companyId: context.companyId!,
        enterpriseId: context.enterpriseId!,
        warehouseId,
        sessionId,
        cashierUserId: user.id,
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
                  summary: 'Venta completada',
                  detail: 'La venta se confirmó correctamente.',
                });
              },
              error: (error: Error | { error?: { message?: string } } | null) =>
                this.handleError(error, 'No se pudo confirmar la venta.'),
            });
        },
        error: (error: Error | { error?: { message?: string } } | null) =>
          this.handleError(error, 'No se pudo crear la venta.'),
      });
    });
  }

  onWarehouseChange(value: string): void {
    this.selectedWarehouseId = value;
  }

  onOpeningAmountChange(value: number): void {
    this.openingAmount = value;
  }

  openSession(): void {
    if (!this.context || !this.selectedWarehouseId) {
      return;
    }
    const user = this.authService.getCurrentUser();
    if (!user?.id) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Usuario no encontrado',
        detail: 'Se requiere un usuario para abrir la sesión.',
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
        openingAmount: this.openingAmount,
      })
      .subscribe({
        next: (session) => {
          this.sessionId = session.id;
          this.sessionOpenedAt = session.openedAt ?? null;
          this.openingAmount = session.openingAmount ?? this.openingAmount;
          this.sessionLoading = false;
        },
        error: (error: Error | { error?: { message?: string } } | null) => {
          this.sessionLoading = false;
          this.handleError(error, 'No se pudo abrir la sesión POS.');
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
        summary: 'Usuario no encontrado',
        detail: 'Se requiere un usuario para cerrar la sesión.',
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
          this.sessionOpenedAt = null;
          this.openingAmount = 0;
          this.sessionLoading = false;
        },
        error: (error: Error | { error?: { message?: string } } | null) => {
          this.sessionLoading = false;
          this.handleError(error, 'No se pudo cerrar la sesión POS.');
        },
      });
  }

  private loadWarehouses(organizationId: string, enterpriseId: string): void {
    this.warehousesApi.getAll(organizationId, enterpriseId).subscribe({
      next: (response) => {
        this.warehouses = response.result ?? [];
        this.selectedWarehouseId = this.warehouses[0]?.id ?? null;
      },
      error: (error: Error | { error?: { message?: string } } | null) => {
        this.handleError(error, 'No se pudieron cargar los almacenes.');
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
            this.sessionOpenedAt = session.openedAt ?? null;
            this.openingAmount = session.openingAmount ?? this.openingAmount;
            this.selectedWarehouseId = session.warehouseId ?? this.selectedWarehouseId;
          }
        },
        error: (error: HttpErrorResponse | Error | { error?: { message?: string } } | null) => {
          if (error instanceof HttpErrorResponse && error.status === 404) {
            this.handleError(error, 'La ruta de sesión activa no está disponible.');
            return;
          }
          this.handleError(error, 'No se pudo consultar la sesión activa.');
        },
      });
  }

  private addOrUpdateLine(product: PosProduct, unitPrice: number): void {
    const existing = this.cartLines.find((line) => line.variantId === product.id);
    if (existing) {
      const nextQuantity = existing.quantity + 1;
      this.cartLines = this.cartLines.map((line) =>
        line.variantId === product.id
          ? { ...line, quantity: nextQuantity, unitPrice, subtotal: nextQuantity * unitPrice }
          : line,
      );
    } else {
      this.cartLines = [
        ...this.cartLines,
        {
          variantId: product.id,
          productName: product.name,
          sku: product.sku,
          quantity: 1,
          unitPrice,
          subtotal: unitPrice,
        },
      ];
    }
    this.recalculateTotals();
  }

  private resolveUnitPrice(variantId: string, quantity: number, fallbackPrice: number) {
    if (!this.priceListsEnabled || !this.context) {
      return of(fallbackPrice);
    }
    if (!this.context.organizationId || !this.context.companyId) {
      return of(fallbackPrice);
    }
    return this.productsApi
      .resolvePrice({
        OrganizationId: this.context.organizationId,
        companyId: this.context.companyId,
        enterpriseId: this.context.enterpriseId ?? undefined,
        variantId,
        quantity,
        fallbackPrice,
      })
      .pipe(
        map((response) => response.result?.unitPrice ?? fallbackPrice),
        catchError(() => of(fallbackPrice)),
      );
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
              detail: `No hay stock suficiente para ${insufficient.line.productName}.`,
            });
            done(false);
            return;
          }
          done(true);
        },
        error: (error: Error | { error?: { message?: string } } | null) => {
          this.handleError(error, 'No se pudo validar el stock.');
          done(false);
        },
      });
  }

  private loadModuleFlags(organizationId: string): void {
    this.organizationsApi.getModulesOverview(organizationId).subscribe({
      next: (response) => {
        const modules = response.result?.modules ?? [];
        this.priceListsEnabled = this.isModuleEnabled(modules, 'price-lists');
      },
      error: () => {
        this.priceListsEnabled = false;
      },
    });
  }

  private isModuleEnabled(modules: Array<{ key: string; state?: { status?: string }; isSystem?: boolean }>, key: string): boolean {
    const module = modules.find((item) => item.key === key);
    return Boolean(module && module.state?.status !== 'disabled' && !module.isSystem);
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


