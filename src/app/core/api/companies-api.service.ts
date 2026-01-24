import { HttpClient } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { APP_CONFIG_TOKEN, AppConfig } from '../config/app-config';
import { ApiResponse } from '../../shared/models/api-response.model';
import { Company } from '../../shared/models/company.model';
import { WorkspaceModulesOverview } from '../../shared/models/workspace-modules.model';

@Injectable({ providedIn: 'root' })
export class CompaniesApiService {
  private readonly baseUrl: string;

  constructor(@Inject(APP_CONFIG_TOKEN) private readonly config: AppConfig, private readonly http: HttpClient) {
    this.baseUrl = `${this.config.apiBaseUrl}`;
  }

  listByOrganization(orgId: string): Observable<ApiResponse<Company[]>> {
    return this.http.get<ApiResponse<Company[]>>(`${this.baseUrl}/organizations/${orgId}/companies`);
  }

  create(orgId: string, payload: {
    name: string;
    legalName?: string;
    taxId?: string;
    baseCountryId: string;
    baseCurrencyId: string;
    currencies?: string[];
  }): Observable<ApiResponse<Company>> {
    return this.http.post<ApiResponse<Company>>(`${this.baseUrl}/organizations/${orgId}/companies`, payload);
  }

  getById(companyId: string): Observable<ApiResponse<Company>> {
    return this.http.get<ApiResponse<Company>>(`${this.baseUrl}/companies/${companyId}`);
  }

  update(companyId: string, payload: Partial<Company>): Observable<ApiResponse<Company>> {
    return this.http.patch<ApiResponse<Company>>(`${this.baseUrl}/companies/${companyId}`, payload);
  }

  addMember(companyId: string, payload: { userId: string; roleKey: string }): Observable<ApiResponse<Company>> {
    return this.http.post<ApiResponse<Company>>(`${this.baseUrl}/companies/${companyId}/members`, payload);
  }

  updateMemberRole(
    companyId: string,
    userId: string,
    payload: { roleKey: string },
  ): Observable<ApiResponse<{ userId: string; roleKey: string }>> {
    return this.http.patch<ApiResponse<{ userId: string; roleKey: string }>>(
      `${this.baseUrl}/companies/${companyId}/members/${encodeURIComponent(userId)}/role`,
      payload
    );
  }

  getModules(companyId: string): Observable<ApiResponse<WorkspaceModulesOverview>> {
    return this.http.get<ApiResponse<WorkspaceModulesOverview>>(
      `${this.baseUrl}/companies/${companyId}/modules`,
    );
  }

  enableModule(companyId: string, moduleKey: string): Observable<ApiResponse<Record<string, any>>> {
    return this.http.post<ApiResponse<Record<string, any>>>(
      `${this.baseUrl}/companies/${companyId}/modules/${encodeURIComponent(moduleKey)}/enable`,
      {},
    );
  }

  configureModule(companyId: string, moduleKey: string): Observable<ApiResponse<Record<string, any>>> {
    return this.http.post<ApiResponse<Record<string, any>>>(
      `${this.baseUrl}/companies/${companyId}/modules/${encodeURIComponent(moduleKey)}/configure`,
      {},
    );
  }
}
