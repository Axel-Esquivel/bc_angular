import { HttpClient, HttpParams } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { APP_CONFIG_TOKEN, AppConfig } from '../config/app-config';
import { ApiResponse } from '../../shared/models/api-response.model';

export interface UomCategory {
  id: string;
  name: string;
  organizationId: string;
  isActive: boolean;
}

export interface UomUnit {
  id: string;
  name: string;
  symbol: string;
  categoryId: string;
  factor: number;
  isBase: boolean;
  organizationId: string;
  isActive: boolean;
}

export interface CreateUomCategoryPayload {
  name: string;
  organizationId: string;
}

export interface CreateUomUnitPayload {
  name: string;
  symbol: string;
  categoryId: string;
  factor: number;
  organizationId: string;
}

@Injectable({ providedIn: 'root' })
export class UomApiService {
  private readonly baseUrl: string;

  constructor(@Inject(APP_CONFIG_TOKEN) private readonly config: AppConfig, private readonly http: HttpClient) {
    this.baseUrl = `${this.config.apiBaseUrl}/uoms`;
  }

  getCategories(organizationId: string): Observable<ApiResponse<UomCategory[]>> {
    const params = new HttpParams().set('organizationId', organizationId);
    return this.http.get<ApiResponse<UomCategory[]>>(`${this.baseUrl}/categories`, { params });
  }

  createCategory(payload: CreateUomCategoryPayload): Observable<ApiResponse<UomCategory>> {
    return this.http.post<ApiResponse<UomCategory>>(`${this.baseUrl}/categories`, payload);
  }

  getUnits(organizationId: string, categoryId?: string): Observable<ApiResponse<UomUnit[]>> {
    let params = new HttpParams().set('organizationId', organizationId);
    if (categoryId) {
      params = params.set('categoryId', categoryId);
    }
    return this.http.get<ApiResponse<UomUnit[]>>(this.baseUrl, { params });
  }

  createUnit(payload: CreateUomUnitPayload): Observable<ApiResponse<UomUnit>> {
    return this.http.post<ApiResponse<UomUnit>>(this.baseUrl, payload);
  }
}
