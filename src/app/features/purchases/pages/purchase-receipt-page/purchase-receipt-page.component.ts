import { Component, DestroyRef, inject } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { ActiveContextStateService } from '../../../../core/context/active-context-state.service';
import { PurchasesService, PurchaseOrder } from '../../services/purchases.service';
import { WarehousesService, Warehouse } from '../../../warehouses/services/warehouses.service';
import { PurchasesProductsLookupService } from '../../services/purchases-products-lookup.service';
import { ApiResponse } from '../../../../shared/models/api-response.model';
import { ProvidersService } from '../../../providers/services/providers.service';
import { Provider } from '../../../../shared/models/provider.model';

interface SelectOption {
  label: string;
  value: string;
}

type DiscountType = 'percent' | 'amount' | undefined;

type ReceiptLineForm = FormGroup<{
  variantId: FormControl<string>;
  productId: FormControl<string | null>;
  orderedQty: FormControl<number>;
  quantityReceived: FormControl<number>;
  unitCost: FormControl<number>;
  discountType: FormControl<DiscountType>;
  discountValue: FormControl<number | null>;
  bonusQty: FormControl<number>;
}>;

type BonusLineForm = FormGroup<{
  variantId: FormControl<string>;
  quantity: FormControl<number>;
  bonusSourceLineId: FormControl<string | null>;
}>;

