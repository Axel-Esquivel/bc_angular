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
  RefreshResult,
  RegisterRequest,
  RegisterResult,
} from '../../shared/models/auth.model';
import { AuthApiService } from '../api/auth-api.service';
import { LoggerService } from '../logging/logger.service';
import { TokenStorageService } from './token-storage.service';
import { CompanyStateService } from '../company/company-state.service';
import { RealtimeSocketService } from '../services/realtime-socket.service';
import { ActiveContextStateService } from '../context/active-context-state.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private static readonly TOKEN_KEY = 'bc_token';
  private static readonly USER_KEY = 'bc_user';

  private readonly currentUserSubject = new BehaviorSubject<AuthUser | null>(null);
  private readonly authStateSubject = new BehaviorSubject<boolean>(false);
  private readonly refreshSubject = new BehaviorSubject<AuthTokens | null>(null);
  private isRefreshing = false;

  constructor(
    private readonly authApi: AuthApiService,
    private readonly tokenStorage: TokenStorageService,
    private readonly companyState: CompanyStateService,
    private readonly realtimeSocket: RealtimeSocketService,
    private readonly activeContextState: ActiveContextStateService,
    private readonly logger: LoggerService
  ) {
    const storedToken = this.tokenStorage.getAccessToken();
    if (storedToken && !this.getToken()) {
      this.setToken(storedToken);
    }
    if (storedToken) {
      this.realtimeSocket.setAuthToken(storedToken);
    }
    const storedUser = this.getCurrentUser();
    this.currentUserSubject.next(storedUser);
    this.companyState.syncFromUser(storedUser);
    this.authStateSubject.next(this.hasToken());
  }

  login(credentials: LoginRequest): Observable<AuthUser | null> {
    return this.authApi.login(credentials).pipe(
      tap((response) => {
        this.persistAuthPayload(response.result);
        const token = this.getToken();
        this.logger.debug('[auth] token saved', token ? token.length : 0, this.hasToken());
        this.realtimeSocket.setAuthToken(token);
        this.realtimeSocket.connect();
      }),
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
    const deviceId = this.tokenStorage.getDeviceId();
    this.authApi
      .logout(deviceId)
      .pipe(
        take(1),
        catchError(() => of(null))
      )
      .subscribe();
    this.finalizeLogout();
  }

  loadMe(): Observable<AuthUser | null> {
    if (!this.hasToken()) {
      this.currentUserSubject.next(null);
      return of(null);
    }

    return this.authApi.me().pipe(
      map((response) => {
        const user = this.mapUser(response.result?.user);
        if (user && response.result && typeof response.result.isFirstTime === 'boolean') {
          user.isFirstTime = response.result.isFirstTime;
        }
        return user;
      }),
      tap((user) => {
        this.tokenStorage.setUser(user);
        this.currentUserSubject.next(user);
        this.companyState.syncFromUser(user);
      }),
      catchError(() => {
        this.logout();
        return of(null);
      })
    );
  }

  getCurrentUser$(): Observable<AuthUser | null> {
    if (!this.currentUserSubject.value && this.isAuthenticated()) {
      return this.loadMe().pipe(switchMap(() => this.currentUserSubject.asObservable()));
    }

    return this.currentUserSubject.asObservable();
  }

  isAuthenticated(): boolean {
    return this.hasToken();
  }

  getToken(): string | null {
    return localStorage.getItem(AuthService.TOKEN_KEY);
  }

  hasToken(): boolean {
    return !!this.getToken();
  }

  getCurrentUser(): AuthUser | null {
    const cached = this.currentUserSubject.value;
    if (cached) {
      return cached;
    }

    const raw = localStorage.getItem(AuthService.USER_KEY);
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as AuthUser;
    } catch {
      localStorage.removeItem(AuthService.USER_KEY);
      return null;
    }
  }

  get isAuthenticated$(): Observable<boolean> {
    return this.authStateSubject.asObservable();
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

  private persistAuthPayload(response: ApiResponse<LoginResult | RegisterResult | RefreshResult>['result']): void {
    if (!response) {
      return;
    }

    const tokens = this.extractTokens(response);
    if (tokens) {
      this.tokenStorage.setTokens(tokens);
      this.setToken(tokens.accessToken);
    }

    if ('deviceId' in response) {
      this.tokenStorage.setDeviceId((response as LoginResult | RegisterResult).deviceId ?? null);
    }
    const activeContext = (response as LoginResult | RegisterResult | RefreshResult).activeContext ?? null;
    this.activeContextState.setActiveContext(activeContext);
    this.companyState.syncFromContext(activeContext);
    if ('user' in response && response.user) {
      const mappedUser = this.mapUser(response.user);
      this.setUser(mappedUser);
      this.tokenStorage.setUser(mappedUser);
      this.currentUserSubject.next(mappedUser);
      this.companyState.syncFromUser(mappedUser);
    }
  }

  private extractTokens(payload?: LoginResult | RegisterResult | RefreshResult | null): AuthTokens | null {
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

    const fullName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
    return { ...user, displayName: user.displayName ?? (fullName || user.email) };
  }

  private setToken(token: string | null): void {
    if (token) {
      localStorage.setItem(AuthService.TOKEN_KEY, token);
      this.authStateSubject.next(true);
      return;
    }

    localStorage.removeItem(AuthService.TOKEN_KEY);
    this.authStateSubject.next(false);
  }

  private setUser(user: AuthUser | null): void {
    if (!user) {
      localStorage.removeItem(AuthService.USER_KEY);
      return;
    }

    localStorage.setItem(AuthService.USER_KEY, JSON.stringify(user));
  }

  private clearAuthStorage(): void {
    localStorage.removeItem(AuthService.TOKEN_KEY);
    localStorage.removeItem(AuthService.USER_KEY);
  }

  private finalizeLogout(): void {
    this.realtimeSocket.disconnect();
    this.realtimeSocket.setAuthToken(null);
    this.tokenStorage.clearTokens();
    this.clearAuthStorage();
    this.activeContextState.clear();
    this.currentUserSubject.next(null);
    this.authStateSubject.next(false);
    this.companyState.clear();
    this.realtimeSocket.disconnect();
  }
}
