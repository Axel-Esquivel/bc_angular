import { Injectable } from '@angular/core';

export interface SetupOrganizationDraft {
  name: string;
  countryId: string | null;
  currencyId: string | null;
}

export interface SetupModulesState {
  modules: Record<string, boolean>;
}

@Injectable({ providedIn: 'root' })
export class SetupStateService {
  private organizationDraft: SetupOrganizationDraft | null = null;
  private organizationId: string | null = null;
  private modulesState: SetupModulesState | null = null;

  setOrganizationDraft(state: SetupOrganizationDraft): void {
    this.organizationDraft = { ...state };
  }

  getOrganizationDraft(): SetupOrganizationDraft | null {
    return this.organizationDraft ? { ...this.organizationDraft } : null;
  }

  setOrganizationId(id: string): void {
    this.organizationId = id;
  }

  getOrganizationId(): string | null {
    return this.organizationId;
  }

  setModulesState(state: SetupModulesState): void {
    this.modulesState = { modules: { ...state.modules } };
  }

  getModulesState(): SetupModulesState | null {
    return this.modulesState ? { modules: { ...this.modulesState.modules } } : null;
  }

  clear(): void {
    this.organizationDraft = null;
    this.organizationId = null;
    this.modulesState = null;
  }
}
