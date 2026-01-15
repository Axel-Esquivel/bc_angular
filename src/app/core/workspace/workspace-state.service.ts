import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

import { AuthUser } from '../../shared/models/auth.model';
import { TokenStorageService } from '../auth/token-storage.service';

@Injectable({ providedIn: 'root' })
export class WorkspaceStateService {
  private readonly activeKey = 'bc_active_workspace_id';
  private readonly defaultKey = 'bc_default_workspace_id';

  private readonly activeWorkspaceSubject = new BehaviorSubject<string | null>(this.readStorage(this.activeKey));
  private readonly defaultWorkspaceSubject = new BehaviorSubject<string | null>(this.readStorage(this.defaultKey));

  readonly activeWorkspaceId$: Observable<string | null> = this.activeWorkspaceSubject.asObservable();
  readonly defaultWorkspaceId$: Observable<string | null> = this.defaultWorkspaceSubject.asObservable();

  constructor(private readonly tokenStorage: TokenStorageService) {
    const storedUser = this.tokenStorage.getUser();
    if (storedUser?.defaultWorkspaceId) {
      this.setDefaultWorkspaceId(storedUser.defaultWorkspaceId);
    }
  }

  getActiveWorkspaceId(): string | null {
    return this.activeWorkspaceSubject.value;
  }

  setActiveWorkspaceId(workspaceId: string | null): void {
    this.activeWorkspaceSubject.next(workspaceId);
    this.writeStorage(this.activeKey, workspaceId);
  }

  getDefaultWorkspaceId(): string | null {
    return this.defaultWorkspaceSubject.value;
  }

  setDefaultWorkspaceId(workspaceId: string | null): void {
    this.defaultWorkspaceSubject.next(workspaceId);
    this.writeStorage(this.defaultKey, workspaceId);
  }

  syncFromUser(user: AuthUser | null): void {
    const nextDefault = user?.defaultWorkspaceId ?? null;
    this.setDefaultWorkspaceId(nextDefault);
  }

  clear(): void {
    this.setActiveWorkspaceId(null);
    this.setDefaultWorkspaceId(null);
  }

  private readStorage(key: string): string | null {
    return localStorage.getItem(key);
  }

  private writeStorage(key: string, value: string | null): void {
    if (value) {
      localStorage.setItem(key, value);
      return;
    }

    localStorage.removeItem(key);
  }
}
