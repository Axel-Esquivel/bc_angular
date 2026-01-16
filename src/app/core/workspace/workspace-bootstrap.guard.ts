import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of, take } from 'rxjs';

import { WorkspacesApiService } from '../api/workspaces-api.service';
import { WorkspaceStateService } from './workspace-state.service';
import { Workspace } from '../../shared/models/workspace.model';

const getWorkspaceId = (workspace: Workspace | null | undefined): string | null =>
  workspace?.id ?? workspace?._id ?? null;

export const WorkspaceBootstrapGuard: CanActivateFn = (route, state) => {
  const workspacesApi = inject(WorkspacesApiService);
  const workspaceState = inject(WorkspaceStateService);
  const router = inject(Router);

  return workspacesApi.listMine().pipe(
    take(1),
    map((response) => {
      const workspaces = response.result?.workspaces ?? [];
      const count = workspaces.length;
      const currentUrl = state.url;

      if (count === 0) {
        if (currentUrl.startsWith('/workspaces/onboarding')) {
          return true;
        }
        return router.parseUrl('/workspaces/onboarding');
      }

      if (currentUrl.startsWith('/workspaces/select')) {
        return true;
      }

      const defaultId = response.result?.defaultWorkspaceId ?? null;
      const resolvedDefault =
        defaultId && workspaces.some((workspace) => getWorkspaceId(workspace) === defaultId)
          ? defaultId
          : null;

      if (resolvedDefault) {
        workspaceState.setDefaultWorkspaceId(resolvedDefault);
        workspaceState.setActiveWorkspaceId(resolvedDefault);
        if (currentUrl.startsWith(`/workspace/${resolvedDefault}`)) {
          return true;
        }
        return router.parseUrl(`/workspace/${resolvedDefault}/dashboard`);
      }

      return router.parseUrl('/workspaces/select');
    }),
    catchError(() => {
      return of(router.parseUrl('/workspaces/onboarding'));
    }),
  );
};
