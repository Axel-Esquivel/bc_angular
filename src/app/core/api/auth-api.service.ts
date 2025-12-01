import { HttpClient } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { APP_CONFIG_TOKEN, AppConfig } from '../config/app-config';
import { ApiResponse } from '../../shared/models/api-response.model';
import { AuthUser, LoginRequest, LoginResult, RegisterRequest, RegisterResult } from '../../shared/models/auth.model';

@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private readonly baseUrl: string;

  constructor(@Inject(APP_CONFIG_TOKEN) private readonly config: AppConfig, private readonly http: HttpClient) {
    this.baseUrl = `${this.config.apiBaseUrl}/auth`;
  }

  login(dto: LoginRequest): Observable<ApiResponse<LoginResult>> {
    return this.http.post<ApiResponse<LoginResult>>(`${this.baseUrl}/login`, dto);
  }

  register(dto: RegisterRequest): Observable<ApiResponse<RegisterResult>> {
    return this.http.post<ApiResponse<RegisterResult>>(`${this.baseUrl}/register`, dto);
  }

  refresh(refreshToken: string): Observable<ApiResponse<LoginResult>> {
    return this.http.post<ApiResponse<LoginResult>>(`${this.baseUrl}/refresh`, { refreshToken });
  }

  me(): Observable<ApiResponse<AuthUser>> {
    return this.http.get<ApiResponse<AuthUser>>(`${this.baseUrl}/me`);
  }
}
