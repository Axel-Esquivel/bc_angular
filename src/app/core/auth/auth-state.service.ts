import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { AuthUser } from '../../shared/models/auth.model';
import { TokenStorageService } from './token-storage.service';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class AuthStateService {
  constructor(
    private readonly tokenStorage: TokenStorageService,
    private readonly authService: AuthService
  ) {}

  getAccessToken(): string | null {
    return this.tokenStorage.getAccessToken();
  }

  isAuthenticated(): boolean {
    return Boolean(this.getAccessToken());
  }

  getCurrentUser(): AuthUser | null {
    return this.tokenStorage.getUser();
  }

  getCurrentUser$(): Observable<AuthUser | null> {
    return this.authService.getCurrentUser$();
  }
}
