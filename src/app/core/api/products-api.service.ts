import { HttpClient, HttpParams } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { APP_CONFIG_TOKEN, AppConfig } from '../config/app-config';
import { ApiResponse, PaginatedResponse } from '../../shared/models/api-response.model';
import { Product } from '../../shared/models/product.model';

@Injectable({ providedIn: 'root' })
export class ProductsApiService {
  private readonly baseUrl: string;

  constructor(@Inject(APP_CONFIG_TOKEN) private readonly config: AppConfig, private readonly http: HttpClient) {
    this.baseUrl = `${this.config.apiBaseUrl}/products`;
  }

  createProduct(dto: Partial<Product>): Observable<ApiResponse<Product>> {
    return this.http.post<ApiResponse<Product>>(this.baseUrl, dto);
  }

  getProducts(params?: { search?: string; category?: string; page?: number; limit?: number }): Observable<ApiResponse<PaginatedResponse<Product>>> {
    let httpParams = new HttpParams();
    if (params?.search) httpParams = httpParams.set('search', params.search);
    if (params?.category) httpParams = httpParams.set('category', params.category);
    if (params?.page) httpParams = httpParams.set('page', params.page);
    if (params?.limit) httpParams = httpParams.set('limit', params.limit);

    return this.http.get<ApiResponse<PaginatedResponse<Product>>>(this.baseUrl, { params: httpParams });
  }

  getProductById(id: string): Observable<ApiResponse<Product>> {
    return this.http.get<ApiResponse<Product>>(`${this.baseUrl}/${id}`);
  }

  updateProduct(id: string, dto: Partial<Product>): Observable<ApiResponse<Product>> {
    return this.http.patch<ApiResponse<Product>>(`${this.baseUrl}/${id}`, dto);
  }

  deleteProduct(id: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/${id}`);
  }
}
