import { Component, DestroyRef, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, inject } from '@angular/core';
import { MessageService } from 'primeng/api';
import { FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { ActiveContextStateService } from '../../../../core/context/active-context-state.service';
import { CompaniesApiService } from '../../../../core/api/companies-api.service';
import { OrganizationCoreApiService } from '../../../../core/api/organization-core-api.service';
import { PackagingName, PackagingNamesApiService } from '../../../../core/api/packaging-names-api.service';
import { ProvidersService } from '../../../providers/services/providers.service';
import { PurchasesService, PurchaseOrder } from '../../services/purchases.service';
import { Provider } from '../../../../shared/models/provider.model';
import { SupplierCatalogItem } from '../../../../shared/models/supplier-catalog.model';
import { Company, CompanyEnterprise } from '../../../../shared/models/company.model';
import { CoreCurrency } from '../../../../shared/models/organization-core.model';
import {
  LineFormGroup,
  PackagingOption,
  PurchaseOrderLineDraft,
  PurchaseOrderLineView,
} from '../../components/purchase-order-lines/purchase-order-lines.component';
import { AddOrderProductResult } from '../../components/add-order-product-dialog/add-order-product-dialog.component';
import { PurchasesProductsLookupService } from '../../services/purchases-products-lookup.service';

interface SelectOption {
  label: string;
  value: string;
}

interface OrderStatusOption {
  label: string;
  value: PurchaseOrderStatus;
}

type PurchaseOrderStatus = 'DRAFT' | 'CONFIRMED' | 'RECEIVED' | 'CANCELLED';

type OrderHeaderForm = FormGroup<{
  orderDate: FormControl<Date | null>;
  expectedDeliveryDate: FormControl<Date | null>;
  receivedAt: FormControl<Date | null>;
  status: FormControl<PurchaseOrderStatus>;
  currencyId: FormControl<string | null>;
  globalFreight: FormControl<number | null>;
  globalExtraCosts: FormControl<number | null>;
  notes: FormControl<string | null>;
}>;

@Component({
  selector: 'app-purchase-order-create-page',
  standalone: false,
  templateUrl: './purchase-order-create-page.component.html',
  styleUrl: './purchase-order-create-page.component.scss',
  providers: [MessageService],
})
export class PurchaseOrderCreatePageComponent implements OnInit, OnChanges {
  private readonly providersService = inject(ProvidersService);
  private readonly purchasesService = inject(PurchasesService);
  private readonly activeContextState = inject(ActiveContextStateService);
  private readonly messageService = inject(MessageService);
  private readonly fb = inject(FormBuilder);
  private readonly lookupService = inject(PurchasesProductsLookupService);
  private readonly companiesApi = inject(CompaniesApiService);
  private readonly organizationCoreApi = inject(OrganizationCoreApiService);
  private readonly packagingNamesApi = inject(PackagingNamesApiService);
  private readonly destroyRef = inject(DestroyRef);

  @Input() embedded = false;
  @Input() mode: 'create' | 'edit' | 'view' = 'create';
  @Input() order?: PurchaseOrder | null;
  @Output() saved = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  providers: Provider[] = [];
  providerOptions: SelectOption[] = [];
  selectedProviderId: string | null = null;

  currencyOptions: SelectOption[] = [];
  defaultCurrencyId: string | null = null;
  packagingOptions: PackagingOption[] = [];
  private packagingById = new Map<string, PackagingOption>();
  private defaultPackagingId: string | null = null;
  orderTotal = 0;
  readonly numberLocale = 'en-US';

  readonly statusOptions: OrderStatusOption[] = [
    { label: 'Borrador', value: 'DRAFT' },
    { label: 'Confirmado', value: 'CONFIRMED' },
    { label: 'Recibido', value: 'RECEIVED' },
    { label: 'Cancelado', value: 'CANCELLED' },
  ];

  lineItems: PurchaseOrderLineView[] = [];
  drafts: PurchaseOrderLineDraft[] = [];
  headerForm: OrderHeaderForm = this.fb.group({
    orderDate: this.fb.control<Date | null>(new Date(), { validators: [Validators.required] }),
    expectedDeliveryDate: this.fb.control<Date | null>(null),
    receivedAt: this.fb.control<Date | null>({ value: null, disabled: true }),
    status: this.fb.nonNullable.control<PurchaseOrderStatus>('DRAFT'),
    currencyId: this.fb.control<string | null>(null),
    globalFreight: this.fb.control<number | null>(null, { validators: [Validators.min(0)] }),
    globalExtraCosts: this.fb.control<number | null>(null, { validators: [Validators.min(0)] }),
    notes: this.fb.control<string | null>(null),
  });
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
    this.loadCurrencies();
    this.loadProviders();
    this.loadPackagingNames();
    this.bindHeaderChanges();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['order'] || changes['mode']) {
      if (this.order && (this.isViewMode || this.isEditMode)) {
        this.applyOrder(this.order);
        if (this.isViewMode) {
          this.disableFormsForView();
        } else {
          this.enableFormsForEdit();
        }
      }
    }
  }

  get organizationId(): string | null {
    return this.activeContextState.getActiveContext().organizationId ?? null;
  }

  get companyId(): string | null {
    return this.activeContextState.getActiveContext().companyId ?? null;
  }

  get isViewMode(): boolean {
    return this.mode === 'view';
  }

  get isEditMode(): boolean {
    return this.mode === 'edit';
  }

  onProviderChange(): void {
    if (this.isViewMode) {
      return;
    }
    this.loadSupplierProducts();
  }

  onLinesChange(drafts: PurchaseOrderLineDraft[]): void {
    this.drafts = drafts;
    this.recalculateTotal();
  }

  openAddProduct(): void {
    if (this.isViewMode) {
      return;
    }
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
    if (this.isViewMode) {
      return;
    }
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
        lastCurrency: payload.lastCurrency ?? this.defaultCurrencyId ?? null,
        packagingId: this.defaultPackagingId ?? '',
      },
    ];

    this.linesFormArray.push(
      this.fb.group({
        packagingId: this.fb.control<string | null>(this.defaultPackagingId, {
          validators: [Validators.required],
        }),
        packagingMultiplier: this.fb.control<number | null>(
          this.resolvePackagingMultiplier(this.defaultPackagingId),
          { validators: [Validators.min(1)] },
        ),
        qty: this.fb.control<number | null>(payload.qty, { validators: [Validators.min(0)] }),
        unitCost: this.fb.control<number | null>(payload.unitCost, { validators: [Validators.min(0)] }),
        currency: this.fb.control<string | null>(payload.lastCurrency ?? this.defaultCurrencyId ?? null),
        freightCost: this.fb.control<number | null>(null, { validators: [Validators.min(0)] }),
        extraCosts: this.fb.control<number | null>(null, { validators: [Validators.min(0)] }),
        notes: this.fb.control<string | null>(null),
      }) as LineFormGroup,
    );

    this.addDialogVisible = false;
    this.recalculateTotal();
  }

  removeLine(index: number): void {
    if (index < 0 || index >= this.lineItems.length) {
      return;
    }
    this.lineItems = this.lineItems.filter((_, idx) => idx !== index);
    this.linesFormArray.removeAt(index);
    this.recalculateTotal();
  }

  saveOrder(): void {
    if (this.isViewMode) {
      return;
    }
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

    if (this.headerForm.invalid) {
      this.headerForm.markAllAsTouched();
      this.showError('Completa la cabecera del pedido.');
      return;
    }

    const lines = this.linesFormArray.controls
      .map((group, index) => {
        const raw = group.getRawValue();
        const packagingId = raw.packagingId ?? this.lineItems[index]?.packagingId ?? '';
        const packagingMultiplier =
          raw.packagingMultiplier ?? this.resolvePackagingMultiplier(packagingId);
        return {
          variantId: this.lineItems[index]?.variantId ?? '',
          packagingId,
          packagingMultiplier,
          qty: raw.qty ?? 0,
          unitCost: raw.unitCost ?? 0,
          currency: raw.currency ?? undefined,
          freightCost: raw.freightCost ?? undefined,
          extraCosts: raw.extraCosts ?? undefined,
          notes: raw.notes ?? undefined,
        };
      })
      .filter((line) => line.qty > 0 && line.variantId);

    if (lines.length === 0) {
      this.showError('Agrega al menos un producto.');
      return;
    }

    this.saving = true;
    const header = this.headerForm.getRawValue();
    const payload = {
      OrganizationId,
      companyId,
      supplierId,
      lines,
      orderDate: header.orderDate ? header.orderDate.toISOString() : undefined,
      expectedDeliveryDate: header.expectedDeliveryDate ? header.expectedDeliveryDate.toISOString() : undefined,
      receivedAt: header.receivedAt ? header.receivedAt.toISOString() : undefined,
      status: header.status,
      currencyId: header.currencyId ?? undefined,
      globalFreight: header.globalFreight ?? undefined,
      globalExtraCosts: header.globalExtraCosts ?? undefined,
      notes: header.notes?.trim() || undefined,
    };

    const request$ = this.isEditMode && this.order?.id
      ? this.purchasesService.updatePurchaseOrder(this.order.id, payload)
      : this.purchasesService.createPurchaseOrder(payload);

    request$.subscribe({
      next: () => {
        this.saving = false;
        this.messageService.add({
          severity: 'success',
          summary: 'Pedidos',
          detail: this.isEditMode ? 'Pedido actualizado correctamente.' : 'Pedido creado correctamente.',
        });
        this.saved.emit();
      },
      error: () => {
        this.saving = false;
        this.showError(this.isEditMode ? 'No se pudo actualizar el pedido.' : 'No se pudo crear el pedido.');
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
        if (this.isViewMode && this.order?.supplierId) {
          this.selectedProviderId = this.order.supplierId;
          this.applyOrder(this.order);
          this.disableFormsForView();
          return;
        }
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
    if (this.isViewMode) {
      return;
    }
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
      lastCurrency: item.currency ?? this.defaultCurrencyId ?? null,
      packagingId: this.defaultPackagingId ?? '',
    }));

    this.linesFormArray.clear();
    this.lineItems.forEach((item) => {
    this.linesFormArray.push(
      this.fb.group({
        packagingId: this.fb.control<string | null>(this.defaultPackagingId, {
          validators: [Validators.required],
        }),
        packagingMultiplier: this.fb.control<number | null>(
          this.resolvePackagingMultiplier(this.defaultPackagingId),
          { validators: [Validators.min(1)] },
        ),
        qty: this.fb.control<number | null>(0, { validators: [Validators.min(0)] }),
        unitCost: this.fb.control<number | null>(item.lastCost ?? null, { validators: [Validators.min(0)] }),
        currency: this.fb.control<string | null>(item.lastCurrency ?? this.defaultCurrencyId ?? null),
        freightCost: this.fb.control<number | null>(null, { validators: [Validators.min(0)] }),
        extraCosts: this.fb.control<number | null>(null, { validators: [Validators.min(0)] }),
        notes: this.fb.control<string | null>(null),
      }) as LineFormGroup,
    );
    });
    this.recalculateTotal();
  }

  private resetLines(): void {
    this.lineItems = [];
    this.drafts = [];
    this.linesFormArray.clear();
    this.orderTotal = 0;
  }

  private preloadVariants(): void {
    this.lookupService.searchVariants('').subscribe({
      next: () => undefined,
      error: () => undefined,
    });
  }

  private loadCurrencies(): void {
    const context = this.activeContextState.getActiveContext();
    const organizationId = context.organizationId ?? null;
    const companyId = context.companyId ?? null;
    const enterpriseId = context.enterpriseId ?? null;

    if (!organizationId || !companyId) {
      this.currencyOptions = [];
      this.defaultCurrencyId = context.currencyId ?? null;
      this.setHeaderCurrencyControlState(false);
      return;
    }

    forkJoin({
      company: this.companiesApi.getById(companyId),
      core: this.organizationCoreApi.getCoreSettings(organizationId),
    }).subscribe({
      next: ({ company, core }) => {
        const companyData = company.result ?? null;
        const coreCurrencies = core.result?.currencies ?? [];
        const allIds = coreCurrencies.map((currency) => currency.id);
        this.currencyOptions = this.buildCurrencyOptions(allIds, coreCurrencies);
        this.defaultCurrencyId = this.resolveDefaultCurrencyId(
          context.currencyId ?? null,
          allIds,
          companyData,
          enterpriseId,
          coreCurrencies,
        );
        this.setHeaderCurrencyControlState(this.currencyOptions.length > 0);
        this.applyDefaultCurrencyToHeader();
        this.applyDefaultCurrencyToLines();
      },
      error: () => {
        this.currencyOptions = [];
        this.defaultCurrencyId = context.currencyId ?? null;
        this.setHeaderCurrencyControlState(false);
      },
    });
  }

  private loadPackagingNames(): void {
    const organizationId = this.organizationId ?? undefined;
    if (!organizationId) {
      this.packagingOptions = [];
      this.packagingById.clear();
      this.defaultPackagingId = null;
      return;
    }
    this.packagingNamesApi.list(organizationId).subscribe({
      next: ({ result }) => {
        const list = Array.isArray(result) ? result : [];
        this.packagingOptions = list.map((item) => ({
          value: item.id,
          label: this.formatPackagingLabel(item),
          multiplier: item.multiplier ?? 1,
          variableMultiplier: item.variableMultiplier ?? false,
        }));
        this.packagingById = new Map(this.packagingOptions.map((item) => [item.value, item]));
        this.defaultPackagingId = this.resolveDefaultPackagingId(list);
        this.ensureLinePackagingDefaults();
      },
      error: () => {
        this.packagingOptions = [];
        this.packagingById.clear();
        this.defaultPackagingId = null;
      },
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

  private applyDefaultCurrencyToLines(): void {
    const defaultCurrency = this.defaultCurrencyId;
    if (!defaultCurrency) {
      return;
    }
    this.linesFormArray.controls.forEach((group) => {
      const current = group.controls.currency.value;
      if (!current) {
        group.controls.currency.setValue(defaultCurrency);
      }
    });
  }

  private applyDefaultCurrencyToHeader(): void {
    const current = this.headerForm.controls.currencyId.value;
    const defaultCurrency = this.defaultCurrencyId;
    if (!current && defaultCurrency) {
      this.headerForm.controls.currencyId.setValue(defaultCurrency);
    }
  }

  private disableFormsForView(): void {
    this.headerForm.disable({ emitEvent: false });
    this.orderForm.disable({ emitEvent: false });
  }

  private enableFormsForEdit(): void {
    this.headerForm.enable({ emitEvent: false });
    this.orderForm.enable({ emitEvent: false });
  }

  private applyOrder(order: PurchaseOrder): void {
    this.selectedProviderId = order.supplierId ?? this.selectedProviderId;
    this.headerForm.reset({
      orderDate: order.createdAt ? new Date(order.createdAt) : new Date(),
      expectedDeliveryDate: order.expectedDeliveryDate ? new Date(order.expectedDeliveryDate) : null,
      receivedAt: order.receivedAt ? new Date(order.receivedAt) : null,
      status: (order.status as PurchaseOrderStatus) ?? 'DRAFT',
      currencyId: order.currencyId ?? this.defaultCurrencyId ?? null,
      globalFreight: order.globalFreight ?? null,
      globalExtraCosts: order.globalExtraCosts ?? null,
      notes: order.notes ?? null,
    });

    this.lineItems = (order.lines ?? []).map((line) => ({
      variantId: line.variantId,
      variantLabel: this.lookupService.getVariantById(line.variantId)?.name ?? line.variantId,
      lastCost: line.unitCost ?? null,
      lastCurrency: line.currency ?? null,
      packagingId: line.packagingId ?? line.packagingNameId ?? this.defaultPackagingId ?? '',
    }));

    this.linesFormArray.clear();
    this.lineItems.forEach((item, index) => {
      const line = order.lines?.[index];
      this.linesFormArray.push(
        this.fb.group({
          packagingId: this.fb.control<string | null>(
            line?.packagingId ?? line?.packagingNameId ?? this.defaultPackagingId,
            { validators: [Validators.required] },
          ),
          packagingMultiplier: this.fb.control<number | null>(
            line?.packagingMultiplier ??
              line?.packagingMultiplierSnapshot ??
              this.resolvePackagingMultiplier(line?.packagingId ?? line?.packagingNameId),
            { validators: [Validators.min(1)] },
          ),
          qty: this.fb.control<number | null>(line?.quantity ?? 0, { validators: [Validators.min(0)] }),
          unitCost: this.fb.control<number | null>(line?.unitCost ?? null, { validators: [Validators.min(0)] }),
          currency: this.fb.control<string | null>(line?.currency ?? this.defaultCurrencyId ?? null),
          freightCost: this.fb.control<number | null>(line?.freightCost ?? null, { validators: [Validators.min(0)] }),
          extraCosts: this.fb.control<number | null>(line?.extraCosts ?? null, { validators: [Validators.min(0)] }),
          notes: this.fb.control<string | null>(line?.notes ?? null),
        }) as LineFormGroup,
      );
    });

    this.orderTotal = typeof order.total === 'number' ? order.total : this.orderTotal;
    if (this.orderTotal === 0) {
      this.recalculateTotal();
    }
  }

  private setHeaderCurrencyControlState(enabled: boolean): void {
    if (enabled) {
      this.headerForm.controls.currencyId.enable({ emitEvent: false });
      return;
    }
    this.headerForm.controls.currencyId.disable({ emitEvent: false });
    this.headerForm.controls.currencyId.setValue(null, { emitEvent: false });
  }

  private bindHeaderChanges(): void {
    this.headerForm.controls.status.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((status) => {
        if (status === 'RECEIVED') {
          this.headerForm.controls.receivedAt.enable({ emitEvent: false });
          if (!this.headerForm.controls.receivedAt.value) {
            this.headerForm.controls.receivedAt.setValue(new Date());
          }
        } else {
          this.headerForm.controls.receivedAt.disable({ emitEvent: false });
          this.headerForm.controls.receivedAt.setValue(null, { emitEvent: false });
        }
      });

    this.headerForm.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.recalculateTotal();
      });
  }

  private recalculateTotal(): void {
    const linesTotal = this.linesFormArray.controls.reduce((acc, group) => {
      const raw = group.getRawValue();
      const qty = raw.qty ?? 0;
      const unitCost = raw.unitCost ?? 0;
      const freight = raw.freightCost ?? 0;
      const extras = raw.extraCosts ?? 0;
      return acc + qty * unitCost + freight + extras;
    }, 0);

    const header = this.headerForm.getRawValue();
    const globalFreight = header.globalFreight ?? 0;
    const globalExtras = header.globalExtraCosts ?? 0;
    this.orderTotal = linesTotal + globalFreight + globalExtras;
  }

  private resolveAllowedCurrencyIds(
    company: Company | null,
    enterpriseId: string | null,
    coreCurrencies: CoreCurrency[],
  ): string[] {
    const normalizedEnterpriseId = this.normalizeId(enterpriseId);
    const enterprise = normalizedEnterpriseId
      ? this.findEnterprise(company, normalizedEnterpriseId)
      : null;
    const ids =
      enterprise?.currencyIds?.length
        ? enterprise.currencyIds
        : company?.currencies?.length
          ? company.currencies
          : coreCurrencies.map((currency) => currency.id);
    return this.normalizeCurrencyList(ids, coreCurrencies);
  }

  private resolveDefaultCurrencyId(
    contextCurrencyId: string | null,
    allowedIds: string[],
    company: Company | null,
    enterpriseId: string | null,
    coreCurrencies: CoreCurrency[],
  ): string | null {
    const normalizedAllowed = this.normalizeCurrencyList(allowedIds, coreCurrencies);
    const normalizedContext = this.normalizeCurrencyId(contextCurrencyId, coreCurrencies);
    if (normalizedContext && normalizedAllowed.includes(normalizedContext)) {
      return normalizedContext;
    }

    const enterprise = enterpriseId ? this.findEnterprise(company, enterpriseId) : null;
    const enterpriseDefault = this.normalizeCurrencyId(enterprise?.defaultCurrencyId ?? null, coreCurrencies);
    if (enterpriseDefault && normalizedAllowed.includes(enterpriseDefault)) {
      return enterpriseDefault;
    }

    const companyDefault = this.normalizeCurrencyId(
      company?.defaultCurrencyId ?? company?.baseCurrencyId ?? null,
      coreCurrencies,
    );
    if (companyDefault && normalizedAllowed.includes(companyDefault)) {
      return companyDefault;
    }

    return normalizedAllowed[0] ?? null;
  }

  private buildCurrencyOptions(allowedIds: string[], coreCurrencies: CoreCurrency[]): SelectOption[] {
    const normalizedAllowed = this.normalizeCurrencyList(allowedIds, coreCurrencies);
    if (coreCurrencies.length === 0) {
      return normalizedAllowed.map((id) => ({ value: id, label: id }));
    }
    return normalizedAllowed.map((id) => ({
      value: id,
      label: this.resolveCurrencyLabel(id, coreCurrencies),
    }));
  }

  private resolveCurrencyLabel(id: string, coreCurrencies: CoreCurrency[]): string {
    const currency = coreCurrencies.find((item) => item.id === id || item.code?.toUpperCase() === id.toUpperCase());
    if (!currency) {
      return id;
    }
    return currency.symbol
      ? `${currency.name.toUpperCase()} (${currency.symbol})`
      : `${currency.name.toUpperCase()} (${currency.code})`;
  }

  private normalizeCurrencyList(values: string[] | undefined, coreCurrencies: CoreCurrency[]): string[] {
    const normalized = (values ?? [])
      .map((value) => this.normalizeCurrencyId(value, coreCurrencies))
      .filter((value): value is string => Boolean(value));
    return Array.from(new Set(normalized));
  }

  private normalizeCurrencyId(value: string | null | undefined, coreCurrencies: CoreCurrency[]): string | null {
    const trimmed = typeof value === 'string' ? value.trim() : '';
    if (!trimmed) {
      return null;
    }
    const directMatch = coreCurrencies.find((currency) => currency.id === trimmed);
    if (directMatch) {
      return directMatch.id;
    }
    const upper = trimmed.toUpperCase();
    const codeMatch = coreCurrencies.find((currency) => currency.code?.toUpperCase() === upper);
    if (codeMatch) {
      return codeMatch.id;
    }
    return trimmed;
  }

  private normalizeId(value: string | null | undefined): string | null {
    const trimmed = typeof value === 'string' ? value.trim() : '';
    return trimmed.length > 0 ? trimmed : null;
  }

  private findEnterprise(company: Company | null, enterpriseId: string): CompanyEnterprise | null {
    if (!company?.enterprises?.length) {
      return null;
    }
    return (
      company.enterprises.find((enterprise) => this.normalizeId(enterprise.id) === enterpriseId) ??
      company.enterprises.find((enterprise) => this.normalizeId(enterprise._id ?? null) === enterpriseId) ??
      null
    );
  }

  private formatPackagingLabel(item: PackagingName): string {
    const multiplier = item.multiplier ?? 1;
    return `${item.name} (x${multiplier})`;
  }

  private resolveDefaultPackagingId(list: PackagingName[]): string | null {
    const unit = list.find((item) => item.name.toLowerCase() === 'unidad' || item.multiplier === 1);
    return unit?.id ?? list[0]?.id ?? null;
  }

  private resolvePackagingMultiplier(packagingId: string | null | undefined): number {
    if (!packagingId) {
      return 1;
    }
    const option = this.packagingById.get(packagingId);
    return option?.multiplier ?? 1;
  }

  private ensureLinePackagingDefaults(): void {
    if (!this.defaultPackagingId) {
      return;
    }
    this.lineItems = this.lineItems.map((line) => ({
      ...line,
      packagingId: line.packagingId || this.defaultPackagingId || '',
    }));
    this.linesFormArray.controls.forEach((group) => {
      if (!group.controls.packagingId.value) {
        group.controls.packagingId.setValue(this.defaultPackagingId, { emitEvent: false });
        group.controls.packagingMultiplier.setValue(
          this.resolvePackagingMultiplier(this.defaultPackagingId),
          { emitEvent: false },
        );
      }
    });
  }
}
