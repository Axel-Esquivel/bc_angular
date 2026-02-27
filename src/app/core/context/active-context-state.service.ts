import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, catchError, map, of, take } from 'rxjs';

import {
  ActiveContext,
  ActiveContextState,
  createEmptyActiveContext,
} from '../../shared/models/active-context.model';
import { CompaniesApiService } from '../api/companies-api.service';
import { Company, CompanyEnterprise } from '../../shared/models/company.model';

@Injectable({ providedIn: 'root' })
export class ActiveContextStateService {
  private readonly storageKey = 'bc_active_context';
  private readonly contextSubject = new BehaviorSubject<ActiveContext>(this.restore());

  readonly activeContext$: Observable<ActiveContext> = this.contextSubject.asObservable();

  constructor(private readonly companiesApi: CompaniesApiService) {}

  getActiveContext(): ActiveContext {
    return this.contextSubject.value;
  }

  setActiveContext(context: ActiveContext | null | undefined): void {
    const next = context ?? createEmptyActiveContext();
    this.contextSubject.next(next);
    localStorage.setItem(this.storageKey, JSON.stringify(next));
    if (next.organizationId) {
      this.validateEnterpriseSelection(next.organizationId, next.enterpriseId)
        .pipe(take(1))
        .subscribe((resolvedEnterpriseId) => {
          if (resolvedEnterpriseId && resolvedEnterpriseId !== next.enterpriseId) {
            const patched: ActiveContext = {
              ...this.contextSubject.value,
              enterpriseId: resolvedEnterpriseId,
            };
            this.contextSubject.next(patched);
            localStorage.setItem(this.storageKey, JSON.stringify(patched));
          }
        });
    }
  }

  clear(): void {
    this.contextSubject.next(createEmptyActiveContext());
    localStorage.removeItem(this.storageKey);
  }

  clearActiveContext(): void {
    this.clear();
  }

  loadFromStorage(): ActiveContext {
    const restored = this.restore();
    this.contextSubject.next(restored);
    if (restored.organizationId) {
      this.validateEnterpriseSelection(restored.organizationId, restored.enterpriseId)
        .pipe(take(1))
        .subscribe((resolvedEnterpriseId) => {
          if (resolvedEnterpriseId && resolvedEnterpriseId !== restored.enterpriseId) {
            const patched: ActiveContext = {
              ...this.contextSubject.value,
              enterpriseId: resolvedEnterpriseId,
            };
            this.contextSubject.next(patched);
            localStorage.setItem(this.storageKey, JSON.stringify(patched));
          }
        });
    }
    return restored;
  }

  isComplete(context: ActiveContext): boolean {
    return Boolean(
      context.organizationId &&
        context.companyId &&
        context.countryId &&
        context.enterpriseId &&
        context.currencyId,
    );
  }

  hasMinimumContext(context: ActiveContext): context is ActiveContextState {
    return Boolean(
      context.organizationId &&
        context.companyId &&
        context.countryId &&
        context.enterpriseId &&
        context.currencyId,
    );
  }

  private restore(): ActiveContext {
    const raw = localStorage.getItem(this.storageKey);
    if (!raw) {
      return createEmptyActiveContext();
    }

    try {
      const parsed = JSON.parse(raw) as ActiveContext;
      return {
        organizationId: parsed.organizationId ?? null,
        companyId: parsed.companyId ?? null,
        countryId: parsed.countryId ?? null,
        enterpriseId: parsed.enterpriseId ?? null,
        currencyId: parsed.currencyId ?? null,
      };
    } catch {
      localStorage.removeItem(this.storageKey);
      return createEmptyActiveContext();
    }
  }

  validateEnterpriseSelection(
    organizationId: string,
    enterpriseId: string | null,
  ): Observable<string | null> {
    if (!organizationId) {
      return of(null);
    }

    return this.companiesApi.listByOrganization(organizationId).pipe(
      map((response) => response.result ?? []),
      map((companies: Company[]) => {
        const enterprises = companies.flatMap((company) =>
          Array.isArray(company.enterprises) ? company.enterprises : [],
        );
        const current = enterpriseId ?? null;
        const matchesCurrent =
          current && enterprises.some((enterprise) => getId(enterprise) === current);
        if (matchesCurrent) {
          return current;
        }

        const fallbackDefault = companies.find((company) => company.defaultEnterpriseId)
          ?.defaultEnterpriseId ?? null;
        if (fallbackDefault) {
          return fallbackDefault;
        }
        return enterprises.length > 0 ? getId(enterprises[0]) : null;
      }),
      catchError(() => of(null)),
    );
  }
}

const getId = (value: CompanyEnterprise | Company | null | undefined): string | null => {
  const raw = value?.id ?? value?._id ?? null;
  return typeof raw === 'string' && raw.trim().length > 0 ? raw : null;
};
