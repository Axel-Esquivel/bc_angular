import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { TokenStorageService } from '../auth/token-storage.service';

export const AuthGuard: CanActivateFn = () => {
  const tokenStorage = inject(TokenStorageService);
  const router = inject(Router);

  if (!tokenStorage.getAccessToken()) {
    return router.parseUrl('/auth/login');
  }

  return true;
};
