import { HttpClient } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { APP_CONFIG_TOKEN, AppConfig } from '../../../core/config/app-config';
import { ApiResponse } from '../../../shared/models/api-response.model';
import {
  CreatePriceListPayload,
  PriceList,
  UpdatePriceListPayload,
} from '../models/price-list.model';

@Injectable({ providedIn: 'root' })
export class PriceListsService {
  private readonly baseUrl: string;

  constructor(@Inject(APP_CONFIG_TOKEN) private readonly config: AppConfig, private readonly http: HttpClient) {
    this.baseUrl = `${this.config.apiBaseUrl}/price-lists`;
  }

  list(): Observable<ApiResponse<PriceList[]>> {
    return this.http.get<ApiResponse<PriceList[]>>(this.baseUrl);
  }

  getById(id: string): Observable<ApiResponse<PriceList>> {
    return this.http.get<ApiResponse<PriceList>>(`${this.baseUrl}/${encodeURIComponent(id)}`);
  }

  create(payload: CreatePriceListPayload): Observable<ApiResponse<PriceList>> {
    return this.http.post<ApiResponse<PriceList>>(this.baseUrl, payload);
  }

  update(id: string, payload: UpdatePriceListPayload): Observable<ApiResponse<PriceList>> {
    return this.http.patch<ApiResponse<PriceList>>(`${this.baseUrl}/${encodeURIComponent(id)}`, payload);
  }

  replace(id: string, payload: UpdatePriceListPayload): Observable<ApiResponse<PriceList>> {
    return this.http.put<ApiResponse<PriceList>>(`${this.baseUrl}/${encodeURIComponent(id)}`, payload);
  }

  delete(id: string): Observable<ApiResponse<{ id: string }>> {
    return this.http.delete<ApiResponse<{ id: string }>>(`${this.baseUrl}/${encodeURIComponent(id)}`);
  }
}

