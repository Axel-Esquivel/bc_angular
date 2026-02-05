import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
} from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { Observable, catchError, switchMap, throwError } from 'rxjs';
import { MessageService } from 'primeng/api';

import { APP_CONFIG_TOKEN, AppConfig } from '../config/app-config';
import { AuthService } from './auth.service';
import { AuthStateService } from './auth-state.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(
    @Inject(APP_CONFIG_TOKEN) private readonly config: AppConfig,
    private readonly authService: AuthService,
    private readonly authState: AuthStateService,
    private readonly messageService: MessageService
  ) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const isApiRequest =
      req.url.startsWith(this.config.apiBaseUrl) ||
      req.url.startsWith('/api') ||
      req.url.includes('/api/');
    const accessToken = this.authState.getAccessToken();
    const authReq = accessToken ? this.withAuthHeader(req, accessToken) : req;

    return next.handle(authReq).pipe(
      catchError((error) => this.handleError(error, req, next, isApiRequest))
    );
  }

  private handleError(
    error: unknown,
    originalRequest: HttpRequest<any>,
    next: HttpHandler,
    isApiRequest: boolean
  ): Observable<HttpEvent<any>> {
    if (!(error instanceof HttpErrorResponse) || !isApiRequest) {
      return throwError(() => error);
    }

    if (error.status === 0) {
      this.messageService.add({
        severity: 'error',
        summary: 'Acceso',
        detail: 'Servidor no disponible.',
      });
      return throwError(() => error);
    }

    if (error.status === 403) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Acceso',
        detail: 'Sin permisos.',
      });
      return throwError(() => error);
    }

    if (error.status === 404) {
      this.messageService.add({
        severity: 'error',
        summary: 'Acceso',
        detail: 'Ruta no encontrada.',
      });
      return throwError(() => error);
    }

    if (error.status !== 401 && error.status !== 419) {
      return throwError(() => error);
    }

    if (this.isAuthEndpoint(originalRequest.url)) {
      return throwError(() => error);
    }

    return this.authService.refreshToken().pipe(
      switchMap((tokens) => {
        if (!tokens?.accessToken) {
          this.authService.logoutLocal();
          return throwError(() => error);
        }

        const retryRequest = this.withAuthHeader(originalRequest, tokens.accessToken);
        return next.handle(retryRequest);
      }),
      catchError((refreshError) => {
        const status = refreshError instanceof HttpErrorResponse ? refreshError.status : null;
        if (status === 401 || status === 419) {
          this.authService.logoutLocal();
        }
        return throwError(() => refreshError);
      })
    );
  }

  private withAuthHeader(req: HttpRequest<any>, token: string): HttpRequest<any> {
    return req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    });
  }

  private isAuthEndpoint(url: string): boolean {
    return url.includes('/auth/logout') || url.includes('/auth/me') || url.includes('/auth/refresh');
  }
}
