import { HttpClient } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { APP_CONFIG_TOKEN, AppConfig } from '../config/app-config';
import { ApiResponse } from '../../shared/models/api-response.model';
import { OrganizationCoreSettings, OrganizationCoreSettingsUpdate } from '../../shared/models/organization-core-settings.model';
import { OrganizationStructureSettings, OrganizationStructureSettingsUpdate } from '../../shared/models/organization-structure-settings.model';

@Injectable({ providedIn: 'root' })
export class OrganizationSettingsApiService {
  private readonly baseUrl: string;

  constructor(@Inject(APP_CONFIG_TOKEN) private readonly config: AppConfig, private readonly http: HttpClient) {
    this.baseUrl = `${this.config.apiBaseUrl}/organizations`;
  }

  getCoreSettings(organizationId: string): Observable<ApiResponse<OrganizationCoreSettings>> {
    return this.http.get<ApiResponse<OrganizationCoreSettings>>(
      `${this.baseUrl}/${organizationId}/settings/core`
    );
  }

  updateCoreSettings(
    organizationId: string,
    payload: OrganizationCoreSettingsUpdate
  ): Observable<ApiResponse<OrganizationCoreSettings>> {
    return this.http.patch<ApiResponse<OrganizationCoreSettings>>(
      `${this.baseUrl}/${organizationId}/settings/core`,
      payload
    );
  }

  getStructureSettings(organizationId: string): Observable<ApiResponse<OrganizationStructureSettings>> {
    return this.http.get<ApiResponse<OrganizationStructureSettings>>(
      `${this.baseUrl}/${organizationId}/settings/structure`
    );
  }

  updateStructureSettings(
    organizationId: string,
    payload: OrganizationStructureSettingsUpdate
  ): Observable<ApiResponse<OrganizationStructureSettings>> {
    return this.http.patch<ApiResponse<OrganizationStructureSettings>>(
      `${this.baseUrl}/${organizationId}/settings/structure`,
      payload
    );
  }
}
