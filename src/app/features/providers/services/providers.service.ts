import { HttpClient } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { APP_CONFIG_TOKEN, AppConfig } from '../../../core/config/app-config';
import { ApiResponse } from '../../../shared/models/api-response.model';
import { CreateOrUpdateProviderDto, Provider } from '../../../shared/models/provider.model';

export interface CreateProviderPayload extends CreateOrUpdateProviderDto {
  OrganizationId: string;
  companyId: string;
}

export interface UpdateProviderPayload extends CreateOrUpdateProviderDto {
  OrganizationId?: string;
  companyId?: string;
}

@Injectable({ providedIn: 'root' })
export class ProvidersService {
  private readonly baseUrl: string;

  constructor(
    @Inject(APP_CONFIG_TOKEN) private readonly config: AppConfig,
    private readonly http: HttpClient,
  ) {
    this.baseUrl = `${this.config.apiBaseUrl}/providers`;
  }

  getAll(): Observable<ApiResponse<Provider[]>> {
    return this.http.get<ApiResponse<Provider[]>>(this.baseUrl);
  }

  create(payload: CreateProviderPayload): Observable<ApiResponse<Provider>> {
    return this.http.post<ApiResponse<Provider>>(this.baseUrl, payload);
  }

  update(id: string, payload: UpdateProviderPayload): Observable<ApiResponse<Provider>> {
    return this.http.patch<ApiResponse<Provider>>(`${this.baseUrl}/${id}`, payload);
  }
}