@Component({
  selector: 'app-purchase-receipt-page',
  standalone: false,
  templateUrl: './purchase-receipt-page.component.html',
  styleUrl: './purchase-receipt-page.component.scss',
  providers: [MessageService],
})
export class PurchaseReceiptPageComponent {
  private readonly purchasesService = inject(PurchasesService);
  private readonly warehousesService = inject(WarehousesService);
  private readonly providersService = inject(ProvidersService);
  private readonly activeContext = inject(ActiveContextStateService);
  private readonly lookupService = inject(PurchasesProductsLookupService);
  private readonly fb = inject(FormBuilder);
  private readonly messageService = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);

  readonly numberLocale = 'en-US';

  orderOptions: SelectOption[] = [];
  orders: PurchaseOrder[] = [];
  warehouseOptions: SelectOption[] = [];
  private providerIndex = new Map<string, string>();

  selectedOrderId: string | null = null;
  selectedWarehouseId: string | null = null;
  selectedOrder: PurchaseOrder | null = null;

  lineItems: { variantId: string; label: string; orderedQty: number }[] = [];
  lineFormArray: FormArray<ReceiptLineForm> = this.fb.array<ReceiptLineForm>([]);
  bonusFormArray: FormArray<BonusLineForm> = this.fb.array<BonusLineForm>([]);
  receiptForm: FormGroup<{
    lines: FormArray<ReceiptLineForm>;
    bonuses: FormArray<BonusLineForm>;
  }> = this.fb.group({
    lines: this.lineFormArray,
    bonuses: this.bonusFormArray,
  });

  loadingOrders = false;
  loadingWarehouses = false;
  validating = false;
  saving = false;

  totalSubtotal = 0;
  totalDiscounts = 0;
  totalNet = 0;
  totalBonusQty = 0;

  constructor() {
    this.loadProviders();
    this.loadOrders();
    this.loadWarehouses();
    this.preloadVariants();
    this.lineFormArray.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.recalculateTotals());
    this.bonusFormArray.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.recalculateTotals());
  }

  get organizationId(): string | null {
    return this.activeContext.getActiveContext().organizationId ?? null;
  }

  get companyId(): string | null {
    return this.activeContext.getActiveContext().companyId ?? null;
  }

  get enterpriseId(): string | null {
    return this.activeContext.getActiveContext().enterpriseId ?? null;
  }

  onOrderChange(orderId: string | null): void {
    this.selectedOrderId = orderId;
    this.selectedOrder = this.findOrder(orderId);
    this.buildLinesFromOrder(this.selectedOrder);
    this.recalculateTotals();
  }

  onWarehouseChange(warehouseId: string | null): void {
    this.selectedWarehouseId = warehouseId;
  }

  addBonusLine(): void {
    this.bonusFormArray.push(
      this.fb.group({
        variantId: this.fb.nonNullable.control(''),
        quantity: this.fb.nonNullable.control(0, { validators: [Validators.min(0)] }),
        bonusSourceLineId: this.fb.control<string | null>(null),
      }),
    );
  }

  removeBonusLine(index: number): void {
    if (index < 0 || index >= this.bonusFormArray.length) {
      return;
    }
    this.bonusFormArray.removeAt(index);
    this.recalculateTotals();
  }

  validateReceipt(): void {
    const payload = this.buildPayload();
    if (!payload) {
      return;
    }
    this.validating = true;
    this.purchasesService.validateGoodsReceipt(payload).subscribe({
      next: ({ result }) => {
        this.validating = false;
        if (result.valid) {
          this.messageService.add({
            severity: 'success',
            summary: 'Recepción',
            detail: 'La recepción es válida.',
          });
        } else {
          const first = result.errors[0];
          this.messageService.add({
            severity: 'error',
            summary: 'Recepción',
            detail: first ? `${first.path}: ${first.message}` : 'Validación fallida.',
          });
        }
      },
      error: () => {
        this.validating = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Recepción',
          detail: 'No se pudo validar la recepción.',
        });
      },
    });
  }

  saveReceipt(): void {
    const payload = this.buildPayload();
    if (!payload) {
      return;
    }
    this.saving = true;
    this.purchasesService.createGoodsReceipt(payload).subscribe({
      next: () => {
        this.saving = false;
        this.messageService.add({
          severity: 'success',
          summary: 'Recepción',
          detail: 'Recepción registrada correctamente.',
        });
      },
      error: () => {
        this.saving = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Recepción',
          detail: 'No se pudo registrar la recepción.',
        });
      },
    });
  }

  cancel(): void {
    this.resetForm();
  }

  private loadOrders(): void {
    const OrganizationId = this.organizationId ?? undefined;
    const companyId = this.companyId ?? undefined;
    if (!OrganizationId || !companyId) {
      return;
    }
    this.loadingOrders = true;
    this.purchasesService.listPurchaseOrders({ OrganizationId, companyId }).subscribe({
      next: (response: ApiResponse<PurchaseOrder[]>) => {
        const list = Array.isArray(response.result) ? response.result : [];
        this.orders = list;
        this.orderOptions = list.map((order) => ({
          label: this.buildOrderLabel(order),
          value: order.id,
        }));
        this.loadingOrders = false;
      },
      error: () => {
        this.loadingOrders = false;
      },
    });
  }

  private loadProviders(): void {
    const OrganizationId = this.organizationId ?? undefined;
    const companyId = this.companyId ?? undefined;
    if (!OrganizationId || !companyId) {
      return;
    }
    this.providersService.getAll().subscribe({
      next: (response: ApiResponse<Provider[]>) => {
        const list = Array.isArray(response.result) ? response.result : [];
        const filtered = list.filter(
          (item) => item.OrganizationId === OrganizationId && item.companyId === companyId,
        );
        this.providerIndex = new Map(filtered.map((provider) => [provider.id, provider.name]));
        if (this.orders.length > 0) {
          this.orderOptions = this.orders.map((order) => ({
            label: this.buildOrderLabel(order),
            value: order.id,
          }));
        }
      },
      error: () => {
        this.providerIndex.clear();
      },
    });
  }

  private buildOrderLabel(order: PurchaseOrder): string {
    const dateSource = order.createdAt ?? order.expectedDeliveryDate ?? null;
    const dateLabel = this.formatDateSafe(dateSource);
    const supplierName = this.providerIndex.get(order.supplierId) ?? order.supplierId;
    return `${dateLabel} - ${supplierName}`;
  }

  private formatDateSafe(value: string | Date | null | undefined): string {
    if (!value) {
      return 'Sin fecha';
    }
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
      return 'Sin fecha';
    }
    try {
      return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
    } catch {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  }

  private loadWarehouses(): void {
    const organizationId = this.organizationId ?? null;
    if (!organizationId) {
      return;
    }
    this.loadingWarehouses = true;
    this.warehousesService.getAll(organizationId, this.enterpriseId ?? undefined).subscribe({
      next: (response: ApiResponse<Warehouse[]>) => {
        const list = Array.isArray(response.result) ? response.result : [];
        this.warehouseOptions = list.map((warehouse) => ({
          label: warehouse.name,
          value: warehouse.id,
        }));
        this.loadingWarehouses = false;
      },
      error: () => {
        this.loadingWarehouses = false;
      },
    });
  }

  private findOrder(orderId: string | null): PurchaseOrder | null {
    if (!orderId) {
      return null;
    }
    return this.orders.find((order) => order.id === orderId) ?? null;
  }

  private buildLinesFromOrder(order: PurchaseOrder | null): void {
    this.lineItems = [];
    this.lineFormArray.clear();
    if (!order?.lines?.length) {
      return;
    }
    order.lines.forEach((line) => {
      const label = this.lookupService.getVariantById(line.variantId)?.name ?? line.variantId;
      this.lineItems.push({
        variantId: line.variantId,
        label,
        orderedQty: line.quantity,
      });
      this.lineFormArray.push(
        this.fb.group({
          variantId: this.fb.nonNullable.control(line.variantId),
          productId: this.fb.control<string | null>(null),
          orderedQty: this.fb.nonNullable.control(line.quantity),
          quantityReceived: this.fb.nonNullable.control(line.quantity, { validators: [Validators.min(0)] }),
          unitCost: this.fb.nonNullable.control(line.unitCost, { validators: [Validators.min(0)] }),
          discountType: this.fb.nonNullable.control<DiscountType>('percent'),
          discountValue: this.fb.control<number | null>(null, { validators: [Validators.min(0)] }),
          bonusQty: this.fb.nonNullable.control(0, { validators: [Validators.min(0)] }),
        }),
      );
    });
  }

  private buildPayload():
    | {
        OrganizationId: string;
        companyId: string;
        purchaseOrderId?: string;
        warehouseId: string;
        lines: Array<{
          variantId: string;
          productId?: string;
          quantity: number;
          quantityReceived?: number;
          unitCost: number;
          discountType?: DiscountType;
          discountValue?: number;
          bonusQty?: number;
          isBonus?: boolean;
          bonusSourceLineId?: string;
        }>;
      }
    | null {
    const OrganizationId = this.organizationId ?? undefined;
    const companyId = this.companyId ?? undefined;
    if (!OrganizationId || !companyId) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Recepción',
        detail: 'Selecciona organización y empresa.',
      });
      return null;
    }
    if (!this.selectedWarehouseId) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Recepción',
        detail: 'Selecciona un almacén.',
      });
      return null;
    }

    const baseLines = this.lineFormArray.controls.map((group) => {
      const raw = group.getRawValue();
      return {
        variantId: raw.variantId,
        productId: raw.productId ?? undefined,
        quantity: raw.orderedQty,
        quantityReceived: raw.quantityReceived,
        unitCost: raw.unitCost,
        discountType: raw.discountType ?? undefined,
        discountValue: raw.discountValue ?? undefined,
        bonusQty: raw.bonusQty ?? undefined,
      };
    });

    const bonusLines = this.bonusFormArray.controls
      .map((group) => group.getRawValue())
      .filter((bonus) => bonus.variantId || bonus.quantity > 0);

    if (bonusLines.some((bonus) => !bonus.variantId || bonus.quantity <= 0)) {
      this.messageService.add({
        severity: 'warn',
        summary: 'RecepciÃ³n',
        detail: 'Completa las bonificaciones: producto y cantidad mayor a 0.',
      });
      return null;
    }

    const mappedBonusLines = bonusLines.map((bonus) => ({
        variantId: bonus.variantId,
        quantity: bonus.quantity,
        quantityReceived: bonus.quantity,
        unitCost: 0,
        isBonus: true,
        bonusSourceLineId: bonus.bonusSourceLineId ?? undefined,
      }));

    return {
      OrganizationId,
      companyId,
      purchaseOrderId: this.selectedOrderId ?? undefined,
      warehouseId: this.selectedWarehouseId,
      lines: [...baseLines, ...mappedBonusLines],
    };
  }

  private recalculateTotals(): void {
    let subtotal = 0;
    let discounts = 0;
    let bonusTotal = 0;

    this.lineFormArray.controls.forEach((group) => {
      const raw = group.getRawValue();
      const qty = raw.quantityReceived ?? 0;
      const unitCost = raw.unitCost ?? 0;
      const base = qty * unitCost;
      subtotal += base;
      if (raw.discountType && raw.discountValue) {
        if (raw.discountType === 'percent') {
          discounts += (base * raw.discountValue) / 100;
        } else if (raw.discountType === 'amount') {
          discounts += raw.discountValue;
        }
      }
      bonusTotal += raw.bonusQty ?? 0;
    });

    this.bonusFormArray.controls.forEach((group) => {
      const raw = group.getRawValue();
      bonusTotal += raw.quantity ?? 0;
    });

    this.totalSubtotal = subtotal;
    this.totalDiscounts = discounts;
    this.totalNet = Math.max(subtotal - discounts, 0);
    this.totalBonusQty = bonusTotal;
  }

  private resetForm(): void {
    this.selectedOrderId = null;
    this.selectedWarehouseId = null;
    this.selectedOrder = null;
    this.lineItems = [];
    this.lineFormArray.clear();
    this.bonusFormArray.clear();
    this.recalculateTotals();
  }

  private preloadVariants(): void {
    this.lookupService.searchVariants('').subscribe({
      next: () => undefined,
      error: () => undefined,
    });
  }
}
