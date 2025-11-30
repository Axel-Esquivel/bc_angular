import { HttpClient } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { APP_CONFIG, AppConfig } from '../config/app-config';
import { ApiResponse } from '../../shared/models/api-response.model';

@Injectable({ providedIn: 'root' })
export class WorkspacesApiService {
  private readonly baseUrl: string;

  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig, private readonly http: HttpClient) {
    this.baseUrl = `${this.config.apiBaseUrl}/workspaces`;
  }

  createWorkspace(dto: { name: string; description?: string }): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(this.baseUrl, dto);
  }

  addMember(workspaceId: string, dto: { userId: string; roleId: string }): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.baseUrl}/${workspaceId}/members`, dto);
  }

  listMyWorkspaces(): Observable<ApiResponse<any>> {
    // TODO: implementar en backend (WorkspacesController)
    return this.http.get<ApiResponse<any>>(this.baseUrl);
  }
}
