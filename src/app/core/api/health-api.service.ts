import { HttpClient } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';

import { APP_CONFIG_TOKEN, AppConfig } from '../config/app-config';
import { ApiResponse } from '../../shared/models/api-response.model';

export interface HealthStatus {
  status: string;
  timestamp: string;
}

@Injectable({ providedIn: 'root' })
export class HealthApiService {
  private readonly baseUrl: string;

  constructor(@Inject(APP_CONFIG_TOKEN) private readonly config: AppConfig, private readonly http: HttpClient) {
    this.baseUrl = `${this.config.apiBaseUrl}/health`;
  }

  getStatus(): Observable<ApiResponse<HealthStatus>> {
    return this.http.get<ApiResponse<HealthStatus>>(this.baseUrl).pipe(
      catchError((error) => {
        const status = error?.status ?? 'unknown';
        return throwError(() => error);
      }),
    );
  }
}
