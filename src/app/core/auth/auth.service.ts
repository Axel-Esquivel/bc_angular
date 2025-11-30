import { Injectable } from '@angular/core';
import { BehaviorSubject, EMPTY, Observable, map, tap } from 'rxjs';

import { AuthApiService } from '../api/auth-api.service';
import { TokenStorageService } from './token-storage.service';
import { ApiResponse } from '../../shared/models/api-response.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly currentUserSubject = new BehaviorSubject<any | null>(null);

  constructor(private readonly authApi: AuthApiService, private readonly tokenStorage: TokenStorageService) {}

  login(credentials: { email: string; password: string }): Observable<void> {
    return this.authApi.login(credentials).pipe(
      tap((response: ApiResponse<any>) => {
        const token = response.result?.accessToken ?? response.result?.token ?? response.result;
        if (token) {
          this.tokenStorage.setToken(token as string);
        }
        const user = response.result?.user ?? null;
        this.currentUserSubject.next(user);
      }),
      map(() => void 0)
    );
  }

  logout(): void {
    this.tokenStorage.clearToken();
    this.currentUserSubject.next(null);
  }

  loadMe(): Observable<void> {
    if (!this.isAuthenticated()) {
      this.currentUserSubject.next(null);
      return EMPTY;
    }

    return this.authApi.me().pipe(
      tap((response: ApiResponse<any>) => this.currentUserSubject.next(response.result ?? null)),
      map(() => void 0)
    );
  }

  getCurrentUser(): Observable<any | null> {
    return this.currentUserSubject.asObservable();
  }

  isAuthenticated(): boolean {
    return !!this.tokenStorage.getToken();
  }
}
