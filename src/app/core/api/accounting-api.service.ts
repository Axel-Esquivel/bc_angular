import { HttpClient, HttpParams } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { APP_CONFIG_TOKEN, AppConfig } from '../config/app-config';
import { ApiResponse } from '../../shared/models/api-response.model';

export interface AccountingAccount {
  id: string;
  code: string;
  name: string;
}

@Injectable({ providedIn: 'root' })
export class AccountingApiService {
  private readonly baseUrl: string;

  constructor(@Inject(APP_CONFIG_TOKEN) private readonly config: AppConfig, private readonly http: HttpClient) {
    this.baseUrl = `${this.config.apiBaseUrl}/accounting`;
  }

  listAccounts(OrganizationId?: string, companyId?: string): Observable<ApiResponse<AccountingAccount[]>> {
    let params = new HttpParams();
    if (OrganizationId) params = params.set('OrganizationId', OrganizationId);
    if (companyId) params = params.set('companyId', companyId);
    return this.http.get<ApiResponse<AccountingAccount[]>>(`${this.baseUrl}/accounts`, { params });
  }
}
