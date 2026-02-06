import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

import { AuthUser } from '../../shared/models/auth.model';
import { ActiveContext } from '../../shared/models/active-context.model';
import { TokenStorageService } from '../auth/token-storage.service';

@Injectable({ providedIn: 'root' })
export class CompanyStateService {
  private readonly activeKey = 'bc_active_company_id';
  private readonly defaultKey = 'bc_default_company_id';
  private readonly activeSetupKey = 'bc_active_company_setup_completed';
  private readonly legacyActiveKey = 'bc_active_Organization_id';
  private readonly legacyDefaultKey = 'bc_default_Organization_id';
  private readonly legacySetupKey = 'bc_active_Organization_setup_completed';

  private readonly activeCompanySubject = new BehaviorSubject<string | null>(
    this.readStorage(this.activeKey, this.legacyActiveKey),
  );
  private readonly defaultCompanySubject = new BehaviorSubject<string | null>(
    this.readStorage(this.defaultKey, this.legacyDefaultKey),
  );
  private readonly activeSetupSubject = new BehaviorSubject<boolean | null>(
    this.readStorageBool(this.activeSetupKey, this.legacySetupKey),
  );

  readonly activeCompanyId$: Observable<string | null> = this.activeCompanySubject.asObservable();
  readonly defaultCompanyId$: Observable<string | null> = this.defaultCompanySubject.asObservable();
  readonly activeCompanySetupCompleted$: Observable<boolean | null> =
    this.activeSetupSubject.asObservable();

  constructor(private readonly tokenStorage: TokenStorageService) {
    const storedUser = this.tokenStorage.getUser();
    if (storedUser?.defaultCompanyId) {
      this.setDefaultCompanyId(storedUser.defaultCompanyId ?? null);
    }
  }

  getActiveCompanyId(): string | null {
    return this.activeCompanySubject.value;
  }

  setActiveCompanyId(companyId: string | null): void {
    this.activeCompanySubject.next(companyId);
    this.writeStorage(this.activeKey, companyId);
  }

  getDefaultCompanyId(): string | null {
    return this.defaultCompanySubject.value;
  }

  getActiveCompanySetupCompleted(): boolean | null {
    return this.activeSetupSubject.value;
  }

  setDefaultCompanyId(companyId: string | null): void {
    this.defaultCompanySubject.next(companyId);
    this.writeStorage(this.defaultKey, companyId);
  }

  setActiveCompanySetupCompleted(setupCompleted: boolean | null): void {
    this.activeSetupSubject.next(setupCompleted);
    this.writeStorageBool(this.activeSetupKey, setupCompleted);
  }

  syncFromUser(user: AuthUser | null): void {
    this.setDefaultCompanyId(user?.defaultCompanyId ?? null);
  }

  syncFromContext(context: ActiveContext | null): void {
    if (!context?.companyId) {
      return;
    }
    this.setActiveCompanyId(context.companyId);
    if (!this.getDefaultCompanyId()) {
      this.setDefaultCompanyId(context.companyId);
    }
  }

  clear(): void {
    this.setActiveCompanyId(null);
    this.setDefaultCompanyId(null);
    this.setActiveCompanySetupCompleted(null);
  }

  private readStorage(key: string, legacyKey?: string): string | null {
    const value = localStorage.getItem(key);
    if (value) {
      return value;
    }
    return legacyKey ? localStorage.getItem(legacyKey) : null;
  }

  private readStorageBool(key: string, legacyKey?: string): boolean | null {
    const raw = localStorage.getItem(key) ?? (legacyKey ? localStorage.getItem(legacyKey) : null);
    if (raw === null) {
      return null;
    }
    return raw === 'true';
  }

  private writeStorage(key: string, value: string | null): void {
    if (value) {
      localStorage.setItem(key, value);
      return;
    }

    localStorage.removeItem(key);
  }

  private writeStorageBool(key: string, value: boolean | null): void {
    if (value === null) {
      localStorage.removeItem(key);
      return;
    }

    localStorage.setItem(key, String(value));
  }
}
