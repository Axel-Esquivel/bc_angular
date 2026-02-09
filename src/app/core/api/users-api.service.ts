import { HttpClient } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';

import { APP_CONFIG_TOKEN, AppConfig } from '../config/app-config';
import { ApiResponse } from '../../shared/models/api-response.model';
import { AuthUser } from '../../shared/models/auth.model';
import { DefaultContext, DefaultContextValidationResult } from '../../shared/models/default-context.model';

export interface ResolvedUser {
  id: string;
  email: string;
  name?: string;
}

@Injectable({ providedIn: 'root' })
export class UsersApiService {
  private readonly baseUrl: string;
  private readonly resolvedCache = new Map<string, ResolvedUser>();

  constructor(@Inject(APP_CONFIG_TOKEN) private readonly config: AppConfig, private readonly http: HttpClient) {
    this.baseUrl = `${this.config.apiBaseUrl}/users`;
  }

  setDefaultOrganization(OrganizationId: string): Observable<ApiResponse<AuthUser>> {
    return this.http.patch<ApiResponse<AuthUser>>(`${this.baseUrl}/me/default-Organization`, { OrganizationId });
  }

  setDefaultCompany(companyId: string): Observable<ApiResponse<AuthUser>> {
    return this.http.patch<ApiResponse<AuthUser>>(`${this.baseUrl}/me/default-company`, { companyId });
  }

  setDefaultEnterprise(enterpriseId: string): Observable<ApiResponse<AuthUser>> {
    return this.http.patch<ApiResponse<AuthUser>>(`${this.baseUrl}/me/default-enterprise`, { enterpriseId });
  }

  setDefaultCurrency(currencyId: string): Observable<ApiResponse<AuthUser>> {
    return this.http.patch<ApiResponse<AuthUser>>(`${this.baseUrl}/me/default-currency`, { currencyId });
  }

  setDefaultContextPreferences(defaultContext: DefaultContext): Observable<ApiResponse<AuthUser>> {
    return this.http.put<ApiResponse<AuthUser>>(`${this.baseUrl}/me/preferences/default-context`, defaultContext);
  }

  validateDefaultContext(defaultContext: DefaultContext): Observable<ApiResponse<DefaultContextValidationResult>> {
    return this.http.post<ApiResponse<DefaultContextValidationResult>>(
      `${this.baseUrl}/me/preferences/default-context/validate`,
      defaultContext,
    );
  }

  resolve(ids: string[]): Observable<ResolvedUser[]> {
    const unique = Array.from(new Set((ids ?? []).filter(Boolean)));
    const missing = unique.filter((id) => !this.resolvedCache.has(id));
    if (missing.length === 0) {
      return of(unique.map((id) => this.resolvedCache.get(id)!).filter(Boolean));
    }

    return this.http
      .post<ApiResponse<ResolvedUser[]>>(`${this.baseUrl}/resolve`, { ids: missing })
      .pipe(
        map((response) => {
          const resolved = response.result ?? [];
          resolved.forEach((user) => {
            if (user?.id) {
              this.resolvedCache.set(user.id, user);
            }
          });
          return unique.map((id) => this.resolvedCache.get(id)).filter(Boolean) as ResolvedUser[];
        })
      );
  }
}
