import { HttpClient, HttpParams } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';

import { APP_CONFIG_TOKEN, AppConfig } from '../config/app-config';
import { ApiResponse } from '../../shared/models/api-response.model';
import { Company } from '../../shared/models/company.model';
import { CreateOrganizationCompanyDto } from '../../shared/models/organization-company.model';
import { OrganizationModulesOverview } from '../../shared/models/organization-modules.model';

@Injectable({ providedIn: 'root' })
export class CompaniesApiService {
  private readonly baseUrl: string;

  constructor(@Inject(APP_CONFIG_TOKEN) private readonly config: AppConfig, private readonly http: HttpClient) {
    this.baseUrl = `${this.config.apiBaseUrl}`;
  }

  listByOrganization(orgId: string, countryId?: string): Observable<ApiResponse<Company[]>> {
    const params = countryId ? new HttpParams().set('countryId', countryId) : undefined;
    return this.http
      .get<CompanyListResponse>(`${this.baseUrl}/organizations/${orgId}/companies`, { params })
      .pipe(
        map((response) => {
          const companies = normalizeCompanies(extractCompanies(response));
          return {
            status: 'success',
            message: 'Companies loaded',
            result: companies,
            error: null,
          };
        }),
      );
  }

  create(orgId: string, payload: CreateOrganizationCompanyDto): Observable<ApiResponse<Company>> {
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

  getModules(companyId: string): Observable<ApiResponse<OrganizationModulesOverview>> {
    return this.http.get<ApiResponse<OrganizationModulesOverview>>(
      `${this.baseUrl}/companies/${companyId}/modules`,
    );
  }

  enableModule(companyId: string, moduleKey: string): Observable<ApiResponse<Record<string, unknown>>> {
    return this.http.post<ApiResponse<Record<string, unknown>>>(
      `${this.baseUrl}/companies/${companyId}/modules/${encodeURIComponent(moduleKey)}/enable`,
      {},
    );
  }

  configureModule(companyId: string, moduleKey: string): Observable<ApiResponse<Record<string, unknown>>> {
    return this.http.post<ApiResponse<Record<string, unknown>>>(
      `${this.baseUrl}/companies/${companyId}/modules/${encodeURIComponent(moduleKey)}/configure`,
      {},
    );
  }
}

type CompanyListResponse = ApiResponse<Company[]> | { data: Company[] } | Company[];

const extractCompanies = (response: CompanyListResponse): Company[] => {
  if (Array.isArray(response)) {
    return response;
  }
  if (response && typeof response === 'object' && 'result' in response) {
    const result = response.result;
    return Array.isArray(result) ? result : [];
  }
  if (response && typeof response === 'object' && 'data' in response) {
    const data = response.data;
    return Array.isArray(data) ? data : [];
  }
  return [];
};

const getId = (value: { id?: string; _id?: string } | null | undefined): string | undefined => {
  const raw = value?.id ?? value?._id;
  return typeof raw === 'string' && raw.trim().length > 0 ? raw : undefined;
};

const normalizeCompanies = (companies: Company[]): Company[] =>
  companies.map((company) => ({
    ...company,
    id: company.id ?? getId(company),
    enterprises: Array.isArray(company.enterprises)
      ? company.enterprises.map((enterprise) => ({
          ...enterprise,
          id: enterprise.id ?? getId(enterprise),
        }))
      : [],
  }));


