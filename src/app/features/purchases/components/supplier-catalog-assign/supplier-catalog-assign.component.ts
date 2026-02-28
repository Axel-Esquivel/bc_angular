import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, inject } from '@angular/core';
import { MessageService } from 'primeng/api';

import { PurchasesService } from '../../services/purchases.service';
import {
  CreateSupplierCatalogDto,
  SupplierCatalogItem,
  SupplierCatalogStatus,
} from '../../../../shared/models/supplier-catalog.model';
import { PurchasesProductsLookupService, VariantOption } from '../../services/purchases-products-lookup.service';

interface VariantOptionDisplay extends VariantOption {
  display: string;
}

@Component({
  selector: 'app-supplier-catalog-assign',
  standalone: false,
  templateUrl: './supplier-catalog-assign.component.html',
  styleUrl: './supplier-catalog-assign.component.scss',
  providers: [MessageService],
})
export class SupplierCatalogAssignComponent implements OnInit, OnChanges {
  private readonly purchasesService = inject(PurchasesService);
  private readonly lookupService = inject(PurchasesProductsLookupService);
  private readonly messageService = inject(MessageService);

  @Input() organizationId!: string;
  @Input() companyId!: string;
  @Input() supplierId!: string;

  @Output() saved = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  items: SupplierCatalogItem[] = [];
  loading = false;
  saving = false;

  selectedVariant: VariantOptionDisplay | null = null;
  variantSuggestions: VariantOptionDisplay[] = [];

  ngOnInit(): void {
    this.loadCatalog();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['supplierId'] || changes['organizationId'] || changes['companyId']) {
      this.loadCatalog();
    }
  }

  onSearch(event: { query: string }): void {
    const term = event.query ?? '';
    this.lookupService.searchVariants(term).subscribe({
      next: (options) => {
        this.variantSuggestions = options.map((option) => ({
          ...option,
          display: this.formatOption(option),
        }));
      },
      error: () => {
        this.variantSuggestions = [];
      },
    });
  }

  onVariantSelect(event: { value: VariantOptionDisplay }): void {
    this.selectedVariant = event.value;
  }

  addSelectedVariant(): void {
    if (!this.organizationId || !this.companyId || !this.supplierId) {
      this.showError('Falta contexto para asignar.');
      return;
    }
    if (!this.selectedVariant) {
      this.showError('Selecciona una variante.');
      return;
    }

    const exists = this.items.some((item) => item.variantId === this.selectedVariant?.id);
    if (exists) {
      this.showError('La variante ya esta asignada al proveedor.');
      return;
    }

    const payload: CreateSupplierCatalogDto = {
      supplierId: this.supplierId,
      variantId: this.selectedVariant.id,
      unitCost: 0,
      status: 'active',
    };

    this.saving = true;
    this.purchasesService
      .createSupplierCatalog({
        ...payload,
        OrganizationId: this.organizationId,
        companyId: this.companyId,
      })
      .subscribe({
        next: ({ result }) => {
          if (result) {
            this.items = [result, ...this.items];
          }
          this.saving = false;
          this.selectedVariant = null;
          this.saved.emit();
        },
        error: () => {
          this.saving = false;
          this.showError('No se pudo asignar el producto.');
        },
      });
  }

  removeItem(item: SupplierCatalogItem): void {
    if (!item.id) {
      return;
    }
    this.purchasesService.deleteSupplierCatalog(item.id, this.organizationId, this.companyId).subscribe({
      next: () => {
        this.items = this.items.filter((row) => row.id !== item.id);
        this.saved.emit();
      },
      error: () => {
        this.showError('No se pudo eliminar el item.');
      },
    });
  }

  close(): void {
    this.cancel.emit();
  }

  getVariantLabel(variantId: string): string {
    return this.lookupService.getVariantById(variantId)?.name ?? variantId;
  }

  resolveStatusLabel(status?: SupplierCatalogStatus): string {
    return status === 'inactive' ? 'Inactivo' : 'Activo';
  }

  private loadCatalog(): void {
    if (!this.organizationId || !this.companyId || !this.supplierId) {
      this.items = [];
      return;
    }
    this.loading = true;
    this.purchasesService
      .listSupplierCatalog({
        OrganizationId: this.organizationId,
        companyId: this.companyId,
        supplierId: this.supplierId,
      })
      .subscribe({
        next: ({ result }) => {
          this.items = Array.isArray(result) ? result : [];
          this.loading = false;
        },
        error: () => {
          this.items = [];
          this.loading = false;
          this.showError('No se pudo cargar el catalogo.');
        },
      });
  }

  private formatOption(option: VariantOption): string {
    return option.sku ? `${option.name} (${option.sku})` : option.name;
  }

  private showError(detail: string): void {
    this.messageService.add({
      severity: 'error',
      summary: 'Catalogo proveedor-producto',
      detail,
    });
  }
}

