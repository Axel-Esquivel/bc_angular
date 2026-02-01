import { HttpClient } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { APP_CONFIG_TOKEN, AppConfig } from '../config/app-config';
import { ApiResponse } from '../../shared/models/api-response.model';
import { IOrganizationCoreSettings, Organization, OrganizationListResult } from '../../shared/models/Organization.model';
import { OrganizationModulesOverview } from '../../shared/models/Organization-modules.model';
import { AuthUser } from '../../shared/models/auth.model';

@Injectable({ providedIn: 'root' })
export class OrganizationsApiService {
  private readonly baseUrl: string;

  constructor(@Inject(APP_CONFIG_TOKEN) private readonly config: AppConfig, private readonly http: HttpClient) {
    this.baseUrl = `${this.config.apiBaseUrl}/Organizations`;
  }

  create(dto: { name: string; organizationId: string; countryId: string; baseCurrencyId?: string }): Observable<ApiResponse<Organization>> {
    return this.http.post<ApiResponse<Organization>>(this.baseUrl, dto);
  }

  join(dto: { code: string }): Observable<ApiResponse<Organization>> {
    return this.http.post<ApiResponse<Organization>>(`${this.baseUrl}/join`, dto);
  }

  getOrganizationModules(OrganizationId: string): Observable<ApiResponse<OrganizationModulesOverview>> {
    return this.http.get<ApiResponse<OrganizationModulesOverview>>(`${this.baseUrl}/${OrganizationId}/modules`);
  }

  updateOrganizationModules(
    OrganizationId: string,
    modules: { key: string; enabled: boolean }[]
  ): Observable<ApiResponse<{ key: string; enabled: boolean }[]>> {
    return this.http.patch<ApiResponse<{ key: string; enabled: boolean }[]>>(
      `${this.baseUrl}/${OrganizationId}/modules`,
      { modules }
    );
  }

  listMine(): Observable<ApiResponse<OrganizationListResult>> {
    return this.http.get<ApiResponse<OrganizationListResult>>(this.baseUrl);
  }

