import { HttpClient } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { APP_CONFIG_TOKEN, AppConfig } from '../config/app-config';
import { ApiResponse } from '../../shared/models/api-response.model';
import { IOrganization, IOrganizationOverview, IOrganizationRole } from '../../shared/models/organization.model';
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

  getById(id: string): Observable<ApiResponse<IOrganization>> {
    return this.http.get<ApiResponse<IOrganization>>(`${this.baseUrl}/${id}`);
  }

  create(payload: { name: string }): Observable<ApiResponse<IOrganization>> {
    return this.http.post<ApiResponse<IOrganization>>(this.baseUrl, payload);
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

  getOverview(id: string): Observable<ApiResponse<IOrganizationOverview>> {
    return this.http.get<ApiResponse<IOrganizationOverview>>(`${this.baseUrl}/${id}/overview`);
  }

  listRoles(id: string): Observable<ApiResponse<IOrganizationRole[]>> {
    return this.http.get<ApiResponse<IOrganizationRole[]>>(`${this.baseUrl}/${id}/roles`);
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
