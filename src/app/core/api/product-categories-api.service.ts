import { HttpClient } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { APP_CONFIG_TOKEN, AppConfig } from '../config/app-config';
import { ApiResponse } from '../../shared/models/api-response.model';

export interface ProductCategoryTreeNode {
  id: string;
  name: string;
  parentId?: string;
  isActive: boolean;
  children: ProductCategoryTreeNode[];
}

@Injectable({ providedIn: 'root' })
export class ProductCategoriesApiService {
  private readonly baseUrl: string;

  constructor(@Inject(APP_CONFIG_TOKEN) private readonly config: AppConfig, private readonly http: HttpClient) {
    this.baseUrl = `${this.config.apiBaseUrl}/product-categories`;
  }

  getTree(organizationId: string): Observable<ApiResponse<ProductCategoryTreeNode[]>> {
    return this.http.get<ApiResponse<ProductCategoryTreeNode[]>>(
      `${this.baseUrl}/tree`,
      { params: { organizationId } },
    );
  }
}
