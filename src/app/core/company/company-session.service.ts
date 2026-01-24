import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

import { Workspace } from '../../shared/models/workspace.model';

@Injectable({ providedIn: 'root' })
export class CompanySessionService {
  private readonly storageKey = 'bc_selected_company';
  private readonly companySubject = new BehaviorSubject<Workspace | null>(this.restoreFromStorage());

  readonly company$: Observable<Workspace | null> = this.companySubject.asObservable();

  getCurrentCompany(): Workspace | null {
    return this.companySubject.value;
  }

  selectCompany(company: Workspace): void {
    this.companySubject.next(company);
    localStorage.setItem(this.storageKey, JSON.stringify(company));
    if (company?.id) {
      localStorage.setItem('companyId', company.id);
    }
    if (company?.name) {
      localStorage.setItem('companyName', company.name);
    }
  }

  clearCompany(): void {
    this.companySubject.next(null);
    localStorage.removeItem(this.storageKey);
    localStorage.removeItem('companyId');
    localStorage.removeItem('companyName');
  }

  private restoreFromStorage(): Workspace | null {
    const raw = localStorage.getItem(this.storageKey);
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as Workspace;
    } catch {
      return null;
    }
  }
}
