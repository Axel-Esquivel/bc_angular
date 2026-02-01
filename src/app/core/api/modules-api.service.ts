import { HttpClient } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';

import { APP_CONFIG_TOKEN, AppConfig } from '../config/app-config';
import { ApiResponse } from '../../shared/models/api-response.model';
import { ModuleInfo } from '../../shared/models/module.model';

interface ModuleDescriptor {
  config: {
    name: string;
    version: string;
    enabled: boolean;
    dependencies?: string[];
    isSystem?: boolean;
    isInstallable?: boolean;
    setupWizard?: unknown;
    settingsSchema?: unknown;
  };
  resolvedDependencies: string[];
  missingDependencies: string[];
  degraded: boolean;
}

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
    return this.http.get<ApiResponse<ModuleDescriptor[]>>(this.baseUrl).pipe(
      map((response) => ({
        ...response,
        result: Array.isArray(response?.result) ? response.result.map((item) => this.mapDescriptor(item)) : [],
      }))
    );
  }

  installModule(name: string): Observable<ApiResponse<ModuleInfo>> {
    return this.http.post<ApiResponse<ModuleDescriptor>>(`${this.baseUrl}/install`, { name }).pipe(
      map((response) => ({
        ...response,
        result: this.mapDescriptor(response.result as ModuleDescriptor),
      }))
    );
  }

  uninstallModule(name: string): Observable<ApiResponse<ModuleInfo>> {
    return this.http.post<ApiResponse<ModuleDescriptor>>(`${this.baseUrl}/uninstall`, { name }).pipe(
      map((response) => ({
        ...response,
        result: this.mapDescriptor(response.result as ModuleDescriptor),
      }))
    );
  }

  getDefinitions(OrganizationId: string): Observable<ApiResponse<ModuleDefinition[]>> {
    return this.http.get<ApiResponse<ModuleDefinition[]>>(
      `${this.baseUrl}/definitions?OrganizationId=${encodeURIComponent(OrganizationId)}`
    );
  }

  private mapDescriptor(descriptor: ModuleDescriptor): ModuleInfo {
    return {
      name: descriptor.config.name,
      version: descriptor.config.version,
      enabled: descriptor.config.enabled,
      dependencies: descriptor.config.dependencies ?? [],
      resolvedDependencies: descriptor.resolvedDependencies ?? [],
      missingDependencies: descriptor.missingDependencies ?? [],
      degraded: descriptor.degraded ?? false,
      description: undefined,
    };
  }
}
