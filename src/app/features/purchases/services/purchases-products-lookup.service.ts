import { Injectable } from '@angular/core';
import { map, Observable, of, tap } from 'rxjs';

import { VariantsApiService } from '../../../core/api/variants-api.service';
import { ActiveContextStateService } from '../../../core/context/active-context-state.service';
import { ProductVariant } from '../../../shared/models/product-variant.model';

export interface VariantOption {
  id: string;
  name: string;
  sku?: string;
}

@Injectable({ providedIn: 'root' })
export class PurchasesProductsLookupService {
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
          return name.includes(needle) || sku.includes(needle);
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
    return {
      id: variant.id,
      name: variant.name,
      sku: variant.sku ?? undefined,
    };
  }
}
