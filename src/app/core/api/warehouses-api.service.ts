import { HttpClient } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { APP_CONFIG_TOKEN, AppConfig } from '../config/app-config';

export interface Warehouse {
  id: string;
  name: string;
  code: string;
  workspaceId: string;
  companyId: string;
}

@Injectable({ providedIn: 'root' })
export class WarehousesApiService {
  private readonly baseUrl: string;

  constructor(@Inject(APP_CONFIG_TOKEN) private readonly config: AppConfig, private readonly http: HttpClient) {
    this.baseUrl = `${this.config.apiBaseUrl}/warehouses`;
  }

  list(): Observable<Warehouse[]> {
    return this.http.get<Warehouse[]>(this.baseUrl);
  }
}
