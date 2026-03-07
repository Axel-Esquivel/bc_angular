import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, inject } from '@angular/core';
import { MessageService } from 'primeng/api';

import { PurchasesService } from '../../services/purchases.service';
import {
  CreateSupplierCatalogDto,
  SupplierCatalogItem,
  SupplierCatalogStatus,
} from '../../../../shared/models/supplier-catalog.model';
import { VariantOption, VariantsLookupService } from '../../../../shared/services/variants-lookup.service';

@Component({
  selector: 'app-supplier-catalog-assign',
  standalone: false,
  templateUrl: './supplier-catalog-assign.component.html',
  styleUrl: './supplier-catalog-assign.component.scss',
  providers: [MessageService],
})
export class SupplierCatalogAssignComponent implements OnInit, OnChanges {
  private readonly purchasesService = inject(PurchasesService);
  private readonly lookupService = inject(VariantsLookupService);
  private readonly messageService = inject(MessageService);

  @Input() organizationId!: string;
  @Input() companyId!: string;
  @Input() supplierId!: string;

  @Output() saved = new EventEmitter<void>();

  items: SupplierCatalogItem[] = [];
  loading = false;
  saving = false;

  selectedVariantId: string | null = null;
  selectedVariantLabel: string | null = null;
  selectedVariantOption: VariantOption | null = null;

  ngOnInit(): void {
    this.loadCatalog();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['supplierId'] || changes['organizationId'] || changes['companyId']) {
      this.loadCatalog();
    }
  }

  onAssignVariantSelected(variant: VariantOption): void {
    this.selectedVariantId = variant.id;
    this.selectedVariantLabel = variant.label;
    this.selectedVariantOption = variant;
  }

  onVariantValueChange(value: string | null): void {
    if (value === null) {
      this.selectedVariantId = null;
      this.selectedVariantLabel = null;
      this.selectedVariantOption = null;
    }
  }

  addSelectedVariant(): void {
    if (!this.organizationId || !this.companyId || !this.supplierId) {
      this.showError('Falta contexto para asignar.');
      return;
    }
    if (!this.selectedVariantOption) {
      this.showError('Selecciona una variante.');
      return;
    }

    const exists = this.items.some((item) => item.variantId === this.selectedVariantOption?.id);
    if (exists) {
      this.showError('La variante ya esta asignada al proveedor.');
      return;
    }

    const payload: CreateSupplierCatalogDto = {
      supplierId: this.supplierId,
      variantId: this.selectedVariantOption.id,
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
          this.selectedVariantId = null;
          this.selectedVariantLabel = null;
          this.selectedVariantOption = null;
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

  private showError(detail: string): void {
    this.messageService.add({
      severity: 'error',
      summary: 'Catalogo proveedor-producto',
      detail,
    });
  }
}
