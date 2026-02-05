import { Injectable } from '@angular/core';

import { AuthService } from '../auth/auth.service';
import { ActiveContextStateService } from '../context/active-context-state.service';

export interface PendingOrgSetup {
  organizationId: string;
  startedAt: string;
  lastStep?: number;
}

@Injectable({ providedIn: 'root' })
export class SessionStateService {
  private readonly pendingOrgSetupKey = 'pendingOrgSetup';

  constructor(
    private readonly authService: AuthService,
    private readonly activeContextState: ActiveContextStateService,
  ) {}

  isAuthenticated(): boolean {
    return this.authService.isAuthenticated();
  }

  hasOrganizations(): boolean {
    const context = this.activeContextState.getActiveContext();
    return Boolean(context.organizationId);
  }

  hasDefaults(): boolean {
    const context = this.activeContextState.getActiveContext();
    return this.activeContextState.isComplete(context);
  }

  getPendingOrgSetup(): PendingOrgSetup | null {
    const raw = localStorage.getItem(this.pendingOrgSetupKey);
    if (!raw) {
      return null;
    }
    try {
      const parsed = JSON.parse(raw) as PendingOrgSetup;
      if (!parsed?.organizationId || !parsed?.startedAt) {
        return null;
      }
      return {
        organizationId: parsed.organizationId,
        startedAt: parsed.startedAt,
        lastStep: typeof parsed.lastStep === 'number' ? parsed.lastStep : undefined,
      };
    } catch {
      return null;
    }
  }

  setPendingOrgSetup(pending: PendingOrgSetup): void {
    if (!pending?.organizationId || !pending?.startedAt) {
      return;
    }
    localStorage.setItem(this.pendingOrgSetupKey, JSON.stringify(pending));
  }

  clearPendingOrgSetup(): void {
    localStorage.removeItem(this.pendingOrgSetupKey);
  }
}
