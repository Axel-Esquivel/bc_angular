import { HttpClient } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { APP_CONFIG_TOKEN, AppConfig } from '../../../core/config/app-config';
import { ApiResponse } from '../../../shared/models/api-response.model';
import {
  CreateInventoryLocationPayload,
  InventoryLocation,
} from '../models/organization-locations.models';

@Injectable({ providedIn: 'root' })
export class OrganizationLocationsApiService {
  private readonly baseUrl: string;

  constructor(@Inject(APP_CONFIG_TOKEN) private readonly config: AppConfig, private readonly http: HttpClient) {
    this.baseUrl = `${this.config.apiBaseUrl}/organizations`;
  }

  list(
    organizationId: string,
    companyId: string,
  ): Observable<ApiResponse<InventoryLocation[]>> {
    return this.http.get<ApiResponse<InventoryLocation[]>>(
      `${this.baseUrl}/${organizationId}/companies/${companyId}/locations`,
    );
  }

  create(
    organizationId: string,
    companyId: string,
    payload: CreateInventoryLocationPayload,
  ): Observable<ApiResponse<InventoryLocation>> {
    return this.http.post<ApiResponse<InventoryLocation>>(
      `${this.baseUrl}/${organizationId}/companies/${companyId}/locations`,
      payload,
    );
  }
}
