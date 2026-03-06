import { Injectable } from '@angular/core';
import { map, Observable, of, tap } from 'rxjs';

import { VariantsApiService } from '../../core/api/variants-api.service';
import { ActiveContextStateService } from '../../core/context/active-context-state.service';
import { ProductVariant } from '../models/product-variant.model';

export interface VariantLookupFilters {
  term?: string;
  categoryId?: string;
  organizationId?: string;
  companyId?: string;
  page?: number;
  limit?: number;
}

export interface VariantOption {
  id: string;
  name: string;
  sku?: string | null;
  barcode?: string | null;
  categoryName?: string | null;
  productName?: string | null;
  label: string;
}

@Injectable({ providedIn: 'root' })
export class VariantsLookupService {
  private readonly cache = new Map<string, VariantOption>();

  constructor(
    private readonly variantsApi: VariantsApiService,
    private readonly activeContextState: ActiveContextStateService,
  ) {}

  searchVariants(filters: VariantLookupFilters = {}): Observable<VariantOption[]> {
    const context = this.activeContextState.getActiveContext();
    const organizationId = filters.organizationId ?? context.organizationId ?? undefined;
    if (!organizationId) {
      return of([]);
    }

    const term = (filters.term ?? '').trim().toLowerCase();
    const limit = typeof filters.limit === 'number' && filters.limit > 0 ? filters.limit : 50;
    const page = typeof filters.page === 'number' && filters.page > 0 ? filters.page : 1;

    return this.variantsApi.listAll({ organizationId }).pipe(
      map((response) => response.result ?? []),
      map((variants: ProductVariant[]) => this.filterVariants(variants, term)),
      map((variants) => this.paginate(variants, page, limit)),
      map((variants) => variants.map((variant) => this.mapVariantOption(variant))),
      tap((options) => {
        options.forEach((option) => {
          this.cache.set(option.id, option);
        });
      }),
    );
  }

  getVariantById(id: string): VariantOption | undefined {
    return this.cache.get(id);
  }

  private filterVariants(variants: ProductVariant[], term: string): ProductVariant[] {
    if (!term) {
      return variants;
    }
    return variants.filter((variant) => {
      const name = variant.name?.toLowerCase() ?? '';
      const sku = variant.sku?.toLowerCase() ?? '';
      const barcodes = Array.isArray(variant.barcodes)
        ? variant.barcodes.map((code) => code.toLowerCase())
        : [];
      const barcodeMatch = barcodes.some((code) => code.includes(term));
      return name.includes(term) || sku.includes(term) || barcodeMatch;
    });
  }

  private paginate(items: ProductVariant[], page: number, limit: number): ProductVariant[] {
    const start = (page - 1) * limit;
    return items.slice(start, start + limit);
  }

  private mapVariantOption(variant: ProductVariant): VariantOption {
    const barcode =
      Array.isArray(variant.barcodes) && variant.barcodes.length > 0 ? variant.barcodes[0] : null;
    return {
      id: variant.id,
      name: variant.name,
      sku: variant.sku ?? null,
      barcode,
      categoryName: null,
      productName: null,
      label: this.buildLabel(variant.name, variant.sku ?? null, barcode),
    };
  }

  private buildLabel(name: string, sku?: string | null, barcode?: string | null): string {
    const parts = [sku, barcode, name].filter((value): value is string => Boolean(value && value.trim()));
    return parts.join(' · ');
  }
}

