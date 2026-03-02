import { HttpClient, HttpParams } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { APP_CONFIG_TOKEN, AppConfig } from '../config/app-config';
import { ApiResponse } from '../../shared/models/api-response.model';

export interface PackagingName {
  id: string;
  organizationId: string;
  name: string;
  multiplier: number;
  isActive: boolean;
  isSystem?: boolean;
  variableMultiplier?: boolean;
  sortOrder?: number;
}

export interface CreatePackagingNamePayload {
  organizationId: string;
  name: string;
  multiplier: number;
  isActive?: boolean;
  isSystem?: boolean;
  variableMultiplier?: boolean;
}

export interface UpdatePackagingNamePayload {
  name?: string;
  multiplier?: number;
  isActive?: boolean;
  isSystem?: boolean;
  variableMultiplier?: boolean;
  sortOrder?: number;
}

@Injectable({ providedIn: 'root' })
export class PackagingNamesApiService {
  private readonly baseUrl: string;

  constructor(@Inject(APP_CONFIG_TOKEN) private readonly config: AppConfig, private readonly http: HttpClient) {
    this.baseUrl = `${this.config.apiBaseUrl}/packaging-names`;
  }

  list(organizationId: string): Observable<ApiResponse<PackagingName[]>> {
    const params = new HttpParams().set('organizationId', organizationId);
    return this.http.get<ApiResponse<PackagingName[]>>(this.baseUrl, { params });
  }

  create(payload: CreatePackagingNamePayload): Observable<ApiResponse<PackagingName>> {
    return this.http.post<ApiResponse<PackagingName>>(this.baseUrl, payload);
  }

  update(
    id: string,
    organizationId: string,
    payload: UpdatePackagingNamePayload,
  ): Observable<ApiResponse<PackagingName>> {
    const params = new HttpParams().set('organizationId', organizationId);
    return this.http.patch<ApiResponse<PackagingName>>(`${this.baseUrl}/${id}`, payload, { params });
  }
}
