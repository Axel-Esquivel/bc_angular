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
import { DashboardApiService } from '../../../../core/api/dashboard-api.service';
import { ActiveContext } from '../../../../shared/models/active-context.model';
import { WarehousesService, Warehouse } from '../../../warehouses/services/warehouses.service';
import { PosConfig } from '../../models/pos-config.model';
import {
  PosCashMovement,
  PosCashMovementType,
  PosCartLine,
  PosPayment,
  PosPaymentMethod,
  PosSessionDenomination,
  PosSessionSummary,
} from '../../models/pos.model';
import { PosProduct } from '../../models/pos-product.model';
import { PosConfigsService } from '../../services/pos-configs.service';
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
  private readonly posConfigsService = inject(PosConfigsService);
  private readonly posService = inject(PosHttpService);
  private readonly activeContext = inject(ActiveContextStateService);
  private readonly enterpriseLabelService = inject(ActiveEnterpriseLabelService);
  private readonly authService = inject(AuthService);
  private readonly inventoryApi = inject(InventoryApiService);
  private readonly warehousesApi = inject(WarehousesService);
  private readonly organizationsApi = inject(OrganizationsService);
  private readonly productsApi = inject(ProductsApiService);
  private readonly dashboardApi = inject(DashboardApiService);

  products: PosProduct[] = [];
  productsLoading = false;
  cartLines: PosCartLine[] = [];
  subtotal = 0;
  discountTotal = 0;
  total = 0;
  sessionId: string | null = null;
  sessionLoading = false;
  sessionOpenedAt: string | null = null;
  posConfigs: PosConfig[] = [];
  posConfigsLoading = false;
  selectedPosConfigId: string | null = null;
  selectedPosConfig: PosConfig | null = null;
  warehouses: Warehouse[] = [];
  selectedWarehouseId: string | null = null;
  openingAmount = 0;
  openingDenominations: PosSessionDenomination[] = [];
  closeDialogVisible = false;
  closeSummary: PosSessionSummary | null = null;
  closingDenominations: PosSessionDenomination[] = [];
  closingNotes = '';
  closingLoading = false;
  closingTotal = 0;
  closingDifference = 0;
  cashMovements: PosCashMovement[] = [];
  cashMovementDialogVisible = false;
  cashMovementLoading = false;
  cashMovementType: PosCashMovementType = 'income';
  cashMovementAmount = 0;
  cashMovementReason = '';
  cashMovementNotes = '';
  cashMovementMethod: PosPaymentMethod = 'CASH';
  context: ActiveContext | null = null;
  priceListsEnabled = false;
  readonly enterpriseName$ = this.enterpriseLabelService.enterpriseName$;
  permissions: string[] = [];
  accessDenied = false;
  readonly cashMovementTypeOptions = [
    { label: 'Ingreso', value: 'income' as PosCashMovementType },
    { label: 'Egreso', value: 'expense' as PosCashMovementType },
    { label: 'Retiro', value: 'withdrawal' as PosCashMovementType },
    { label: 'Fondo adicional', value: 'float' as PosCashMovementType },
    { label: 'Ajuste', value: 'adjustment' as PosCashMovementType },
  ];
  readonly cashMovementMethodOptions = [
    { label: 'Efectivo', value: 'CASH' as PosPaymentMethod },
  ];

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
    this.loadPermissions(context);
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
    if (!this.canCreateSale()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Sin permiso',
        detail: 'No tienes permiso para registrar ventas.',
      });
      return;
    }
    const context = this.context;
    const sessionId = this.sessionId;
    const warehouseId = this.selectedPosConfig?.warehouseId ?? this.selectedWarehouseId;
    if (!context?.enterpriseId || !sessionId || !warehouseId || !this.selectedPosConfig) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Contexto incompleto',
        detail: 'Selecciona un POS y abre una sesión antes de confirmar la venta.',
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

  onPosConfigChange(value: string): void {
    this.selectedPosConfigId = value;
    this.selectedPosConfig = this.posConfigs.find((config) => config.id === value) ?? null;
    this.selectedWarehouseId = this.selectedPosConfig?.warehouseId ?? null;
    if (this.selectedPosConfig?.currencyId) {
      this.openingDenominations = this.buildDefaultDenominations(this.selectedPosConfig.currencyId);
      this.openingAmount = this.calculateDenominationsTotal(this.openingDenominations);
    } else {
      this.openingDenominations = [];
      this.openingAmount = 0;
    }
  }

  onOpeningAmountChange(value: number): void {
    this.openingAmount = value;
  }

  onDenominationsChange(value: PosSessionDenomination[]): void {
    this.openingDenominations = value;
    this.openingAmount = this.calculateDenominationsTotal(value);
  }

  openSession(): void {
    if (!this.canOpenSession()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Sin permiso',
        detail: 'No tienes permiso para abrir sesión.',
      });
      return;
    }
    if (!this.context || !this.selectedWarehouseId || !this.selectedPosConfig) {
      this.messageService.add({
        severity: 'warn',
        summary: 'POS no seleccionado',
        detail: 'Selecciona un punto de venta antes de abrir la sesión.',
      });
      return;
    }
    if (this.selectedPosConfig.requiresOpening && this.openingAmount <= 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Monto requerido',
        detail: 'Ingresa un monto de apertura válido para abrir la sesión.',
      });
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
        posConfigId: this.selectedPosConfig.id,
        OrganizationId: this.context.organizationId!,
        companyId: this.context.companyId!,
        enterpriseId: this.context.enterpriseId!,
        warehouseId: this.selectedPosConfig.warehouseId,
        cashierUserId: user.id,
        openingAmount: this.openingAmount,
        openingDenominations: this.openingDenominations,
      })
      .subscribe({
        next: (session) => {
          this.sessionId = session.id;
          this.sessionOpenedAt = session.openedAt ?? null;
          this.openingAmount = session.openingAmount ?? this.openingAmount;
          this.openingDenominations = session.openingDenominations ?? this.openingDenominations;
          this.loadCashMovements();
          this.sessionLoading = false;
        },
        error: (error: Error | { error?: { message?: string } } | null) => {
          this.sessionLoading = false;
          this.handleError(error, 'No se pudo abrir la sesión POS.');
        },
      });
  }

  requestCloseSession(): void {
    if (!this.canCloseSession()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Sin permiso',
        detail: 'No tienes permiso para cerrar sesión.',
      });
      return;
    }
    if (!this.context || !this.sessionId) {
      return;
    }
    if (!this.selectedPosConfig) {
      this.messageService.add({
        severity: 'warn',
        summary: 'POS no seleccionado',
        detail: 'Selecciona un punto de venta antes de cerrar la sesión.',
      });
      return;
    }
    this.closeDialogVisible = true;
    this.closingNotes = '';
    this.loadCloseSummary();
  }

  confirmCloseSession(): void {
    if (!this.canCloseSession()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Sin permiso',
        detail: 'No tienes permiso para cerrar sesión.',
      });
      return;
    }
    if (!this.context || !this.sessionId || !this.selectedPosConfig) {
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

    if (this.closingDenominations.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Denominaciones requeridas',
        detail: 'Ingresa el detalle de denominaciones para cerrar la sesión.',
      });
      return;
    }

    if (this.closingDifference !== 0 && !this.closingNotes.trim()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Observación requerida',
        detail: 'Ingresa una observación cuando exista diferencia de caja.',
      });
      return;
    }

    this.closingLoading = true;
    this.posService
      .closeSession({
        OrganizationId: this.context.organizationId!,
        companyId: this.context.companyId!,
        enterpriseId: this.context.enterpriseId!,
        sessionId: this.sessionId,
        cashierUserId: user.id,
        posConfigId: this.selectedPosConfigId ?? undefined,
        closingDenominations: this.closingDenominations,
        countedClosingAmount: this.closingTotal,
        notes: this.closingNotes.trim() || undefined,
      })
      .subscribe({
        next: () => {
          this.sessionId = null;
          this.sessionOpenedAt = null;
          this.openingAmount = 0;
          this.openingDenominations = [];
          this.cashMovements = [];
          this.closeDialogVisible = false;
          this.closingLoading = false;
          this.closeSummary = null;
          this.closingDenominations = [];
          this.closingTotal = 0;
          this.closingDifference = 0;
        },
        error: (error: Error | { error?: { message?: string } } | null) => {
          this.closingLoading = false;
          this.handleError(error, 'No se pudo cerrar la sesión POS.');
        },
      });
  }

  private loadWarehouses(organizationId: string, enterpriseId: string): void {
    this.warehousesApi.getAll(organizationId, enterpriseId).subscribe({
      next: (response) => {
        this.warehouses = response.result ?? [];
        if (!this.selectedWarehouseId) {
          this.selectedWarehouseId = this.warehouses[0]?.id ?? null;
        }
      },
      error: (error: Error | { error?: { message?: string } } | null) => {
        this.handleError(error, 'No se pudieron cargar los almacenes.');
      },
    });
  }

  private loadAvailablePosConfigs(): void {
    if (!this.context) {
      return;
    }
    if (!this.canAccessPos()) {
      this.accessDenied = true;
      this.messageService.add({
        severity: 'warn',
        summary: 'Acceso restringido',
        detail: 'No tienes permisos para acceder al POS.',
      });
      return;
    }
    this.posConfigsLoading = true;
    this.posConfigsService
      .listAvailableForMe({
        OrganizationId: this.context.organizationId ?? undefined,
        companyId: this.context.companyId ?? undefined,
        enterpriseId: this.context.enterpriseId ?? undefined,
      })
      .subscribe({
        next: (configs) => {
          this.posConfigs = configs ?? [];
          if (this.posConfigs.length === 0) {
            this.selectedPosConfigId = null;
            this.selectedPosConfig = null;
            this.selectedWarehouseId = null;
            this.messageService.add({
              severity: 'warn',
              summary: 'Sin POS disponibles',
              detail: 'No tienes puntos de venta asignados. Solicita acceso para continuar.',
            });
          } else if (!this.selectedPosConfigId && this.posConfigs.length === 1) {
            const onlyConfig = this.posConfigs[0];
            this.selectedPosConfigId = onlyConfig.id;
            this.selectedPosConfig = onlyConfig;
            this.selectedWarehouseId = onlyConfig.warehouseId ?? null;
            this.openingDenominations = this.buildDefaultDenominations(onlyConfig.currencyId);
            this.openingAmount = this.calculateDenominationsTotal(this.openingDenominations);
          } else if (this.selectedPosConfigId) {
            this.selectedPosConfig = this.posConfigs.find((config) => config.id === this.selectedPosConfigId) ?? null;
            this.selectedWarehouseId = this.selectedPosConfig?.warehouseId ?? this.selectedWarehouseId;
            if (this.selectedPosConfig?.currencyId) {
              this.openingDenominations = this.buildDefaultDenominations(this.selectedPosConfig.currencyId);
              this.openingAmount = this.calculateDenominationsTotal(this.openingDenominations);
            }
          }
          this.posConfigsLoading = false;
          this.loadActiveSession();
        },
        error: (error: Error | { error?: { message?: string } } | null) => {
          this.posConfigs = [];
          this.selectedPosConfigId = null;
          this.selectedPosConfig = null;
          this.posConfigsLoading = false;
          this.handleError(error, 'No se pudieron cargar los puntos de venta disponibles.');
        },
      });
  }

  private loadActiveSession(): void {
    if (!this.context) {
      return;
    }
    if (!this.canAccessPos()) {
      return;
    }
    const user = this.authService.getCurrentUser();
    if (!user?.id) {
      return;
    }
    const query = {
      OrganizationId: this.context.organizationId!,
      companyId: this.context.companyId!,
      enterpriseId: this.context.enterpriseId!,
      cashierUserId: user.id,
      posConfigId: this.selectedPosConfigId ?? undefined,
    };

    this.posService
      .getActiveSession(query)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (session) => {
          if (session) {
            this.sessionId = session.id;
            this.sessionOpenedAt = session.openedAt ?? null;
            this.openingAmount = session.openingAmount ?? this.openingAmount;
            this.selectedWarehouseId = session.warehouseId ?? this.selectedWarehouseId;
            if (session.openingDenominations) {
              this.openingDenominations = session.openingDenominations;
            }
            this.loadCashMovements();
            if (session.posConfigId && session.posConfigId !== this.selectedPosConfigId) {
              this.selectedPosConfigId = session.posConfigId;
              this.selectedPosConfig =
                this.posConfigs.find((config) => config.id === session.posConfigId) ?? null;
            }
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

  openCashMovementDialog(): void {
    if (!this.canCashMove()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Sin permiso',
        detail: 'No tienes permiso para registrar movimientos de caja.',
      });
      return;
    }
    if (!this.sessionId) {
      return;
    }
    this.cashMovementType = 'income';
    this.cashMovementAmount = 0;
    this.cashMovementReason = '';
    this.cashMovementNotes = '';
    this.cashMovementMethod = 'CASH';
    this.cashMovementDialogVisible = true;
  }

  saveCashMovement(): void {
    if (!this.canCashMove()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Sin permiso',
        detail: 'No tienes permiso para registrar movimientos de caja.',
      });
      return;
    }
    if (!this.context || !this.sessionId) {
      return;
    }
    const user = this.authService.getCurrentUser();
    if (!user?.id) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Usuario no encontrado',
        detail: 'Se requiere un usuario para registrar movimientos.',
      });
      return;
    }
    if (!this.cashMovementReason.trim()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Motivo requerido',
        detail: 'Ingresa el motivo del movimiento.',
      });
      return;
    }
    if (!Number.isFinite(this.cashMovementAmount) || this.cashMovementAmount === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Monto inválido',
        detail: 'Ingresa un monto válido.',
      });
      return;
    }
    if (this.cashMovementType !== 'adjustment' && this.cashMovementAmount < 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Monto inválido',
        detail: 'El monto debe ser positivo para este tipo de movimiento.',
      });
      return;
    }
    if (this.cashMovementType === 'withdrawal' && !this.canCashWithdraw()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Sin permiso',
        detail: 'No tienes permiso para registrar retiros.',
      });
      return;
    }

    const currencyId = this.selectedPosConfig?.currencyId ?? this.context.currencyId ?? 'USD';
    this.cashMovementLoading = true;
    this.posService
      .createCashMovement(this.sessionId, {
        sessionId: this.sessionId,
        OrganizationId: this.context.organizationId!,
        companyId: this.context.companyId!,
        enterpriseId: this.context.enterpriseId!,
        type: this.cashMovementType,
        amount: this.cashMovementAmount,
        currencyId,
        paymentMethod: this.cashMovementMethod,
        reason: this.cashMovementReason.trim(),
        notes: this.cashMovementNotes.trim() || undefined,
        createdByUserId: user.id,
      })
      .subscribe({
        next: () => {
          this.cashMovementLoading = false;
          this.cashMovementDialogVisible = false;
          this.loadCashMovements();
        },
        error: (error: Error | { error?: { message?: string } } | null) => {
          this.cashMovementLoading = false;
          this.handleError(error, 'No se pudo registrar el movimiento.');
        },
      });
  }

  private loadCashMovements(): void {
    if (!this.context || !this.sessionId) {
      return;
    }
    if (!this.canSessionHistory()) {
      return;
    }
    this.posService
      .listCashMovements(this.sessionId, {
        OrganizationId: this.context.organizationId!,
        companyId: this.context.companyId!,
        enterpriseId: this.context.enterpriseId!,
      })
      .subscribe({
        next: (movements) => {
          this.cashMovements = movements;
        },
        error: (error: Error | { error?: { message?: string } } | null) => {
          this.handleError(error, 'No se pudieron cargar los movimientos de caja.');
        },
      });
  }

  private loadCloseSummary(): void {
    if (!this.context || !this.sessionId) {
      return;
    }
    if (!this.canCloseSession()) {
      return;
    }
    this.closingLoading = true;
    this.posService
      .getSessionSummary(this.sessionId, {
        OrganizationId: this.context.organizationId!,
        companyId: this.context.companyId!,
        enterpriseId: this.context.enterpriseId!,
      })
      .subscribe({
        next: (summary) => {
          this.closeSummary = summary;
          const currencyId = summary?.currency ?? this.selectedPosConfig?.currencyId ?? this.context?.currencyId ?? 'USD';
          this.closingDenominations = this.buildDefaultDenominations(currencyId);
          this.updateClosingTotals();
          this.closingLoading = false;
        },
        error: (error: Error | { error?: { message?: string } } | null) => {
          this.closingLoading = false;
          this.handleError(error, 'No se pudo cargar el resumen de cierre.');
        },
      });
  }

  onClosingDenominationChange(denomination: PosSessionDenomination, quantity: number | null): void {
    const safeQuantity = Math.max(0, Math.floor(quantity ?? 0));
    this.closingDenominations = this.closingDenominations.map((item) =>
      item.denominationValue === denomination.denominationValue && item.denominationType === denomination.denominationType
        ? { ...item, quantity: safeQuantity, subtotal: safeQuantity * item.denominationValue }
        : item,
    );
    this.updateClosingTotals();
  }

  private updateClosingTotals(): void {
    this.closingTotal = this.calculateDenominationsTotal(this.closingDenominations);
    const expected = this.closeSummary?.expectedClosingAmount ?? 0;
    this.closingDifference = this.closingTotal - expected;
  }

  getMovementTypeLabel(value: PosCashMovementType): string {
    switch (value) {
      case 'income':
        return 'Ingreso';
      case 'expense':
        return 'Egreso';
      case 'withdrawal':
        return 'Retiro';
      case 'float':
        return 'Fondo adicional';
      case 'adjustment':
        return 'Ajuste';
      default:
        return value;
    }
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

  private loadPermissions(context: ActiveContext): void {
    this.dashboardApi
      .getOverview({ orgId: context.organizationId ?? undefined, companyId: context.companyId ?? undefined })
      .subscribe({
        next: (response) => {
          this.permissions = response.result?.permissions ?? [];
          if (!this.canAccessPos()) {
            this.accessDenied = true;
            this.messageService.add({
              severity: 'warn',
              summary: 'Acceso restringido',
              detail: 'No tienes permisos para acceder al POS.',
            });
            return;
          }
          this.loadModuleFlags(context.organizationId!);
          this.loadWarehouses(context.organizationId!, context.enterpriseId!);
          this.loadAvailablePosConfigs();
        },
        error: () => {
          this.permissions = [];
          this.accessDenied = true;
          this.messageService.add({
            severity: 'warn',
            summary: 'Acceso restringido',
            detail: 'No fue posible validar permisos para POS.',
          });
        },
      });
  }

  private hasPermission(required: string): boolean {
    if (this.permissions.includes('*') || this.permissions.includes(required)) {
      return true;
    }
    return this.permissions.some((permission) => {
      if (!permission.endsWith('.*')) {
        return false;
      }
      const prefix = permission.slice(0, -1);
      return required.startsWith(prefix);
    });
  }

  canAccessPos(): boolean {
    return this.hasPermission('pos.access') || this.hasPermission('pos.read') || this.hasPermission('pos.write');
  }

  canOpenSession(): boolean {
    return this.hasPermission('pos.session.open');
  }

  canCloseSession(): boolean {
    return this.hasPermission('pos.session.close');
  }

  canCreateSale(): boolean {
    return this.hasPermission('pos.sale.create');
  }

  canSessionHistory(): boolean {
    return this.hasPermission('pos.session.history');
  }

  canCashMove(): boolean {
    return this.hasPermission('pos.cash.move');
  }

  canCashWithdraw(): boolean {
    return this.hasPermission('pos.cash.withdrawal');
  }

  private buildDefaultDenominations(currencyId: string): PosSessionDenomination[] {
    const upper = currencyId.toUpperCase();
    const values =
      upper === 'GTQ'
        ? {
            bills: [200, 100, 50, 20, 10, 5, 1],
            coins: [1, 0.5, 0.25, 0.1, 0.05, 0.01],
          }
        : upper === 'USD'
          ? {
              bills: [100, 50, 20, 10, 5, 1],
              coins: [1, 0.5, 0.25, 0.1, 0.05, 0.01],
            }
          : upper === 'MXN'
            ? {
                bills: [500, 200, 100, 50, 20, 10],
                coins: [20, 10, 5, 2, 1, 0.5],
              }
            : upper === 'EUR'
              ? {
                  bills: [500, 200, 100, 50, 20, 10, 5],
                  coins: [2, 1, 0.5, 0.2, 0.1, 0.05, 0.02, 0.01],
                }
              : {
                  bills: [100, 50, 20, 10, 5, 1],
                  coins: [1, 0.5, 0.25, 0.1, 0.05, 0.01],
                };

    return [
      ...values.bills.map((value) => ({
        currencyId,
        denominationValue: value,
        denominationType: 'bill' as const,
        quantity: 0,
        subtotal: 0,
      })),
      ...values.coins.map((value) => ({
        currencyId,
        denominationValue: value,
        denominationType: 'coin' as const,
        quantity: 0,
        subtotal: 0,
      })),
    ];
  }

  private calculateDenominationsTotal(denominations: PosSessionDenomination[]): number {
    return denominations.reduce((acc, item) => acc + item.subtotal, 0);
  }
}


