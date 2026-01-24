import { HttpClient } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { APP_CONFIG_TOKEN, AppConfig } from '../config/app-config';
import { ApiResponse } from '../../shared/models/api-response.model';
import { Branch } from '../../shared/models/branch.model';

@Injectable({ providedIn: 'root' })
export class BranchesApiService {
  private readonly baseUrl: string;

  constructor(@Inject(APP_CONFIG_TOKEN) private readonly config: AppConfig, private readonly http: HttpClient) {
    this.baseUrl = `${this.config.apiBaseUrl}`;
  }

  listByCompany(companyId: string): Observable<ApiResponse<Branch[]>> {
    return this.http.get<ApiResponse<Branch[]>>(`${this.baseUrl}/companies/${companyId}/branches`);
  }

  create(companyId: string, payload: {
    name: string;
    countryId: string;
    type: 'retail' | 'wholesale';
    currencyIds?: string[];
    settings?: Record<string, any>;
  }): Observable<ApiResponse<Branch>> {
    return this.http.post<ApiResponse<Branch>>(`${this.baseUrl}/companies/${companyId}/branches`, payload);
  }

  update(branchId: string, payload: Partial<Branch>): Observable<ApiResponse<Branch>> {
    return this.http.patch<ApiResponse<Branch>>(`${this.baseUrl}/branches/${branchId}`, payload);
  }
}
