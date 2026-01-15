import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
} from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { Observable, catchError, switchMap, throwError } from 'rxjs';

import { APP_CONFIG_TOKEN, AppConfig } from '../config/app-config';
import { AuthService } from './auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(
    @Inject(APP_CONFIG_TOKEN) private readonly config: AppConfig,
    private readonly authService: AuthService
  ) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const isApiRequest = req.url.startsWith(this.config.apiBaseUrl);
    const accessToken = this.authService.getToken();
    const authReq = isApiRequest && accessToken ? this.withAuthHeader(req, accessToken) : req;

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
    if (!(error instanceof HttpErrorResponse) || error.status !== 401 || !isApiRequest) {
      return throwError(() => error);
    }

    return this.authService.refreshToken().pipe(
      switchMap((tokens) => {
        if (!tokens?.accessToken) {
          this.authService.logout();
          return throwError(() => error);
        }

        const retryRequest = this.withAuthHeader(originalRequest, tokens.accessToken);
        return next.handle(retryRequest);
      }),
      catchError((refreshError) => {
        this.authService.logout();
        return throwError(() => refreshError);
      })
    );
  }

  private withAuthHeader(req: HttpRequest<any>, token: string): HttpRequest<any> {
    return req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    });
  }
}
