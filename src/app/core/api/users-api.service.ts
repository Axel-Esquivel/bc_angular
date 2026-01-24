import { HttpClient } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';

import { APP_CONFIG_TOKEN, AppConfig } from '../config/app-config';
import { ApiResponse } from '../../shared/models/api-response.model';
import { AuthUser } from '../../shared/models/auth.model';

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

  setDefaultWorkspace(workspaceId: string): Observable<ApiResponse<AuthUser>> {
    return this.http.patch<ApiResponse<AuthUser>>(`${this.baseUrl}/me/default-workspace`, { workspaceId });
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
