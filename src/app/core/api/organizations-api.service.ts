import { HttpClient } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { APP_CONFIG_TOKEN, AppConfig } from '../config/app-config';
import { ApiResponse } from '../../shared/models/api-response.model';
import {
  CreateOrganizationRequest,
  IOrganization,
  IOrganizationMembership,
  IOrganizationOverview,
  IOrganizationRole,
  OrganizationDefaultResult,
  OrganizationDeleteResult,
  UpdateOrganizationRequest,
} from '../../shared/models/organization.model';
import { OrganizationModulesOverviewResponse } from '../../shared/models/organization-modules.model';
import { Workspace } from '../../shared/models/workspace.model';

@Injectable({ providedIn: 'root' })
export class OrganizationsService {
  private readonly baseUrl: string;

  constructor(@Inject(APP_CONFIG_TOKEN) private readonly config: AppConfig, private readonly http: HttpClient) {
    this.baseUrl = `${this.config.apiBaseUrl}/organizations`;
  }

  list(): Observable<ApiResponse<IOrganization[]>> {
    return this.http.get<ApiResponse<IOrganization[]>>(this.baseUrl);
  }

  listMemberships(): Observable<ApiResponse<IOrganizationMembership[]>> {
    return this.http.get<ApiResponse<IOrganizationMembership[]>>(`${this.baseUrl}/memberships`);
  }

  getById(id: string): Observable<ApiResponse<IOrganization>> {
    return this.http.get<ApiResponse<IOrganization>>(`${this.baseUrl}/${id}`);
  }

  create(payload: CreateOrganizationRequest): Observable<ApiResponse<IOrganization>> {
    return this.http.post<ApiResponse<IOrganization>>(this.baseUrl, payload);
  }

  bootstrap(payload: {
    name: string;
    currencyIds: string[];
    countryIds: string[];
    companies: Array<{
      name: string;
      countryId: string;
      baseCurrencyId?: string;
      currencyIds?: string[];
      branches?: Array<{ name: string; tempKey?: string; countryId?: string; type?: 'retail' | 'wholesale' }>;
      warehouses?: Array<{ name: string; branchId?: string; branchTempKey?: string; type?: string }>;
    }>;
  }): Observable<ApiResponse<{
    organization: IOrganization;
    companies: Array<{ id: string; name: string }>;
    branches: Array<{ id: string; name: string; companyId: string }>;
    warehouses: Array<{ id: string; name: string; companyId: string; branchId: string }>;
  }>> {
    return this.http.post<ApiResponse<{
      organization: IOrganization;
      companies: Array<{ id: string; name: string }>;
      branches: Array<{ id: string; name: string; companyId: string }>;
      warehouses: Array<{ id: string; name: string; companyId: string; branchId: string }>;
    }>>(`${this.baseUrl}/bootstrap`, payload);
  }

  addMember(
    organizationId: string,
    payload: { email: string; role: string },
  ): Observable<ApiResponse<IOrganization>> {
    return this.http.post<ApiResponse<IOrganization>>(`${this.baseUrl}/${organizationId}/invite`, {
      email: payload.email,
      roleKey: payload.role,
    });
  }

  requestJoin(organizationId: string, payload: { roleKey?: string }): Observable<ApiResponse<IOrganization>> {
    return this.http.post<ApiResponse<IOrganization>>(`${this.baseUrl}/${organizationId}/join`, payload);
  }

  requestJoinByCode(payload: { code?: string; email?: string; organizationId?: string; roleKey?: string }): Observable<ApiResponse<IOrganization>> {
    return this.http.post<ApiResponse<IOrganization>>(`${this.baseUrl}/join`, payload);
  }

  joinRequest(payload: { email: string; orgCode?: string }): Observable<ApiResponse<IOrganization>> {
    return this.http.post<ApiResponse<IOrganization>>(`${this.baseUrl}/join-request`, payload);
  }

  acceptMember(organizationId: string, userId: string): Observable<ApiResponse<IOrganization>> {
    return this.http.post<ApiResponse<IOrganization>>(
      `${this.baseUrl}/${organizationId}/members/${encodeURIComponent(userId)}/accept`,
      {},
    );
  }

  rejectMember(organizationId: string, userId: string): Observable<ApiResponse<IOrganization>> {
    return this.http.post<ApiResponse<IOrganization>>(
      `${this.baseUrl}/${organizationId}/members/${encodeURIComponent(userId)}/reject`,
      {},
    );
  }

