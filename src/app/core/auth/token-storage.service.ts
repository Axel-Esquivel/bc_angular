import { Injectable } from '@angular/core';

import { AuthTokens } from '../../shared/models/auth.model';

const ACCESS_TOKEN_KEY = 'bc_access_token';
const REFRESH_TOKEN_KEY = 'bc_refresh_token';

@Injectable({ providedIn: 'root' })
export class TokenStorageService {
  setTokens(tokens: AuthTokens): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
    if (tokens.refreshToken) {
      localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
    }
  }

  getTokens(): AuthTokens | null {
    const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (!accessToken) {
      return null;
    }

    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    return { accessToken, refreshToken };
  }

  getAccessToken(): string | null {
    return this.getTokens()?.accessToken ?? null;
  }

  getRefreshToken(): string | null {
    return this.getTokens()?.refreshToken ?? null;
  }

  clearTokens(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
}
