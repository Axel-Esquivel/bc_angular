import { Injectable } from '@angular/core';

import { AuthTokens } from '../../shared/models/auth.model';

const ACCESS_TOKEN_KEY = 'bc_access_token';
const REFRESH_TOKEN_KEY = 'bc_refresh_token';
const WORKSPACE_ID_KEY = 'bc_workspace_id';
const DEVICE_ID_KEY = 'bc_device_id';

@Injectable({ providedIn: 'root' })
export class TokenStorageService {
  setTokens(tokens: AuthTokens): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
    this.persistOptional(REFRESH_TOKEN_KEY, tokens.refreshToken);
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

  setWorkspaceId(workspaceId?: string | null): void {
    this.persistOptional(WORKSPACE_ID_KEY, workspaceId);
  }

  getWorkspaceId(): string | null {
    return localStorage.getItem(WORKSPACE_ID_KEY);
  }

  setDeviceId(deviceId?: string | null): void {
    this.persistOptional(DEVICE_ID_KEY, deviceId);
  }

  getDeviceId(): string | null {
    return localStorage.getItem(DEVICE_ID_KEY);
  }

  clearTokens(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(WORKSPACE_ID_KEY);
    localStorage.removeItem(DEVICE_ID_KEY);
  }

  private persistOptional(key: string, value?: string | null): void {
    if (value) {
      localStorage.setItem(key, value);
      return;
    }

    localStorage.removeItem(key);
  }
}
