import { HttpClient } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { APP_CONFIG_TOKEN, AppConfig } from '../config/app-config';
import { ApiResponse } from '../../shared/models/api-response.model';
import { Product } from '../../shared/models/product.model';

@Injectable({ providedIn: 'root' })
export class ProductCategoriesApiService {
  private readonly baseUrl: string;

  constructor(@Inject(APP_CONFIG_TOKEN) private readonly config: AppConfig, private readonly http: HttpClient) {
    this.baseUrl = `${this.config.apiBaseUrl}/products`;
  }

  listCategories(): Observable<string[]> {
    return this.http.get<ApiResponse<Product[]>>(this.baseUrl).pipe(
      map((response) => {
        const categories = (response.result ?? [])
          .map((product) => product.category?.trim())
          .filter((value): value is string => Boolean(value));
        return Array.from(new Set(categories)).sort();
      })
    );
  }
}
