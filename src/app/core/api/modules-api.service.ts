import { HttpClient } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { APP_CONFIG_TOKEN, AppConfig } from '../config/app-config';
import { ApiResponse } from '../../shared/models/api-response.model';
import { ModuleInfo } from '../../shared/models/module.model';

export interface ModuleDefinition {
  id: string;
  name: string;
  version: string;
  dependencies?: string[];
  setupWizard?: unknown;
  settingsSchema?: unknown;
  isSystem?: boolean;
  isInstallable?: boolean;
}

@Injectable({ providedIn: 'root' })
export class ModulesApiService {
  private readonly baseUrl: string;

  constructor(@Inject(APP_CONFIG_TOKEN) private readonly config: AppConfig, private readonly http: HttpClient) {
    this.baseUrl = `${this.config.apiBaseUrl}/modules`;
  }

  getModules(): Observable<ApiResponse<ModuleInfo[]>> {
    return this.http.get<ApiResponse<ModuleInfo[]>>(this.baseUrl);
  }

  installModule(name: string): Observable<ApiResponse<ModuleInfo>> {
    return this.http.post<ApiResponse<ModuleInfo>>(`${this.baseUrl}/install`, { name });
  }

  uninstallModule(name: string): Observable<ApiResponse<ModuleInfo>> {
    return this.http.post<ApiResponse<ModuleInfo>>(`${this.baseUrl}/uninstall`, { name });
  }

  getDefinitions(workspaceId: string): Observable<ApiResponse<ModuleDefinition[]>> {
    return this.http.get<ApiResponse<ModuleDefinition[]>>(
      `${this.baseUrl}/definitions?workspaceId=${encodeURIComponent(workspaceId)}`
    );
  }
}
