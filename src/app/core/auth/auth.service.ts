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

import { ApiResponse } from '../../shared/models/api-response.model';
import {
  AuthTokens,
  AuthUser,
  LoginRequest,
  LoginResult,
  RegisterRequest,
  RegisterResult,
} from '../../shared/models/auth.model';
import { AuthApiService } from '../api/auth-api.service';
import { TokenStorageService } from './token-storage.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly currentUserSubject = new BehaviorSubject<AuthUser | null>(null);
  private readonly refreshSubject = new BehaviorSubject<AuthTokens | null>(null);
  private isRefreshing = false;

  constructor(private readonly authApi: AuthApiService, private readonly tokenStorage: TokenStorageService) {}

  login(credentials: LoginRequest): Observable<AuthUser | null> {
    return this.authApi.login(credentials).pipe(
      tap((response) => this.persistAuthPayload(response.result)),
      map((response) => this.mapUser(response.result?.user))
    );
  }

  register(payload: RegisterRequest): Observable<AuthUser | null> {
    return this.authApi.register(payload).pipe(
      tap((response) => this.persistAuthPayload(response.result)),
      map((response) => this.mapUser(response.result?.user))
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
      map((response) => this.mapUser(response.result?.user)),
      tap((user) => this.currentUserSubject.next(user)),
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

  refreshToken(): Observable<AuthTokens | null> {
    const refreshToken = this.tokenStorage.getRefreshToken();
    if (!refreshToken) {
      return of(null);
    }

    if (this.isRefreshing) {
      return this.refreshSubject.pipe(take(1));
    }

    this.isRefreshing = true;
    return this.authApi.refresh(refreshToken).pipe(
      tap((response) => this.persistAuthPayload(response.result)),
      map((response) => this.extractTokens(response.result)),
      tap((tokens) => this.refreshSubject.next(tokens)),
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

  getAccessToken(): string | null {
    return this.tokenStorage.getAccessToken();
  }

  getCurrentWorkspaceId(): string | null {
    return this.tokenStorage.getWorkspaceId();
  }

  private persistAuthPayload(response: ApiResponse<LoginResult | RegisterResult>['result']): void {
    if (!response) {
      return;
    }

    const tokens = this.extractTokens(response);
    if (tokens) {
      this.tokenStorage.setTokens(tokens);
    }

    this.tokenStorage.setWorkspaceId((response as LoginResult | RegisterResult).workspaceId ?? null);
    this.tokenStorage.setDeviceId((response as LoginResult).deviceId ?? null);
    const user = 'user' in response ? response.user : null;
    this.currentUserSubject.next(this.mapUser(user));
  }

  private extractTokens(payload?: LoginResult | RegisterResult | null): AuthTokens | null {
    if (!payload || !('accessToken' in payload)) {
      return null;
    }

    const accessToken = (payload as LoginResult).accessToken;
    if (!accessToken) {
      return null;
    }

    return { accessToken, refreshToken: (payload as LoginResult).refreshToken ?? null };
  }

  private mapUser(user?: AuthUser | null): AuthUser | null {
    if (!user) {
      return null;
    }

    return { ...user, displayName: user.displayName ?? user.username ?? user.email };
  }
}
