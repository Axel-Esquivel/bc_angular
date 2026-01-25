import { HttpClient } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { APP_CONFIG_TOKEN, AppConfig } from '../config/app-config';
import { ApiResponse } from '../../shared/models/api-response.model';
import { IWorkspaceCoreSettings, Workspace, WorkspaceListResult } from '../../shared/models/workspace.model';
import { WorkspaceModulesOverview } from '../../shared/models/workspace-modules.model';
import { AuthUser } from '../../shared/models/auth.model';

@Injectable({ providedIn: 'root' })
export class WorkspacesApiService {
  private readonly baseUrl: string;

  constructor(@Inject(APP_CONFIG_TOKEN) private readonly config: AppConfig, private readonly http: HttpClient) {
    this.baseUrl = `${this.config.apiBaseUrl}/workspaces`;
  }

  create(dto: { name: string; organizationId: string; countryId: string; baseCurrencyId?: string }): Observable<ApiResponse<Workspace>> {
    return this.http.post<ApiResponse<Workspace>>(this.baseUrl, dto);
  }

  join(dto: { code: string }): Observable<ApiResponse<Workspace>> {
    return this.http.post<ApiResponse<Workspace>>(`${this.baseUrl}/join`, dto);
  }

  getWorkspaceModules(workspaceId: string): Observable<ApiResponse<WorkspaceModulesOverview>> {
    return this.http.get<ApiResponse<WorkspaceModulesOverview>>(`${this.baseUrl}/${workspaceId}/modules`);
  }

  updateWorkspaceModules(
    workspaceId: string,
    modules: { key: string; enabled: boolean }[]
  ): Observable<ApiResponse<{ key: string; enabled: boolean }[]>> {
    return this.http.patch<ApiResponse<{ key: string; enabled: boolean }[]>>(
      `${this.baseUrl}/${workspaceId}/modules`,
      { modules }
    );
  }

  listMine(): Observable<ApiResponse<WorkspaceListResult>> {
    return this.http.get<ApiResponse<WorkspaceListResult>>(this.baseUrl);
  }

