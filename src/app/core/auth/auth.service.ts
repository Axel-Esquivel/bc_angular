import { Injectable } from '@angular/core';
import {
  BehaviorSubject,
  Observable,
  catchError,
  finalize,
  map,
  of,
  shareReplay,
  switchMap,
  take,
  tap,
  throwError,
} from 'rxjs';

import { AuthApiService } from '../api/auth-api.service';
import { TokenStorageService } from './token-storage.service';
import { ApiResponse } from '../../shared/models/api-response.model';
import {
  AuthPayload,
  AuthTokens,
  AuthUser,
  LoginRequest,
  RefreshRequest,
  RegisterRequest,
} from '../../shared/models/auth.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly currentUserSubject = new BehaviorSubject<AuthUser | null>(null);
  private readonly refreshSubject = new BehaviorSubject<AuthTokens | null>(null);
  private isRefreshing = false;

  constructor(private readonly authApi: AuthApiService, private readonly tokenStorage: TokenStorageService) {}

  login(credentials: LoginRequest): Observable<AuthUser | null> {
    return this.authApi.login(credentials).pipe(
      tap((response) => this.persistAuthPayload(response)),
      map((response) => response.result?.user ?? null)
    );
  }

  register(payload: RegisterRequest): Observable<AuthUser | null> {
    return this.authApi.register(payload).pipe(
      tap((response) => this.persistAuthPayload(response)),
      map((response) => response.result?.user ?? null)
    );
  }

  logout(): void {
    this.tokenStorage.clearTokens();
    this.currentUserSubject.next(null);
  }

  loadMe(): Observable<AuthUser | null> {
    if (!this.isAuthenticated()) {
      this.currentUserSubject.next(null);
      return of(null);
    }

    return this.authApi.me().pipe(
      tap((response) => this.currentUserSubject.next(response.result?.user ?? null)),
      map((response) => response.result?.user ?? null),
      catchError(() => {
        this.logout();
        return of(null);
      })
    );
  }

  getCurrentUser(): Observable<AuthUser | null> {
    if (!this.currentUserSubject.value && this.isAuthenticated()) {
      return this.loadMe().pipe(switchMap(() => this.currentUserSubject.asObservable()));
    }

    return this.currentUserSubject.asObservable();
  }

  isAuthenticated(): boolean {
    return !!this.tokenStorage.getAccessToken();
  }

  refreshSession(): Observable<AuthTokens | null> {
    const refreshToken = this.tokenStorage.getRefreshToken();
    if (!refreshToken) {
      return of(null);
    }

    if (this.isRefreshing) {
      return this.refreshSubject.pipe(take(1));
    }

    this.isRefreshing = true;
    const refreshDto: RefreshRequest = { refreshToken };
    return this.authApi.refresh(refreshDto).pipe(
      map((response) => this.extractTokens(response.result)),
      tap((tokens) => {
        if (tokens) {
          this.tokenStorage.setTokens(tokens);
        }
        this.refreshSubject.next(tokens);
      }),
      finalize(() => {
        this.isRefreshing = false;
      }),
      catchError((error) => {
        this.logout();
        return throwError(() => error);
      }),
      shareReplay(1)
    );
  }

  private persistAuthPayload(response: ApiResponse<AuthPayload>): void {
    const tokens = this.extractTokens(response.result);
    if (tokens) {
      this.tokenStorage.setTokens(tokens);
    }

    const user = response.result?.user ?? null;
    this.currentUserSubject.next(user);
  }

  private extractTokens(payload?: AuthPayload | null): AuthTokens | null {
    if (!payload) {
      return null;
    }

    if (payload.tokens) {
      return payload.tokens;
    }

    const accessToken = (payload as any).accessToken ?? (payload as any).token;
    if (!accessToken) {
      return null;
    }

    const refreshToken = (payload as any).refreshToken ?? null;
    return { accessToken, refreshToken };
  }
}
