import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { forkJoin, map } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { ActiveContextStateService } from '../../../../core/context/active-context-state.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { InventoryApiService } from '../../../../core/api/inventory-api.service';
import { WarehousesApiService, Warehouse } from '../../../../core/api/warehouses-api.service';
import { ActiveContext } from '../../../../shared/models/active-context.model';
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
        summary: 'Context missing',
        detail: 'Select organization, company, enterprise, and warehouse before using POS.',
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
    const query = term.trim();
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
          this.handleError(error, 'Failed to load products');
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
        summary: 'Inactive product',
        detail: 'Cannot add an inactive product.',
      });
      return;
    }
    this.addOrUpdateLine(product);
  }

  onQuantityChange(lineId: string, quantity: number): void {
    const safeQuantity = quantity > 0 ? quantity : 1;
    this.cartLines = this.cartLines.map((line) =>
      line.variantId === lineId
        ? { ...line, quantity: safeQuantity, subtotal: safeQuantity * line.unitPrice }
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
        summary: 'Missing context',
        detail: 'Open a session and select a warehouse before confirming the sale.',
      });
      return;
    }
    if (this.cartLines.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Empty cart',
        detail: 'Add items before confirming the sale.',
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
          summary: 'User missing',
          detail: 'User is required to confirm the sale.',
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
                  summary: 'Sale completed',
                  detail: 'The sale was posted successfully.',
                });
              },
              error: (error: Error | { error?: { message?: string } } | null) =>
                this.handleError(error, 'Failed to post sale'),
            });
        },
        error: (error: Error | { error?: { message?: string } } | null) =>
          this.handleError(error, 'Failed to create sale'),
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
        summary: 'User missing',
        detail: 'User is required to open a session.',
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
          this.handleError(error, 'Failed to open POS session');
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
        summary: 'User missing',
        detail: 'User is required to close a session.',
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
          this.handleError(error, 'Failed to close POS session');
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
        this.handleError(error, 'Failed to load warehouses');
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
          ? { ...line, quantity: nextQuantity, subtotal: nextQuantity * line.unitPrice }
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
              summary: 'Insufficient stock',
              detail: `Not enough stock for ${insufficient.line.productName}.`,
            });
            done(false);
            return;
          }
          done(true);
        },
        error: (error: Error | { error?: { message?: string } } | null) => {
          this.handleError(error, 'Failed to validate stock');
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