  removeMember(organizationId: string, userId: string): Observable<ApiResponse<IOrganization>> {
    return this.http.delete<ApiResponse<IOrganization>>(
      `${this.baseUrl}/${organizationId}/members/${encodeURIComponent(userId)}`,
    );
  }

  updateMemberRole(
    organizationId: string,
    userId: string,
    payload: { role: string },
  ): Observable<ApiResponse<IOrganization>> {
    return this.http.patch<ApiResponse<IOrganization>>(
      `${this.baseUrl}/${organizationId}/members/${encodeURIComponent(userId)}/role`,
      payload,
    );
  }

  listWorkspaces(id: string): Observable<ApiResponse<Workspace[]>> {
    return this.http.get<ApiResponse<Workspace[]>>(`${this.baseUrl}/${id}/workspaces`);
  }

  updateOrganization(id: string, payload: UpdateOrganizationRequest): Observable<ApiResponse<IOrganization>> {
    return this.http.patch<ApiResponse<IOrganization>>(`${this.baseUrl}/${id}`, payload);
  }

  setDefaultOrganization(id: string): Observable<ApiResponse<OrganizationDefaultResult>> {
    const payload: Record<string, never> = {};
    return this.http.patch<ApiResponse<OrganizationDefaultResult>>(`${this.baseUrl}/${id}/default`, payload);
  }

  leaveOrganization(id: string): Observable<ApiResponse<IOrganization>> {
    return this.http.delete<ApiResponse<IOrganization>>(`${this.baseUrl}/${id}/leave`);
  }

  deleteOrganization(id: string): Observable<ApiResponse<OrganizationDeleteResult>> {
    return this.http.delete<ApiResponse<OrganizationDeleteResult>>(`${this.baseUrl}/${id}`);
  }

  getOverview(id: string): Observable<ApiResponse<IOrganizationOverview>> {
    return this.http.get<ApiResponse<IOrganizationOverview>>(`${this.baseUrl}/${id}/overview`);
  }

  listRoles(id: string): Observable<ApiResponse<IOrganizationRole[]>> {
    return this.http.get<ApiResponse<IOrganizationRole[]>>(`${this.baseUrl}/${id}/roles`);
  }

  getModules(id: string): Observable<ApiResponse<OrganizationModulesOverviewResponse>> {
    return this.http.get<ApiResponse<OrganizationModulesOverviewResponse>>(`${this.baseUrl}/${id}/modules`);
  }

  updateModules(id: string, payload: { modules: string[] }): Observable<ApiResponse<OrganizationModulesOverviewResponse>> {
    return this.http.patch<ApiResponse<OrganizationModulesOverviewResponse>>(`${this.baseUrl}/${id}/modules`, payload);
  }

  installModule(id: string, key: string): Observable<ApiResponse<OrganizationModulesOverviewResponse>> {
    return this.http.post<ApiResponse<OrganizationModulesOverviewResponse>>(
      `${this.baseUrl}/${id}/modules/install`,
      { key }
    );
  }

  disableModule(id: string, key: string): Observable<ApiResponse<OrganizationModulesOverviewResponse>> {
    return this.http.post<ApiResponse<OrganizationModulesOverviewResponse>>(
      `${this.baseUrl}/${id}/modules/disable`,
      { key }
    );
  }

  createRole(
    id: string,
    payload: { key: string; name: string; permissions: string[] },
  ): Observable<ApiResponse<IOrganizationRole[]>> {
    return this.http.post<ApiResponse<IOrganizationRole[]>>(`${this.baseUrl}/${id}/roles`, payload);
  }

  updateRole(
    id: string,
    roleKey: string,
    payload: { name?: string; permissions?: string[] },
  ): Observable<ApiResponse<IOrganizationRole[]>> {
    return this.http.patch<ApiResponse<IOrganizationRole[]>>(
      `${this.baseUrl}/${id}/roles/${encodeURIComponent(roleKey)}`,
      payload,
    );
  }

  deleteRole(id: string, roleKey: string): Observable<ApiResponse<IOrganizationRole[]>> {
    return this.http.delete<ApiResponse<IOrganizationRole[]>>(
      `${this.baseUrl}/${id}/roles/${encodeURIComponent(roleKey)}`,
    );
  }

  listPermissions(id: string): Observable<ApiResponse<Array<{ moduleKey: string; permissions: string[] }>>> {
    return this.http.get<ApiResponse<Array<{ moduleKey: string; permissions: string[] }>>>(
      `${this.baseUrl}/${id}/permissions`,
    );
  }
}
