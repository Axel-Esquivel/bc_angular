import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';

import { SetupApiService } from '../api/setup-api.service';

type SetupMode = 'requireSetup' | 'requireInstalled';

export const SetupGuard: CanActivateFn = (route) => {
  const router = inject(Router);
  const setupApi = inject(SetupApiService);
  const mode = (route.data?.['setupMode'] as SetupMode) ?? 'requireInstalled';

  return setupApi.getStatus().pipe(
    map((response) => {
      const installed = Boolean(response.result?.installed);
      if (mode === 'requireSetup') {
        return installed ? router.createUrlTree(['/auth/login']) : true;
      }

      return installed ? true : router.createUrlTree(['/setup/initial']);
    }),
    catchError(() => {
      if (mode === 'requireSetup') {
        return of(true);
      }
      return of(router.createUrlTree(['/setup/initial']));
    }),
  );
};
