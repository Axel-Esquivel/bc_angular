import { Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { MessageService } from 'primeng/api';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';

import { ActiveContextStateService } from '../../../../core/context/active-context-state.service';
import { ProvidersService } from '../../../providers/services/providers.service';
import { PurchasesService } from '../../services/purchases.service';
import { Provider } from '../../../../shared/models/provider.model';
import { SupplierCatalogItem } from '../../../../shared/models/supplier-catalog.model';
import {
  LineFormGroup,
  PurchaseOrderLineDraft,
  PurchaseOrderLineView,
} from '../../components/purchase-order-lines/purchase-order-lines.component';
import { AddOrderProductResult } from '../../components/add-order-product-dialog/add-order-product-dialog.component';
import { PurchasesProductsLookupService } from '../../services/purchases-products-lookup.service';

interface SelectOption {
  label: string;
  value: string;
}

@Component({
  selector: 'app-purchase-order-create-page',
  standalone: false,
  templateUrl: './purchase-order-create-page.component.html',
  styleUrl: './purchase-order-create-page.component.scss',
  providers: [MessageService],
})
export class PurchaseOrderCreatePageComponent implements OnInit {
  private readonly providersService = inject(ProvidersService);
  private readonly purchasesService = inject(PurchasesService);
  private readonly activeContextState = inject(ActiveContextStateService);
  private readonly messageService = inject(MessageService);
  private readonly fb = inject(FormBuilder);
  private readonly lookupService = inject(PurchasesProductsLookupService);

  @Input() embedded = false;
  @Output() saved = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  providers: Provider[] = [];
  providerOptions: SelectOption[] = [];
  selectedProviderId: string | null = null;

  lineItems: PurchaseOrderLineView[] = [];
  drafts: PurchaseOrderLineDraft[] = [];
  orderForm: FormGroup<{ lines: FormArray<LineFormGroup> }> = this.fb.group({
    lines: this.fb.array<LineFormGroup>([]),
  });

  loadingProducts = false;
  saving = false;
  contextMissing = false;
  addDialogVisible = false;
  assignDialogVisible = false;

  ngOnInit(): void {
    this.preloadVariants();
    this.loadProviders();
  }

  get organizationId(): string | null {
    return this.activeContextState.getActiveContext().organizationId ?? null;
  }

  get companyId(): string | null {
    return this.activeContextState.getActiveContext().companyId ?? null;
  }

  onProviderChange(): void {
    this.loadSupplierProducts();
  }

  onLinesChange(drafts: PurchaseOrderLineDraft[]): void {
    this.drafts = drafts;
  }

  openAddProduct(): void {
    if (!this.selectedProviderId) {
      this.showError('Selecciona un proveedor.');
      return;
    }
    this.addDialogVisible = true;
  }

  closeAddProduct(): void {
    this.addDialogVisible = false;
  }

  openAssignDialog(): void {
    if (!this.selectedProviderId) {
      this.showError('Selecciona un proveedor.');
      return;
    }
    this.assignDialogVisible = true;
  }

  closeAssignDialog(): void {
    this.assignDialogVisible = false;
  }

  onAssignSaved(): void {
    this.assignDialogVisible = false;
    this.loadSupplierProducts();
  }

  onCancel(): void {
    this.cancel.emit();
  }

  onProductAdded(payload: AddOrderProductResult): void {
    const existingIndex = this.lineItems.findIndex((item) => item.variantId === payload.variantId);
    if (existingIndex >= 0) {
      const control = this.linesFormArray.at(existingIndex);
      const currentQty = control.controls.qty.value ?? 0;
      control.controls.qty.setValue(currentQty + payload.qty);
      this.messageService.add({
        severity: 'info',
        summary: 'Pedidos',
        detail: 'La variante ya estaba en el pedido. Se sumo la cantidad.',
      });
      this.addDialogVisible = false;
      return;
    }

    this.lineItems = [
      ...this.lineItems,
      {
        variantId: payload.variantId,
        variantLabel: payload.variantLabel,
        lastCost: payload.lastCost,
        lastCurrency: payload.lastCurrency,
      },
    ];

    this.linesFormArray.push(
      this.fb.group({
        qty: this.fb.control<number | null>(payload.qty, { validators: [Validators.min(0)] }),
        unitCost: this.fb.control<number | null>(payload.unitCost, { validators: [Validators.min(0)] }),
      }) as LineFormGroup,
    );

    this.addDialogVisible = false;
  }

  removeLine(index: number): void {
    if (index < 0 || index >= this.lineItems.length) {
      return;
    }
    this.lineItems = this.lineItems.filter((_, idx) => idx !== index);
    this.linesFormArray.removeAt(index);
  }

  saveOrder(): void {
    const OrganizationId = this.organizationId ?? undefined;
    const companyId = this.companyId ?? undefined;
    const supplierId = this.selectedProviderId ?? undefined;

    if (!OrganizationId || !companyId) {
      this.showError('Selecciona organizacion y empresa antes de continuar.');
      return;
    }
    if (!supplierId) {
      this.showError('Selecciona un proveedor.');
      return;
    }

    const lines = this.drafts
      .filter((line) => line.qty > 0)
      .map((line) => ({
        variantId: line.variantId,
        qty: line.qty,
        unitCost: line.unitCost,
        currency: line.currency,
      }));

    if (lines.length === 0) {
      this.showError('Agrega al menos un producto.');
      return;
    }

    this.saving = true;
    this.purchasesService
      .createPurchaseOrder({
        OrganizationId,
        companyId,
        supplierId,
        lines,
      })
      .subscribe({
        next: () => {
          this.saving = false;
          this.messageService.add({
            severity: 'success',
            summary: 'Pedidos',
            detail: 'Pedido creado correctamente.',
          });
          this.saved.emit();
        },
        error: () => {
          this.saving = false;
          this.showError('No se pudo crear el pedido.');
        },
      });
  }

  private loadProviders(): void {
    const organizationId = this.organizationId ?? undefined;
    const companyId = this.companyId ?? undefined;
    if (!organizationId || !companyId) {
      this.providers = [];
      this.providerOptions = [];
      this.contextMissing = true;
      return;
    }
    this.contextMissing = false;

    this.providersService.getAll().subscribe({
      next: ({ result }) => {
        const list = Array.isArray(result) ? result : [];
        this.providers = list.filter(
          (item) =>
            item.OrganizationId === organizationId &&
            item.companyId === companyId &&
            item.status !== 'inactive',
        );
        this.providerOptions = this.providers.map((provider) => ({
          label: provider.name,
          value: provider.id,
        }));
        if (!this.selectedProviderId && this.providerOptions.length > 0) {
          this.selectedProviderId = this.providerOptions[0].value;
        }
        this.loadSupplierProducts();
      },
      error: () => {
        this.providers = [];
        this.providerOptions = [];
        this.showError('No se pudieron cargar los proveedores.');
      },
    });
  }

  private loadSupplierProducts(): void {
    const OrganizationId = this.organizationId ?? undefined;
    const companyId = this.companyId ?? undefined;
    const supplierId = this.selectedProviderId ?? undefined;

    this.resetLines();

    if (!OrganizationId || !companyId || !supplierId) {
      return;
    }

    this.loadingProducts = true;
    this.purchasesService
      .listSupplierCatalog({ OrganizationId, companyId, supplierId })
      .subscribe({
        next: ({ result }) => {
          const items = Array.isArray(result) ? result : [];
          this.setLinesFromCatalog(items);
          this.loadingProducts = false;
        },
        error: () => {
          this.lineItems = [];
          this.loadingProducts = false;
          this.showError('No se pudieron cargar los productos del proveedor.');
        },
      });
  }

  private setLinesFromCatalog(items: SupplierCatalogItem[]): void {
    const activeItems = items.filter((item) => item.status !== 'inactive');
    this.lineItems = activeItems.map((item) => ({
      variantId: item.variantId,
      variantLabel: this.lookupService.getVariantById(item.variantId)?.name ?? item.variantId,
      lastCost: item.unitCost,
      lastCurrency: item.currency ?? null,
    }));

    this.linesFormArray.clear();
    this.lineItems.forEach((item) => {
      this.linesFormArray.push(
        this.fb.group({
          qty: this.fb.control<number | null>(0, { validators: [Validators.min(0)] }),
          unitCost: this.fb.control<number | null>(item.lastCost ?? null, { validators: [Validators.min(0)] }),
        }) as LineFormGroup,
      );
    });
  }

  private resetLines(): void {
    this.lineItems = [];
    this.drafts = [];
    this.linesFormArray.clear();
  }

  private preloadVariants(): void {
    this.lookupService.searchVariants('').subscribe({
      next: () => undefined,
      error: () => undefined,
    });
  }

  private showError(detail: string): void {
    this.messageService.add({
      severity: 'error',
      summary: 'Pedidos',
      detail,
    });
  }

  private get linesFormArray(): FormArray<LineFormGroup> {
    return this.orderForm.controls.lines;
  }
}
