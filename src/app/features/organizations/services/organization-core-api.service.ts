import { HttpClient } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { APP_CONFIG_TOKEN, AppConfig } from '../../../core/config/app-config';
import { ApiResponse } from '../../../shared/models/api-response.model';
import {
  CoreCompany,
  CoreCompanyCreatePayload,
  CoreCountry,
  CoreCountryCreatePayload,
  CoreCurrency,
  CoreCurrencyCreatePayload,
  OrganizationCoreSettings,
  OrganizationCoreSettingsUpdatePayload,
} from '../models/organization-core.models';

@Injectable({ providedIn: 'root' })
export class OrganizationCoreApiService {
  private readonly baseUrl: string;

  constructor(@Inject(APP_CONFIG_TOKEN) private readonly config: AppConfig, private readonly http: HttpClient) {
    this.baseUrl = `${this.config.apiBaseUrl}/organizations`;
  }

  getCoreSettings(organizationId: string): Observable<ApiResponse<OrganizationCoreSettings>> {
    return this.http.get<ApiResponse<OrganizationCoreSettings>>(
      `${this.baseUrl}/${organizationId}/core-settings`,
    );
  }

  updateCoreSettings(
    organizationId: string,
    payload: OrganizationCoreSettingsUpdatePayload,
  ): Observable<ApiResponse<OrganizationCoreSettings>> {
    return this.http.patch<ApiResponse<OrganizationCoreSettings>>(
      `${this.baseUrl}/${organizationId}/core-settings`,
      payload,
    );
  }

  addCountry(
    organizationId: string,
    payload: CoreCountryCreatePayload,
  ): Observable<ApiResponse<CoreCountry>> {
    return this.http.post<ApiResponse<CoreCountry>>(
      `${this.baseUrl}/${organizationId}/countries`,
      payload,
    );
  }

  addCurrency(
    organizationId: string,
    payload: CoreCurrencyCreatePayload,
  ): Observable<ApiResponse<CoreCurrency>> {
    return this.http.post<ApiResponse<CoreCurrency>>(
      `${this.baseUrl}/${organizationId}/currencies`,
      payload,
    );
  }

  addCompany(
    organizationId: string,
    payload: CoreCompanyCreatePayload,
  ): Observable<ApiResponse<CoreCompany>> {
    return this.http.post<ApiResponse<CoreCompany>>(
      `${this.baseUrl}/${organizationId}/companies`,
      payload,
    );
  }
}
