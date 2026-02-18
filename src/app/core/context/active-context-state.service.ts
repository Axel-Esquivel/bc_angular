import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

import {
  ActiveContext,
  ActiveContextState,
  createEmptyActiveContext,
} from '../../shared/models/active-context.model';

@Injectable({ providedIn: 'root' })
export class ActiveContextStateService {
  private readonly storageKey = 'bc_active_context';
  private readonly contextSubject = new BehaviorSubject<ActiveContext>(this.restore());

  readonly activeContext$: Observable<ActiveContext> = this.contextSubject.asObservable();

  getActiveContext(): ActiveContext {
    return this.contextSubject.value;
  }

  setActiveContext(context: ActiveContext | null | undefined): void {
    const next = context ?? createEmptyActiveContext();
    this.contextSubject.next(next);
    localStorage.setItem(this.storageKey, JSON.stringify(next));
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
}
