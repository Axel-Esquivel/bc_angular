import { HttpClient, HttpParams } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { APP_CONFIG_TOKEN, AppConfig } from '../config/app-config';
import { ApiResponse } from '../../shared/models/api-response.model';
import { DashboardOverview } from '../../shared/models/dashboard.model';

@Injectable({ providedIn: 'root' })
export class DashboardApiService {
  private readonly baseUrl: string;

  constructor(@Inject(APP_CONFIG_TOKEN) private readonly config: AppConfig, private readonly http: HttpClient) {
    this.baseUrl = `${this.config.apiBaseUrl}/dashboard`;
  }

  getOverview(payload?: { orgId?: string; companyId?: string }): Observable<ApiResponse<DashboardOverview>> {
    let params = new HttpParams();
    if (payload?.orgId) {
      params = params.set('orgId', payload.orgId);
    }
    if (payload?.companyId) {
      params = params.set('companyId', payload.companyId);
    }
    return this.http.get<ApiResponse<DashboardOverview>>(`${this.baseUrl}/overview`, { params });
  }
}
