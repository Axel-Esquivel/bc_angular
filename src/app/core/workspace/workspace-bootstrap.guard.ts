import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of, take } from 'rxjs';

import { WorkspacesApiService } from '../api/workspaces-api.service';
import { WorkspaceStateService } from './workspace-state.service';
import { Workspace } from '../../shared/models/workspace.model';

const getWorkspaceId = (workspace: Workspace | null | undefined): string | null =>
  workspace?.id ?? workspace?._id ?? null;

export const WorkspaceBootstrapGuard: CanActivateFn = () => {
  const workspacesApi = inject(WorkspacesApiService);
  const workspaceState = inject(WorkspaceStateService);
  const router = inject(Router);

  return workspacesApi.listMine().pipe(
    take(1),
    map((response) => {
      const workspaces = response.result?.workspaces ?? [];
      const count = workspaces.length;
      // eslint-disable-next-line no-console
      console.log('[ws-boot] count', count);

      if (count === 0) {
        // eslint-disable-next-line no-console
        console.log('[ws-boot] -> /workspaces/onboarding');
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
        // eslint-disable-next-line no-console
        console.log('[ws-boot] -> /workspaces/' + resolvedDefault);
        return router.parseUrl(`/workspaces/${resolvedDefault}`);
      }

      // eslint-disable-next-line no-console
      console.log('[ws-boot] -> /workspaces/select');
      return router.parseUrl('/workspaces/select');
    }),
    catchError(() => {
      // eslint-disable-next-line no-console
      console.log('[ws-boot] -> /workspaces/onboarding');
      return of(router.parseUrl('/workspaces/onboarding'));
    }),
  );
};
