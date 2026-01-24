import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

import { Workspace } from '../../shared/models/workspace.model';

/** @deprecated Use CompanySessionService instead. */
@Injectable({ providedIn: 'root' })
export class WorkspaceSessionService {
  private readonly storageKey = 'bc_selected_workspace';
  private readonly workspaceSubject = new BehaviorSubject<Workspace | null>(this.restoreFromStorage());

  readonly workspace$: Observable<Workspace | null> = this.workspaceSubject.asObservable();

  getCurrentWorkspace(): Workspace | null {
    return this.workspaceSubject.value;
  }

  selectWorkspace(workspace: Workspace): void {
    this.workspaceSubject.next(workspace);
    localStorage.setItem(this.storageKey, JSON.stringify(workspace));
  }

  clearWorkspace(): void {
    this.workspaceSubject.next(null);
    localStorage.removeItem(this.storageKey);
  }

  private restoreFromStorage(): Workspace | null {
    const raw = localStorage.getItem(this.storageKey);
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as Workspace;
    } catch (error) {
      return null;
    }
  }
}
