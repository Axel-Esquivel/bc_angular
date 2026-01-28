import { HttpClient } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { APP_CONFIG_TOKEN, AppConfig } from '../../../core/config/app-config';
import { ApiResponse } from '../../../shared/models/api-response.model';
import {
  OrganizationModulesOverviewResponse,
  OrganizationModulesUpdatePayload,
  OrganizationModuleState,
} from '../models/organization-module.models';

@Injectable({ providedIn: 'root' })
export class OrganizationModulesApiService {
  private readonly baseUrl: string;

  constructor(@Inject(APP_CONFIG_TOKEN) private readonly config: AppConfig, private readonly http: HttpClient) {
    this.baseUrl = `${this.config.apiBaseUrl}/organizations`;
  }

  getOverview(organizationId: string): Observable<ApiResponse<OrganizationModulesOverviewResponse>> {
    return this.http.get<ApiResponse<OrganizationModulesOverviewResponse>>(
      `${this.baseUrl}/${organizationId}/modules`,
    );
  }

  updateModules(
    organizationId: string,
    payload: OrganizationModulesUpdatePayload,
  ): Observable<ApiResponse<OrganizationModulesOverviewResponse>> {
    return this.http.patch<ApiResponse<OrganizationModulesOverviewResponse>>(
      `${this.baseUrl}/${organizationId}/modules`,
      payload,
    );
  }

  markConfigured(
    organizationId: string,
    moduleKey: string,
  ): Observable<ApiResponse<OrganizationModuleState>> {
    return this.http.patch<ApiResponse<OrganizationModuleState>>(
      `${this.baseUrl}/${organizationId}/modules/${moduleKey}/configured`,
      {},
    );
  }
}
