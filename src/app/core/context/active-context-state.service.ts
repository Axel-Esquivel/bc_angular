import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

import { ActiveContext, createEmptyActiveContext } from '../../shared/models/active-context.model';

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

  isComplete(context: ActiveContext): boolean {
    return Boolean(
      context.organizationId && context.companyId && context.enterpriseId && context.currencyId,
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
        enterpriseId: parsed.enterpriseId ?? null,
        currencyId: parsed.currencyId ?? null,
      };
    } catch {
      localStorage.removeItem(this.storageKey);
      return createEmptyActiveContext();
    }
  }
}
