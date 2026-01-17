import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

import { AuthUser } from '../../shared/models/auth.model';
import { TokenStorageService } from '../auth/token-storage.service';

@Injectable({ providedIn: 'root' })
export class WorkspaceStateService {
  private readonly activeKey = 'bc_active_workspace_id';
  private readonly defaultKey = 'bc_default_workspace_id';
  private readonly activeSetupKey = 'bc_active_workspace_setup_completed';

  private readonly activeWorkspaceSubject = new BehaviorSubject<string | null>(this.readStorage(this.activeKey));
  private readonly defaultWorkspaceSubject = new BehaviorSubject<string | null>(this.readStorage(this.defaultKey));
  private readonly activeSetupSubject = new BehaviorSubject<boolean | null>(this.readStorageBool(this.activeSetupKey));

  readonly activeWorkspaceId$: Observable<string | null> = this.activeWorkspaceSubject.asObservable();
  readonly defaultWorkspaceId$: Observable<string | null> = this.defaultWorkspaceSubject.asObservable();
  readonly activeWorkspaceSetupCompleted$: Observable<boolean | null> = this.activeSetupSubject.asObservable();

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

  getActiveWorkspaceSetupCompleted(): boolean | null {
    return this.activeSetupSubject.value;
  }

  setDefaultWorkspaceId(workspaceId: string | null): void {
    this.defaultWorkspaceSubject.next(workspaceId);
    this.writeStorage(this.defaultKey, workspaceId);
  }

  setActiveWorkspaceSetupCompleted(setupCompleted: boolean | null): void {
    this.activeSetupSubject.next(setupCompleted);
    this.writeStorageBool(this.activeSetupKey, setupCompleted);
  }

  syncFromUser(user: AuthUser | null): void {
    const nextDefault = user?.defaultWorkspaceId ?? null;
    this.setDefaultWorkspaceId(nextDefault);
  }

  clear(): void {
    this.setActiveWorkspaceId(null);
    this.setDefaultWorkspaceId(null);
    this.setActiveWorkspaceSetupCompleted(null);
  }

  private readStorage(key: string): string | null {
    return localStorage.getItem(key);
  }

  private readStorageBool(key: string): boolean | null {
    const raw = localStorage.getItem(key);
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
