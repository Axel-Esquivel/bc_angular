import { HttpClient } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { Observable, catchError, of } from 'rxjs';

import { APP_CONFIG_TOKEN, AppConfig } from '../config/app-config';
import { ApiResponse } from '../../shared/models/api-response.model';
import { Workspace } from '../../shared/models/workspace.model';

@Injectable({ providedIn: 'root' })
export class WorkspacesApiService {
  private readonly baseUrl: string;

  constructor(@Inject(APP_CONFIG_TOKEN) private readonly config: AppConfig, private readonly http: HttpClient) {
    this.baseUrl = `${this.config.apiBaseUrl}/workspaces`;
  }

  createWorkspace(dto: { name: string; description?: string }): Observable<ApiResponse<Workspace>> {
    return this.http.post<ApiResponse<Workspace>>(this.baseUrl, dto);
  }

  addMember(workspaceId: string, dto: { userId: string; roleId: string }): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.baseUrl}/${workspaceId}/members`, dto);
  }

  listMyWorkspaces(): Observable<ApiResponse<Workspace[]>> {
    return this.http.get<ApiResponse<Workspace[]>>(this.baseUrl).pipe(
      catchError(() => {
        const mockResponse: ApiResponse<Workspace[]> = {
          status: 'success',
          message:
            'Datos simulados mientras el endpoint GET /api/workspaces no está disponible en el backend (ver docs/04_API_BACKEND_MAPPING.md).',
          result: this.mockWorkspaces,
          error: null,
        };
        return of(mockResponse);
      })
    );
  }

  private get mockWorkspaces(): Workspace[] {
    return [
      { id: 'demo-1', name: 'Workspace demo', description: 'Datos locales hasta que exista GET /workspaces' },
      { id: 'demo-2', name: 'Tienda Central', description: 'Ejemplo de multi-sucursal' },
    ];
  }
}
