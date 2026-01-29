import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { Observable, of, tap, throwError, timer, mergeMap, retryWhen } from 'rxjs';

import { APP_CONFIG_TOKEN, AppConfig } from '../config/app-config';
import { ApiResponse } from '../../shared/models/api-response.model';
import { Country } from '../../shared/models/country.model';

@Injectable({ providedIn: 'root' })
export class CountriesApiService {
  private readonly baseUrl: string;
  private cachedList: Country[] | null = null;

  constructor(@Inject(APP_CONFIG_TOKEN) private readonly config: AppConfig, private readonly http: HttpClient) {
    this.baseUrl = `${this.config.apiBaseUrl}/countries`;
  }

  list(query?: string): Observable<ApiResponse<Country[]>> {
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
    return this.http.get<ApiResponse<Country[]>>(this.baseUrl, { params }).pipe(
      retryWhen((errors) =>
        errors.pipe(
          mergeMap((error, retryIndex) => {
            const attempt = retryIndex + 1;
            if (!(error instanceof HttpErrorResponse)) {
              return throwError(() => error);
            }
            const status = error.status;
            const retryable =
              attempt <= 1 && status >= 500 && status !== 502 && status !== 503 && status !== 0;
            if (!retryable) {
              return throwError(() => error);
            }
            return timer(250 * attempt);
          })
        )
      ),
      tap((response) => {
        if (!query && Array.isArray(response?.result)) {
          this.cachedList = response.result;
        }
      })
    );
  }

  create(payload: {
    iso2?: string;
    iso3?: string;
    nameEs?: string;
    nameEn?: string;
    code?: string;
    name?: string;
    phoneCode?: string;
  }): Observable<ApiResponse<Country>> {
    return this.http.post<ApiResponse<Country>>(this.baseUrl, payload).pipe(
      tap(() => {
        this.cachedList = null;
      })
    );
  }

  update(id: string, payload: Partial<Country>): Observable<ApiResponse<Country>> {
    return this.http.patch<ApiResponse<Country>>(`${this.baseUrl}/${encodeURIComponent(id)}`, payload).pipe(
      tap(() => {
        this.cachedList = null;
      })
    );
  }
}
