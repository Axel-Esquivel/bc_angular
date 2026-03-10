import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
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
import { PrepaidApiService } from '../../../../core/api/prepaid-api.service';
import { ProductsApiService } from '../../../../core/api/products-api.service';
import { OrganizationsService } from '../../../../core/api/organizations-api.service';
import { OrganizationModuleOverviewItem } from '../../../../shared/models/organization-modules.model';
import { PrepaidVariantConfig } from '../../../../shared/models/prepaid.model';
import { PriceListsService } from '../../../price-lists/services/price-lists.service';
import { PriceList } from '../../../price-lists/models/price-list.model';

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
  private readonly prepaidApi = inject(PrepaidApiService);
  private readonly organizationsApi = inject(OrganizationsService);
  private readonly priceListsService = inject(PriceListsService);
  private readonly productsApi = inject(ProductsApiService);
  private readonly fb = inject(FormBuilder);

  products: PosProduct[] = [];
  productsLoading = false;
  priceLists: PriceList[] = [];
  priceListOptions: SelectOption[] = [];
  selectedPriceListId: string | null = null;
  defaultPriceListId: string | null = null;
  priceListsLoading = false;
  priceListsEnabled = false;
  cartLines: PosCartLine[] = [];
  total = 0;
  sessionId: string | null = null;
  warehouseOptions: Warehouse[] = [];
  selectedWarehouseId: string | null = null;
  readonly stockByVariant = new Map<string, number>();
  private context: ActiveContext | null = null;
  private readonly prepaidConfigByVariant = new Map<string, PrepaidVariantConfig>();
  private readonly basePriceByVariant = new Map<string, number>();
  prepaidDialogVisible = false;
  prepaidDialogLockedDenomination = false;
  pendingPrepaidProduct: PosProduct | null = null;
  prepaidEnabled = false;

  readonly prepaidForm = this.fb.nonNullable.group({
    phoneNumber: ['', Validators.required],
    denomination: [0, [Validators.min(0)]],
  });

  ngOnInit(): void {
    const context = this.activeContext.getActiveContext();
    if (!this.activeContext.isComplete(context)) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Contexto incompleto',
        detail: 'Selecciona organizacin, empresa y sucursal antes de usar POS.',
      });
      return;
    }

    this.context = context;
    this.loadModuleAvailability();
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
          detail: 'La venta se confirm correctamente.',
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
    const prepaidConfig = this.prepaidEnabled ? this.prepaidConfigByVariant.get(product.id) : undefined;
    if (prepaidConfig) {
      this.pendingPrepaidProduct = product;
      this.prepaidDialogLockedDenomination = prepaidConfig.denomination > 0;
      this.prepaidForm.reset({
        phoneNumber: '',
        denomination: prepaidConfig.denomination ?? 0,
      });
      this.prepaidDialogVisible = true;
      return;
    }
    this.addOrUpdateLine(product);
  }

  onQuantityChange(lineId: string, quantity: number): void {
    const safeQuantity = quantity > 0 ? quantity : 1;
    this.cartLines = this.cartLines.map((line) =>
      line.productId === lineId
        ? this.withResolvedPrice(line, safeQuantity)
        : line,
    );
    this.requestResolvedPrice(lineId, safeQuantity);
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
        detail: 'No se puede confirmar la venta sin sesin abierta y almacn.',
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
        phoneNumber: line.prepaid?.phoneNumber,
        denomination: line.prepaid?.denomination,
        prepaidProviderId: line.prepaid?.providerId,
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

  confirmPrepaidLine(): void {
    if (this.prepaidForm.invalid || !this.pendingPrepaidProduct) {
      this.prepaidForm.markAllAsTouched();
      return;
    }
    const product = this.pendingPrepaidProduct;
    const config = this.prepaidConfigByVariant.get(product.id);
    const prepaid = {
      phoneNumber: this.prepaidForm.controls.phoneNumber.value.trim(),
      denomination: this.prepaidForm.controls.denomination.value,
      providerId: config?.providerId,
    };
    this.addOrUpdateLine(product, prepaid);
    this.pendingPrepaidProduct = null;
    this.prepaidDialogVisible = false;
  }

  cancelPrepaidLine(): void {
    this.pendingPrepaidProduct = null;
    this.prepaidDialogVisible = false;
  }

  private recalculateTotals(): void {
    this.total = this.cartLines.reduce((acc, line) => acc + line.subtotal, 0);
  }

  private addOrUpdateLine(product: PosProduct, prepaid?: PosCartLine['prepaid']): void {
    this.registerBasePrice(product);
    const existing = this.cartLines.find((line) => line.productId === product.id);
    if (existing) {
      const nextQuantity = existing.quantity + 1;
      this.cartLines = this.cartLines.map((line) =>
        line.productId === product.id
          ? {
              ...line,
              quantity: nextQuantity,
              unitPrice: existing.unitPrice,
              subtotal: nextQuantity * existing.unitPrice,
              prepaid: prepaid ?? line.prepaid,
            }
          : line
      );
      this.requestResolvedPrice(product.id, nextQuantity, existing.unitPrice);
    } else {
      this.cartLines = [
        ...this.cartLines,
        {
          productId: product.id,
          productName: product.name,
          quantity: 1,
          unitPrice: product.price,
          subtotal: product.price,
          prepaid,
        },
      ];
      this.requestResolvedPrice(product.id, 1, product.price);
    }
    this.recalculateTotals();
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

  private loadPrepaidConfigs(): void {
    if (!this.prepaidEnabled) {
      this.prepaidConfigByVariant.clear();
      return;
    }
    if (!this.context?.organizationId || !this.context?.enterpriseId) {
      return;
    }
    this.prepaidApi
      .listVariantConfigs({
        organizationId: this.context.organizationId,
        enterpriseId: this.context.enterpriseId,
      })
      .subscribe({
        next: (response) => {
          const configs = response.result ?? [];
          this.prepaidConfigByVariant.clear();
          configs.forEach((config) => {
            if (config.isActive && config.variantId) {
              this.prepaidConfigByVariant.set(config.variantId, config);
            }
          });
        },
        error: () => {
          this.prepaidConfigByVariant.clear();
        },
      });
  }

  onPriceListChange(): void {
    this.applyPriceListToCart();
  }

  private loadPriceLists(): void {
    if (!this.priceListsEnabled) {
      this.priceLists = [];
      this.priceListOptions = [];
      this.selectedPriceListId = null;
      return;
    }
    if (!this.context?.organizationId || !this.context?.companyId) {
      this.priceLists = [];
      this.priceListOptions = [];
      this.selectedPriceListId = null;
      return;
    }
    this.priceListsLoading = true;
    this.priceListsService.list().subscribe({
      next: ({ result }) => {
        const list = Array.isArray(result) ? result : [];
        this.priceLists = list.filter(
          (item) =>
            item.OrganizationId === this.context?.organizationId &&
            item.companyId === this.context?.companyId,
        );
        this.priceListOptions = this.priceLists.map((item) => ({
          label: item.name,
          value: item.id,
        }));
        this.applyDefaultPriceListSelection();
        this.applyPriceListToCart();
        this.priceListsLoading = false;
      },
      error: () => {
        this.priceLists = [];
        this.priceListOptions = [];
        this.selectedPriceListId = null;
        this.priceListsLoading = false;
      },
    });
  }

  private loadDefaultPriceList(): void {
    if (!this.priceListsEnabled) {
      this.defaultPriceListId = null;
      return;
    }
    if (!this.context?.organizationId || !this.context?.companyId) {
      this.defaultPriceListId = null;
      return;
    }
    this.organizationsApi.getById(this.context.organizationId).subscribe({
      next: ({ result }) => {
        const settings = result?.moduleSettings?.['price-lists'] as {
          defaultByCompanyId?: Record<string, string | null>;
        } | null;
        const companyId = this.context?.companyId ?? null;
        if (!companyId) {
          this.defaultPriceListId = null;
          return;
        }
        const current = settings?.defaultByCompanyId?.[companyId] ?? null;
        this.defaultPriceListId = typeof current === 'string' && current.trim() ? current.trim() : null;
        this.applyDefaultPriceListSelection();
        this.applyPriceListToCart();
      },
      error: () => {
        this.defaultPriceListId = null;
      },
    });
  }

  private applyDefaultPriceListSelection(): void {
    if (!this.priceLists || this.priceLists.length === 0) {
      this.selectedPriceListId = null;
      return;
    }
    if (this.defaultPriceListId) {
      const exists = this.priceLists.some((item) => item.id === this.defaultPriceListId);
      if (exists) {
        this.selectedPriceListId = this.defaultPriceListId;
        return;
      }
    }
    if (!this.selectedPriceListId) {
      this.selectedPriceListId = this.priceLists[0]?.id ?? null;
    }
  }

  private applyPriceListToCart(): void {
    if (!this.priceListsEnabled) {
      return;
    }
    if (this.cartLines.length === 0) {
      return;
    }
    this.cartLines = this.cartLines.map((line) => this.withResolvedPrice(line, line.quantity));
    this.cartLines.forEach((line) => {
      this.requestResolvedPrice(line.productId, line.quantity, line.unitPrice);
    });
    this.recalculateTotals();
  }

  private withResolvedPrice(line: PosCartLine, quantity: number): PosCartLine {
    const basePrice = this.basePriceByVariant.get(line.productId) ?? line.unitPrice;
    return {
      ...line,
      quantity,
      unitPrice: basePrice,
      subtotal: quantity * basePrice,
    };
  }

  private registerBasePrice(product: PosProduct): void {
    if (!this.basePriceByVariant.has(product.id)) {
      this.basePriceByVariant.set(product.id, product.price);
    }
  }

  private requestResolvedPrice(variantId: string, quantity: number, fallbackPrice?: number): void {
    if (!this.priceListsEnabled) {
      return;
    }
    if (!this.context?.organizationId || !this.context?.companyId) {
      return;
    }
    this.productsApi
      .resolvePrice({
        OrganizationId: this.context.organizationId,
        companyId: this.context.companyId,
        enterpriseId: this.context.enterpriseId ?? undefined,
        variantId,
        quantity,
        priceListId: this.selectedPriceListId ?? undefined,
        fallbackPrice,
      })
      .subscribe({
        next: ({ result }) => {
          if (!result) {
            return;
          }
          this.cartLines = this.cartLines.map((line) =>
            line.productId === variantId
              ? {
                  ...line,
                  unitPrice: result.unitPrice,
                  subtotal: line.quantity * result.unitPrice,
                }
              : line,
          );
          this.recalculateTotals();
        },
        error: () => undefined,
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
          this.handleError(error, 'No se pudo abrir sesin POS');
        },
      });
  }

  private loadModuleAvailability(): void {
    if (!this.context?.organizationId) {
      this.prepaidEnabled = false;
      this.priceListsEnabled = false;
      return;
    }
    this.organizationsApi.getModulesOverview(this.context.organizationId).subscribe({
      next: ({ result }) => {
        const modules = result?.modules ?? [];
        this.prepaidEnabled = this.isModuleEnabled(modules, 'prepaid');
        this.priceListsEnabled = this.isModuleEnabled(modules, 'price-lists');
        if (this.priceListsEnabled) {
          this.loadDefaultPriceList();
          this.loadPriceLists();
        } else {
          this.priceLists = [];
          this.priceListOptions = [];
          this.selectedPriceListId = null;
        }
        if (this.prepaidEnabled) {
          this.loadPrepaidConfigs();
        } else {
          this.prepaidConfigByVariant.clear();
        }
      },
      error: () => {
        this.prepaidEnabled = false;
        this.priceListsEnabled = false;
        this.priceLists = [];
        this.priceListOptions = [];
        this.selectedPriceListId = null;
        this.prepaidConfigByVariant.clear();
      },
    });
  }

  private isModuleEnabled(modules: OrganizationModuleOverviewItem[], key: string): boolean {
    const module = modules.find((item) => item.key === key);
    return module ? module.state?.status !== 'disabled' : false;
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

interface SelectOption {
  label: string;
  value: string;
}

