import { HttpClient } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';

import { APP_CONFIG_TOKEN, AppConfig } from '../config/app-config';
import { ApiResponse } from '../../shared/models/api-response.model';
import { ModuleInfo } from '../../shared/models/module.model';

export interface SetupStatus {
  installed: boolean;
}

export interface SetupInitializePayload {
  dbName: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
}

export interface SetupModuleUpdatePayload {
  name: string;
  enabled: boolean;
}

@Injectable({ providedIn: 'root' })
export class SetupApiService {
  private readonly baseUrl: string;

  constructor(@Inject(APP_CONFIG_TOKEN) private readonly config: AppConfig, private readonly http: HttpClient) {
    this.baseUrl = `${this.config.apiBaseUrl}/setup`;
  }

  getStatus(): Observable<ApiResponse<SetupStatus>> {
    const url = `${this.baseUrl}/status`;
    return this.http.get<ApiResponse<SetupStatus>>(url).pipe(
      catchError((error) => {
        const status = error?.status ?? 'unknown';
        // eslint-disable-next-line no-console
        console.warn('[api] setup status failed', { url, status });
        return throwError(() => error);
      }),
    );
  }

  initialize(payload: SetupInitializePayload): Observable<ApiResponse<{ installed: boolean }>> {
    return this.http.post<ApiResponse<{ installed: boolean }>>(`${this.baseUrl}/initialize`, payload);
  }

  getModules(): Observable<ApiResponse<ModuleInfo[]>> {
    return this.http.get<ApiResponse<ModuleInfo[]>>(`${this.baseUrl}/modules`);
  }

  updateModule(payload: SetupModuleUpdatePayload): Observable<ApiResponse<ModuleInfo>> {
    return this.http.post<ApiResponse<ModuleInfo>>(`${this.baseUrl}/modules/enable`, payload);
  }
}
