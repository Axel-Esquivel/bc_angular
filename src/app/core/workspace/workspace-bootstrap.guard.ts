import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of, take } from 'rxjs';

import { WorkspacesApiService } from '../api/workspaces-api.service';
import { LoggerService } from '../logging/logger.service';
import { WorkspaceStateService } from './workspace-state.service';
import { Workspace } from '../../shared/models/workspace.model';

const getWorkspaceId = (workspace: Workspace | null | undefined): string | null =>
  workspace?.id ?? workspace?._id ?? null;

export const WorkspaceBootstrapGuard: CanActivateFn = () => {
  const workspacesApi = inject(WorkspacesApiService);
  const workspaceState = inject(WorkspaceStateService);
  const logger = inject(LoggerService);
  const router = inject(Router);

  return workspacesApi.listMine().pipe(
    take(1),
    map((response) => {
      const workspaces = response.result?.workspaces ?? [];
      const count = workspaces.length;
      logger.debug('[ws-boot] count', count);

      if (count === 0) {
        logger.debug('[ws-boot] -> /workspaces/onboarding');
        return router.parseUrl('/workspaces/onboarding');
      }

      const defaultId = response.result?.defaultWorkspaceId ?? null;
      const resolvedDefault =
        defaultId && workspaces.some((workspace) => getWorkspaceId(workspace) === defaultId)
          ? defaultId
          : null;

      if (resolvedDefault) {
        workspaceState.setDefaultWorkspaceId(resolvedDefault);
        workspaceState.setActiveWorkspaceId(resolvedDefault);
        logger.debug('[ws-boot] -> /workspaces/' + resolvedDefault);
        return router.parseUrl(`/workspaces/${resolvedDefault}`);
      }

      logger.debug('[ws-boot] -> /workspaces/select');
      return router.parseUrl('/workspaces/select');
    }),
    catchError(() => {
      logger.debug('[ws-boot] -> /workspaces/onboarding');
      return of(router.parseUrl('/workspaces/onboarding'));
    }),
  );
};
