import { Injectable } from '@angular/core';

const TOKEN_KEY = 'bc_token';

@Injectable({ providedIn: 'root' })
export class TokenStorageService {
  setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  clearToken(): void {
    localStorage.removeItem(TOKEN_KEY);
  }
}
