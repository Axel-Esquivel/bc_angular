import { HttpClient } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { APP_CONFIG, AppConfig } from '../config/app-config';
import { ApiResponse } from '../../shared/models/api-response.model';
import { AuthPayload, LoginRequest, RefreshRequest, RegisterRequest } from '../../shared/models/auth.model';

@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private readonly baseUrl: string;

  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig, private readonly http: HttpClient) {
    this.baseUrl = `${this.config.apiBaseUrl}/auth`;
  }

  login(dto: LoginRequest): Observable<ApiResponse<AuthPayload>> {
    return this.http.post<ApiResponse<AuthPayload>>(`${this.baseUrl}/login`, dto);
  }

  register(dto: RegisterRequest): Observable<ApiResponse<AuthPayload>> {
    return this.http.post<ApiResponse<AuthPayload>>(`${this.baseUrl}/register`, dto);
  }

  refresh(dto: RefreshRequest): Observable<ApiResponse<AuthPayload>> {
    return this.http.post<ApiResponse<AuthPayload>>(`${this.baseUrl}/refresh`, dto);
  }

  me(): Observable<ApiResponse<AuthPayload>> {
    return this.http.get<ApiResponse<AuthPayload>>(`${this.baseUrl}/me`);
  }
}
