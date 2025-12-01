import { HttpClient } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { APP_CONFIG_TOKEN, AppConfig } from '../config/app-config';
import { ApiResponse } from '../../shared/models/api-response.model';
import { PosCart, PosCartLine, PosPayment } from '../../shared/models/pos.model';

@Injectable({ providedIn: 'root' })
export class PosApiService {
  private readonly baseUrl: string;

  constructor(@Inject(APP_CONFIG_TOKEN) private readonly config: AppConfig, private readonly http: HttpClient) {
    this.baseUrl = `${this.config.apiBaseUrl}/pos`;
  }

  // TODO: Confirmar estos endpoints en `pos.controller.ts` del backend antes de usarlos en producción

  createCart(): Observable<ApiResponse<PosCart>> {
    return this.http.post<ApiResponse<PosCart>>(`${this.baseUrl}/carts`, {});
  }

  addLine(cartId: string, line: { productId: string; quantity: number }): Observable<ApiResponse<PosCartLine>> {
    return this.http.post<ApiResponse<PosCartLine>>(`${this.baseUrl}/carts/${cartId}/lines`, line);
  }

  confirmSale(cartId: string): Observable<ApiResponse<PosCart>> {
    return this.http.post<ApiResponse<PosCart>>(`${this.baseUrl}/carts/${cartId}/confirm`, {});
  }

  registerPayment(cartId: string, payment: PosPayment): Observable<ApiResponse<PosCart>> {
    return this.http.post<ApiResponse<PosCart>>(`${this.baseUrl}/carts/${cartId}/payments`, payment);
  }
}
