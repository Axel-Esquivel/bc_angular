import { HttpClient } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { APP_CONFIG_TOKEN, AppConfig } from '../config/app-config';
import { ApiResponse } from '../../shared/models/api-response.model';
import { Workspace } from '../../shared/models/workspace.model';
import { WorkspaceModulesOverview } from '../../shared/models/workspace-modules.model';

@Injectable({ providedIn: 'root' })
export class WorkspacesApiService {
  private readonly baseUrl: string;

  constructor(@Inject(APP_CONFIG_TOKEN) private readonly config: AppConfig, private readonly http: HttpClient) {
    this.baseUrl = `${this.config.apiBaseUrl}/workspaces`;
  }

  createWorkspace(dto: { name: string }): Observable<ApiResponse<Workspace>> {
    return this.http.post<ApiResponse<Workspace>>(this.baseUrl, dto);
  }

  joinWorkspace(dto: { code: string }): Observable<ApiResponse<Workspace>> {
    return this.http.post<ApiResponse<Workspace>>(`${this.baseUrl}/join`, dto);
  }

  getWorkspaceModules(workspaceId: string): Observable<ApiResponse<WorkspaceModulesOverview>> {
    return this.http.get<ApiResponse<WorkspaceModulesOverview>>(`${this.baseUrl}/${workspaceId}/modules`);
  }

  updateWorkspaceModules(
    workspaceId: string,
    modules: { key: string; enabled: boolean }[]
  ): Observable<ApiResponse<{ key: string; enabled: boolean }[]>> {
    return this.http.patch<ApiResponse<{ key: string; enabled: boolean }[]>>(
      `${this.baseUrl}/${workspaceId}/modules`,
      { modules }
    );
  }

  listMyWorkspaces(): Observable<ApiResponse<Workspace[]>> {
    return this.http.get<ApiResponse<Workspace[]>>(this.baseUrl);
  }
}
