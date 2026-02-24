import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
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
  private readonly currentUserSubject = new BehaviorSubject<AuthUser | null>(null);
  private readonly authStateSubject = new BehaviorSubject<boolean>(false);
  private readonly refreshSubject = new BehaviorSubject<AuthTokens | null>(null);
  private isRefreshing = false;
  private isLoggingOut = false;

  constructor(
    private readonly authApi: AuthApiService,
    private readonly tokenStorage: TokenStorageService,
    private readonly companyState: CompanyStateService,
    private readonly realtimeSocket: RealtimeSocketService,
    private readonly activeContextState: ActiveContextStateService,
    private readonly logger: LoggerService
  ) {
    const storedToken = this.tokenStorage.getAccessToken();
    if (storedToken) {
      this.realtimeSocket.setAuthToken(storedToken);
    }
    const storedUser = this.tokenStorage.getUser();
    this.currentUserSubject.next(storedUser);
    this.companyState.syncFromUser(storedUser);
    this.authStateSubject.next(Boolean(storedToken));
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
    this.performLogout(true);
  }

  logoutLocal(): void {
    this.performLogout(false);
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
      catchError((error) => {
        const status = error instanceof HttpErrorResponse ? error.status : null;
        if (status === 401 || status === 419) {
          this.logoutLocal();
          return of(null);
        }
        const cached = this.getCurrentUser();
        if (cached) {
          this.currentUserSubject.next(cached);
          this.companyState.syncFromUser(cached);
        }
        return of(cached);
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
    return this.tokenStorage.getAccessToken();
  }

  hasToken(): boolean {
    return !!this.getToken();
  }

  hasStoredAccessToken(): boolean {
    return !!this.tokenStorage.getAccessToken();
  }

  getCurrentUser(): AuthUser | null {
    const cached = this.currentUserSubject.value;
    if (cached) {
      return cached;
    }
    return this.tokenStorage.getUser();
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
        const status = error instanceof HttpErrorResponse ? error.status : null;
        if (status === 401 || status === 419) {
          this.logoutLocal();
        }
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
    if (!tokens || !tokens.refreshToken) {
      this.performLogout(false);
      return;
    }
    this.tokenStorage.setTokens(tokens);
    this.setToken(tokens.accessToken);

    if ('deviceId' in response) {
      this.tokenStorage.setDeviceId((response as LoginResult | RegisterResult).deviceId ?? null);
    }
    const activeContext = (response as LoginResult | RegisterResult | RefreshResult).activeContext ?? null;
    this.activeContextState.setActiveContext(activeContext);
    this.companyState.syncFromContext(activeContext);
    if ('user' in response && response.user) {
      const mappedUser = this.mapUser(response.user);
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
    const refreshToken = (payload as LoginResult).refreshToken ?? null;
    if (!refreshToken) {
      return null;
    }

    return { accessToken, refreshToken };
  }

  private mapUser(user?: AuthUser | null): AuthUser | null {
    if (!user) {
      return null;
    }

    const fullName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
    return { ...user, displayName: user.displayName ?? (fullName || user.email) };
  }

  private setToken(token: string | null): void {
    this.authStateSubject.next(Boolean(token));
  }

  private performLogout(callApi: boolean): void {
    if (this.isLoggingOut) {
      return;
    }
    this.isLoggingOut = true;
    const deviceId = this.tokenStorage.getDeviceId();
    const hasSession = this.hasToken();
    const shouldCallApi = callApi && hasSession && !!deviceId;

    if (shouldCallApi) {
      this.authApi
        .logout(deviceId)
        .pipe(
          take(1),
          catchError(() => of(null)),
          finalize(() => {
            this.finalizeLogout();
            this.isLoggingOut = false;
          })
        )
        .subscribe();
      return;
    }

    this.finalizeLogout();
    this.isLoggingOut = false;
  }

  private finalizeLogout(): void {
    this.realtimeSocket.disconnect();
    this.realtimeSocket.setAuthToken(null);
    this.tokenStorage.clearTokens();
    this.activeContextState.clear();
    this.currentUserSubject.next(null);
    this.authStateSubject.next(false);
    this.companyState.clear();
    this.realtimeSocket.disconnect();
  }
}