  listRoles(workspaceId: string): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>(`${this.baseUrl}/${workspaceId}/roles`);
  }

  createRole(
    workspaceId: string,
    payload: { key: string; name: string; permissions: string[] }
  ): Observable<ApiResponse<any[]>> {
    return this.http.post<ApiResponse<any[]>>(`${this.baseUrl}/${workspaceId}/roles`, payload);
  }

  updateRole(
    workspaceId: string,
    roleKey: string,
    payload: { name?: string; permissions?: string[] }
  ): Observable<ApiResponse<any[]>> {
    return this.http.patch<ApiResponse<any[]>>(`${this.baseUrl}/${workspaceId}/roles/${encodeURIComponent(roleKey)}`, payload);
  }

  deleteRole(workspaceId: string, roleKey: string): Observable<ApiResponse<any[]>> {
    return this.http.delete<ApiResponse<any[]>>(`${this.baseUrl}/${workspaceId}/roles/${encodeURIComponent(roleKey)}`);
  }

  updateMemberRole(
    workspaceId: string,
    userId: string,
    roleKey: string
  ): Observable<ApiResponse<Record<string, any>>> {
    return this.http.patch<ApiResponse<Record<string, any>>>(
      `${this.baseUrl}/${workspaceId}/members/${encodeURIComponent(userId)}/role`,
      { roleKey }
    );
  }

  addMember(
    workspaceId: string,
    payload: { userId: string; roleKey: string }
  ): Observable<ApiResponse<Record<string, any>>> {
    return this.http.post<ApiResponse<Record<string, any>>>(
      `${this.baseUrl}/${workspaceId}/members`,
      payload
    );
  }

  completeSetup(workspaceId: string): Observable<ApiResponse<Workspace>> {
    return this.http.patch<ApiResponse<Workspace>>(`${this.baseUrl}/${workspaceId}/setup-complete`, {});
  }

  updateModuleSettings(workspaceId: string, moduleId: string, settings: Record<string, any>): Observable<ApiResponse<Record<string, any>>> {
    return this.http.patch<ApiResponse<Record<string, any>>>(
      `${this.baseUrl}/${workspaceId}/module-settings/${moduleId}`,
      settings
    );
  }

  getCoreSettings(workspaceId: string): Observable<ApiResponse<IWorkspaceCoreSettings>> {
    return this.http.get<ApiResponse<IWorkspaceCoreSettings>>(
      `${this.baseUrl}/${workspaceId}/settings/core`
    );
  }

  updateCoreSettings(
    workspaceId: string,
    settings: IWorkspaceCoreSettings
  ): Observable<ApiResponse<IWorkspaceCoreSettings>> {
    return this.http.patch<ApiResponse<IWorkspaceCoreSettings>>(
      `${this.baseUrl}/${workspaceId}/settings/core`,
      settings
    );
  }

  getModuleSettings(workspaceId: string, moduleId: string): Observable<ApiResponse<Record<string, any>>> {
    return this.http.get<ApiResponse<Record<string, any>>>(
      `${this.baseUrl}/${workspaceId}/module-settings/${moduleId}`
    );
  }

  getInventorySettings(workspaceId: string): Observable<ApiResponse<Record<string, any>>> {
    return this.http.get<ApiResponse<Record<string, any>>>(
      `${this.baseUrl}/${workspaceId}/inventory/settings`
    );
  }

  updateInventorySettings(
    workspaceId: string,
    settings: { costMethod?: string; stockLevel?: string; allowNegative?: boolean }
  ): Observable<ApiResponse<Record<string, any>>> {
    return this.http.patch<ApiResponse<Record<string, any>>>(
      `${this.baseUrl}/${workspaceId}/inventory/settings`,
      settings
    );
  }

  getPosTerminals(workspaceId: string): Observable<ApiResponse<Record<string, any>>> {
    return this.http.get<ApiResponse<Record<string, any>>>(`${this.baseUrl}/${workspaceId}/pos/terminals`);
  }

  createPosTerminal(
    workspaceId: string,
    dto: {
      name: string;
      companyId: string;
      branchId: string;
      warehouseId: string;
      currencyId: string;
      allowedUsers?: string[];
      isActive?: boolean;
    }
  ): Observable<ApiResponse<Record<string, any>>> {
    return this.http.post<ApiResponse<Record<string, any>>>(`${this.baseUrl}/${workspaceId}/pos/terminals`, dto);
  }

  updatePosTerminal(
    workspaceId: string,
    terminalId: string,
    dto: {
      name?: string;
      companyId?: string;
      branchId?: string;
      warehouseId?: string;
      currencyId?: string;
      allowedUsers?: string[];
      isActive?: boolean;
    }
  ): Observable<ApiResponse<Record<string, any>>> {
    return this.http.patch<ApiResponse<Record<string, any>>>(
      `${this.baseUrl}/${workspaceId}/pos/terminals/${terminalId}`,
      dto
    );
  }

  deletePosTerminal(workspaceId: string, terminalId: string): Observable<ApiResponse<Record<string, any>>> {
    return this.http.delete<ApiResponse<Record<string, any>>>(
      `${this.baseUrl}/${workspaceId}/pos/terminals/${terminalId}`
    );
  }

  enableModule(workspaceId: string, moduleKey: string): Observable<ApiResponse<Record<string, any>>> {
    return this.http.post<ApiResponse<Record<string, any>>>(
      `${this.baseUrl}/${workspaceId}/modules/${encodeURIComponent(moduleKey)}/enable`,
      {}
    );
  }

  configureModule(workspaceId: string, moduleKey: string): Observable<ApiResponse<Record<string, any>>> {
    return this.http.post<ApiResponse<Record<string, any>>>(
      `${this.baseUrl}/${workspaceId}/modules/${encodeURIComponent(moduleKey)}/configure`,
      {}
    );
  }

  setDefault(dto: { workspaceId: string }): Observable<ApiResponse<AuthUser>> {
    return this.http.patch<ApiResponse<AuthUser>>(`${this.config.apiBaseUrl}/users/me/default-workspace`, dto);
  }

  getAccountingDefaults(workspaceId: string): Observable<ApiResponse<Record<string, any>>> {
    return this.http.get<ApiResponse<Record<string, any>>>(`${this.baseUrl}/${workspaceId}/accounting/defaults`);
  }

  updateAccountingDefaults(
    workspaceId: string,
    defaults: Record<string, any>
  ): Observable<ApiResponse<Record<string, any>>> {
    return this.http.patch<ApiResponse<Record<string, any>>>(
      `${this.baseUrl}/${workspaceId}/accounting/defaults`,
      defaults
    );
  }

  listAccountingTaxes(workspaceId: string): Observable<ApiResponse<Record<string, any>[]>> {
    return this.http.get<ApiResponse<Record<string, any>[]>>(`${this.baseUrl}/${workspaceId}/accounting/taxes`);
  }

  createAccountingTax(
    workspaceId: string,
    tax: Record<string, any>
  ): Observable<ApiResponse<Record<string, any>>> {
    return this.http.post<ApiResponse<Record<string, any>>>(`${this.baseUrl}/${workspaceId}/accounting/taxes`, tax);
  }

  updateAccountingTax(
    workspaceId: string,
    taxId: string,
    tax: Record<string, any>
  ): Observable<ApiResponse<Record<string, any>>> {
    return this.http.patch<ApiResponse<Record<string, any>>>(
      `${this.baseUrl}/${workspaceId}/accounting/taxes/${taxId}`,
      tax
    );
  }

  deleteAccountingTax(workspaceId: string, taxId: string): Observable<ApiResponse<Record<string, any>>> {
    return this.http.delete<ApiResponse<Record<string, any>>>(`${this.baseUrl}/${workspaceId}/accounting/taxes/${taxId}`);
  }

  listAccountingCategoryMappings(workspaceId: string): Observable<ApiResponse<Record<string, any>[]>> {
    return this.http.get<ApiResponse<Record<string, any>[]>>(
      `${this.baseUrl}/${workspaceId}/accounting/category-mappings`
    );
  }

  createAccountingCategoryMapping(
    workspaceId: string,
    payload: Record<string, any>
  ): Observable<ApiResponse<Record<string, any>>> {
    return this.http.post<ApiResponse<Record<string, any>>>(
      `${this.baseUrl}/${workspaceId}/accounting/category-mappings`,
      payload
    );
  }

  updateAccountingCategoryMapping(
    workspaceId: string,
    mappingId: string,
    payload: Record<string, any>
  ): Observable<ApiResponse<Record<string, any>>> {
    return this.http.patch<ApiResponse<Record<string, any>>>(
      `${this.baseUrl}/${workspaceId}/accounting/category-mappings/${mappingId}`,
      payload
    );
  }

  deleteAccountingCategoryMapping(
    workspaceId: string,
    mappingId: string
  ): Observable<ApiResponse<Record<string, any>>> {
    return this.http.delete<ApiResponse<Record<string, any>>>(
      `${this.baseUrl}/${workspaceId}/accounting/category-mappings/${mappingId}`
    );
  }
}
