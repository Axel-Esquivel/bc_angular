import { HttpClient, HttpParams } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { Observable, of, tap } from 'rxjs';

import { APP_CONFIG_TOKEN, AppConfig } from '../config/app-config';
import { ApiResponse } from '../../shared/models/api-response.model';
import { Currency } from '../../shared/models/currency.model';

@Injectable({ providedIn: 'root' })
export class CurrenciesApiService {
  private readonly baseUrl: string;
  private cachedList: Currency[] | null = null;

  constructor(@Inject(APP_CONFIG_TOKEN) private readonly config: AppConfig, private readonly http: HttpClient) {
    this.baseUrl = `${this.config.apiBaseUrl}/currencies`;
  }

  list(query?: string): Observable<ApiResponse<Currency[]>> {
    if (!query && this.cachedList) {
      return of({
        status: 'success',
        message: 'Cached',
        result: this.cachedList,
        error: null,
      });
    }
    let params = new HttpParams();
    if (query) {
      params = params.set('q', query);
    }
    return this.http.get<ApiResponse<Currency[]>>(this.baseUrl, { params }).pipe(
      tap((response) => {
        if (!query && Array.isArray(response?.result)) {
          this.cachedList = response.result;
        }
      })
    );
  }

  create(payload: { code: string; name: string; symbol?: string }): Observable<ApiResponse<Currency>> {
    return this.http.post<ApiResponse<Currency>>(this.baseUrl, payload).pipe(
      tap(() => {
        this.cachedList = null;
      })
    );
  }

  update(id: string, payload: Partial<Currency>): Observable<ApiResponse<Currency>> {
    return this.http.patch<ApiResponse<Currency>>(`${this.baseUrl}/${encodeURIComponent(id)}`, payload).pipe(
      tap(() => {
        this.cachedList = null;
      })
    );
  }

  delete(id: string): Observable<ApiResponse<{ id: string }>> {
    return this.http.delete<ApiResponse<{ id: string }>>(`${this.baseUrl}/${encodeURIComponent(id)}`).pipe(
      tap(() => {
        this.cachedList = null;
      })
    );
  }
}
