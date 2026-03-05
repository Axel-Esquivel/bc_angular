import { Injectable } from '@angular/core';
import { map, Observable, of, tap } from 'rxjs';

import { VariantsApiService } from '../../../core/api/variants-api.service';
import { ActiveContextStateService } from '../../../core/context/active-context-state.service';
import { ProductVariant } from '../../../shared/models/product-variant.model';

export interface VariantOption {
  id: string;
  productId: string;
  name: string;
  sku?: string;
  barcode?: string;
  label: string;
}

@Injectable({ providedIn: 'root' })
export class VariantsLookupService {
  private readonly cache = new Map<string, VariantOption>();

  constructor(
    private readonly variantsApi: VariantsApiService,
    private readonly activeContextState: ActiveContextStateService,
  ) {}

  searchVariants(term: string): Observable<VariantOption[]> {
    const organizationId = this.activeContextState.getActiveContext().organizationId ?? undefined;
    if (!organizationId) {
      return of([]);
    }

    const needle = term.trim().toLowerCase();
    return this.variantsApi.listAll({ organizationId }).pipe(
      map((response) => response.result ?? []),
      map((variants: ProductVariant[]) =>
        variants.filter((variant) => {
          if (!needle) {
            return true;
          }
          const name = variant.name?.toLowerCase() ?? '';
          const sku = variant.sku?.toLowerCase() ?? '';
          const barcodes = Array.isArray(variant.barcodes)
            ? variant.barcodes.map((code) => code.toLowerCase())
            : [];
          const barcodeMatch = barcodes.some((code) => code.includes(needle));
          return name.includes(needle) || sku.includes(needle) || barcodeMatch;
        }),
      ),
      map((variants) => variants.slice(0, 20)),
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

  private mapVariantOption(variant: ProductVariant): VariantOption {
    const barcode =
      Array.isArray(variant.barcodes) && variant.barcodes.length > 0 ? variant.barcodes[0] : undefined;
    return {
      id: variant.id,
      productId: variant.productId,
      name: variant.name,
      sku: variant.sku ?? undefined,
      barcode,
      label: this.buildLabel(variant.name, variant.sku ?? undefined, barcode),
    };
  }

  private buildLabel(name: string, sku?: string, barcode?: string): string {
    const parts = [sku, barcode, name].filter((value): value is string => Boolean(value && value.trim()));
    return parts.join(' · ');
  }
}
