import { Injectable } from '@angular/core';

import { AuthService } from '../auth/auth.service';
import { ActiveContextStateService } from '../context/active-context-state.service';

@Injectable({ providedIn: 'root' })
export class SessionStateService {
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
}