  listRoles(OrganizationId: string): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>(`${this.baseUrl}/${OrganizationId}/roles`);
  }

  createRole(
    OrganizationId: string,
    payload: { key: string; name: string; permissions: string[] }
  ): Observable<ApiResponse<any[]>> {
    return this.http.post<ApiResponse<any[]>>(`${this.baseUrl}/${OrganizationId}/roles`, payload);
  }

  updateRole(
    OrganizationId: string,
    roleKey: string,
    payload: { name?: string; permissions?: string[] }
  ): Observable<ApiResponse<any[]>> {
    return this.http.patch<ApiResponse<any[]>>(`${this.baseUrl}/${OrganizationId}/roles/${encodeURIComponent(roleKey)}`, payload);
  }

  deleteRole(OrganizationId: string, roleKey: string): Observable<ApiResponse<any[]>> {
    return this.http.delete<ApiResponse<any[]>>(`${this.baseUrl}/${OrganizationId}/roles/${encodeURIComponent(roleKey)}`);
  }

  updateMemberRole(
    OrganizationId: string,
    userId: string,
    roleKey: string
  ): Observable<ApiResponse<Record<string, any>>> {
    return this.http.patch<ApiResponse<Record<string, any>>>(
      `${this.baseUrl}/${OrganizationId}/members/${encodeURIComponent(userId)}/role`,
      { roleKey }
    );
  }

  addMember(
    OrganizationId: string,
    payload: { userId: string; roleKey: string }
  ): Observable<ApiResponse<Record<string, any>>> {
    return this.http.post<ApiResponse<Record<string, any>>>(
      `${this.baseUrl}/${OrganizationId}/members`,
      payload
    );
  }

  completeSetup(OrganizationId: string): Observable<ApiResponse<Organization>> {
    return this.http.patch<ApiResponse<Organization>>(`${this.baseUrl}/${OrganizationId}/setup-complete`, {});
  }

  updateModuleSettings(OrganizationId: string, moduleId: string, settings: Record<string, any>): Observable<ApiResponse<Record<string, any>>> {
    return this.http.patch<ApiResponse<Record<string, any>>>(
      `${this.baseUrl}/${OrganizationId}/module-settings/${moduleId}`,
      settings
    );
  }

  getCoreSettings(OrganizationId: string): Observable<ApiResponse<IOrganizationCoreSettings>> {
    return this.http.get<ApiResponse<IOrganizationCoreSettings>>(
      `${this.baseUrl}/${OrganizationId}/settings/core`
    );
  }

  updateCoreSettings(
    OrganizationId: string,
    settings: IOrganizationCoreSettings
  ): Observable<ApiResponse<IOrganizationCoreSettings>> {
    return this.http.patch<ApiResponse<IOrganizationCoreSettings>>(
      `${this.baseUrl}/${OrganizationId}/settings/core`,
      settings
    );
  }

  getModuleSettings(OrganizationId: string, moduleId: string): Observable<ApiResponse<Record<string, any>>> {
    return this.http.get<ApiResponse<Record<string, any>>>(
      `${this.baseUrl}/${OrganizationId}/module-settings/${moduleId}`
    );
  }

  getInventorySettings(OrganizationId: string): Observable<ApiResponse<Record<string, any>>> {
    return this.http.get<ApiResponse<Record<string, any>>>(
      `${this.baseUrl}/${OrganizationId}/inventory/settings`
    );
  }

  updateInventorySettings(
    OrganizationId: string,
    settings: { costMethod?: string; stockLevel?: string; allowNegative?: boolean }
  ): Observable<ApiResponse<Record<string, any>>> {
    return this.http.patch<ApiResponse<Record<string, any>>>(
      `${this.baseUrl}/${OrganizationId}/inventory/settings`,
      settings
    );
  }

  getPosTerminals(OrganizationId: string): Observable<ApiResponse<Record<string, any>>> {
    return this.http.get<ApiResponse<Record<string, any>>>(`${this.baseUrl}/${OrganizationId}/pos/terminals`);
  }

  createPosTerminal(
    OrganizationId: string,
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
    return this.http.post<ApiResponse<Record<string, any>>>(`${this.baseUrl}/${OrganizationId}/pos/terminals`, dto);
  }

  updatePosTerminal(
    OrganizationId: string,
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
      `${this.baseUrl}/${OrganizationId}/pos/terminals/${terminalId}`,
      dto
    );
  }

  deletePosTerminal(OrganizationId: string, terminalId: string): Observable<ApiResponse<Record<string, any>>> {
    return this.http.delete<ApiResponse<Record<string, any>>>(
      `${this.baseUrl}/${OrganizationId}/pos/terminals/${terminalId}`
    );
  }

  enableModule(OrganizationId: string, moduleKey: string): Observable<ApiResponse<Record<string, any>>> {
    return this.http.post<ApiResponse<Record<string, any>>>(
      `${this.baseUrl}/${OrganizationId}/modules/${encodeURIComponent(moduleKey)}/enable`,
      {}
    );
  }

  configureModule(OrganizationId: string, moduleKey: string): Observable<ApiResponse<Record<string, any>>> {
    return this.http.post<ApiResponse<Record<string, any>>>(
      `${this.baseUrl}/${OrganizationId}/modules/${encodeURIComponent(moduleKey)}/configure`,
      {}
    );
  }

  setDefault(dto: { OrganizationId: string }): Observable<ApiResponse<AuthUser>> {
    return this.http.patch<ApiResponse<AuthUser>>(`${this.config.apiBaseUrl}/users/me/default-Organization`, dto);
  }

  getAccountingDefaults(OrganizationId: string): Observable<ApiResponse<Record<string, any>>> {
    return this.http.get<ApiResponse<Record<string, any>>>(`${this.baseUrl}/${OrganizationId}/accounting/defaults`);
  }

  updateAccountingDefaults(
    OrganizationId: string,
    defaults: Record<string, any>
  ): Observable<ApiResponse<Record<string, any>>> {
    return this.http.patch<ApiResponse<Record<string, any>>>(
      `${this.baseUrl}/${OrganizationId}/accounting/defaults`,
      defaults
    );
  }

  listAccountingTaxes(OrganizationId: string): Observable<ApiResponse<Record<string, any>[]>> {
    return this.http.get<ApiResponse<Record<string, any>[]>>(`${this.baseUrl}/${OrganizationId}/accounting/taxes`);
  }

  createAccountingTax(
    OrganizationId: string,
    tax: Record<string, any>
  ): Observable<ApiResponse<Record<string, any>>> {
    return this.http.post<ApiResponse<Record<string, any>>>(`${this.baseUrl}/${OrganizationId}/accounting/taxes`, tax);
  }

  updateAccountingTax(
    OrganizationId: string,
    taxId: string,
    tax: Record<string, any>
  ): Observable<ApiResponse<Record<string, any>>> {
    return this.http.patch<ApiResponse<Record<string, any>>>(
      `${this.baseUrl}/${OrganizationId}/accounting/taxes/${taxId}`,
      tax
    );
  }

  deleteAccountingTax(OrganizationId: string, taxId: string): Observable<ApiResponse<Record<string, any>>> {
    return this.http.delete<ApiResponse<Record<string, any>>>(`${this.baseUrl}/${OrganizationId}/accounting/taxes/${taxId}`);
  }

  listAccountingCategoryMappings(OrganizationId: string): Observable<ApiResponse<Record<string, any>[]>> {
    return this.http.get<ApiResponse<Record<string, any>[]>>(
      `${this.baseUrl}/${OrganizationId}/accounting/category-mappings`
    );
  }

  createAccountingCategoryMapping(
    OrganizationId: string,
    payload: Record<string, any>
  ): Observable<ApiResponse<Record<string, any>>> {
    return this.http.post<ApiResponse<Record<string, any>>>(
      `${this.baseUrl}/${OrganizationId}/accounting/category-mappings`,
      payload
    );
  }

  updateAccountingCategoryMapping(
    OrganizationId: string,
    mappingId: string,
    payload: Record<string, any>
  ): Observable<ApiResponse<Record<string, any>>> {
    return this.http.patch<ApiResponse<Record<string, any>>>(
      `${this.baseUrl}/${OrganizationId}/accounting/category-mappings/${mappingId}`,
      payload
    );
  }

  deleteAccountingCategoryMapping(
    OrganizationId: string,
    mappingId: string
  ): Observable<ApiResponse<Record<string, any>>> {
    return this.http.delete<ApiResponse<Record<string, any>>>(
      `${this.baseUrl}/${OrganizationId}/accounting/category-mappings/${mappingId}`
    );
  }
}
