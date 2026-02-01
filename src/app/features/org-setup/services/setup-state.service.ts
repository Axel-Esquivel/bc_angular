import { Injectable } from '@angular/core';

export interface OrgSetupOrganizationDraft {
  name: string;
  countryId: string | null;
  currencyId: string | null;
}

export interface OrgSetupModulesState {
  modules: Record<string, boolean>;
}

@Injectable({ providedIn: 'root' })
export class SetupStateService {
  private organizationDraft: OrgSetupOrganizationDraft | null = null;
  private organizationId: string | null = null;
  private modulesState: OrgSetupModulesState | null = null;

  setOrganizationDraft(state: OrgSetupOrganizationDraft): void {
    this.organizationDraft = { ...state };
  }

  getOrganizationDraft(): OrgSetupOrganizationDraft | null {
    return this.organizationDraft ? { ...this.organizationDraft } : null;
  }

  setOrganizationId(id: string): void {
    this.organizationId = id;
  }

  getOrganizationId(): string | null {
    return this.organizationId;
  }

  setModulesState(state: OrgSetupModulesState): void {
    this.modulesState = { modules: { ...state.modules } };
  }

  getModulesState(): OrgSetupModulesState | null {
    return this.modulesState ? { modules: { ...this.modulesState.modules } } : null;
  }

  clear(): void {
    this.organizationDraft = null;
    this.organizationId = null;
    this.modulesState = null;
  }
}
