import { HttpClient, HttpParams } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { APP_CONFIG_TOKEN, AppConfig } from '../config/app-config';
import { ApiResponse } from '../../shared/models/api-response.model';
import { Country } from '../../shared/models/country.model';

@Injectable({ providedIn: 'root' })
export class CountriesApiService {
  private readonly baseUrl: string;

  constructor(@Inject(APP_CONFIG_TOKEN) private readonly config: AppConfig, private readonly http: HttpClient) {
    this.baseUrl = `${this.config.apiBaseUrl}/countries`;
  }

  list(query?: string): Observable<ApiResponse<Country[]>> {
    let params = new HttpParams();
    if (query) {
      params = params.set('q', query);
    }
    return this.http.get<ApiResponse<Country[]>>(this.baseUrl, { params });
  }

  create(payload: {
    iso2: string;
    iso3: string;
    nameEs: string;
    nameEn: string;
    phoneCode?: string;
  }): Observable<ApiResponse<Country>> {
    return this.http.post<ApiResponse<Country>>(this.baseUrl, payload);
  }

  update(id: string, payload: Partial<Country>): Observable<ApiResponse<Country>> {
    return this.http.patch<ApiResponse<Country>>(`${this.baseUrl}/${encodeURIComponent(id)}`, payload);
  }
}
