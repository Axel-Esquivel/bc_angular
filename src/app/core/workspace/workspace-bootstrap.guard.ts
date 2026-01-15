import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';

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
    map((response) => {
      const workspaces = response.result?.workspaces ?? [];
      const defaultId = response.result?.defaultWorkspaceId ?? null;
      const resolvedDefault =
        defaultId && workspaces.some((workspace) => getWorkspaceId(workspace) === defaultId)
          ? defaultId
          : null;

      if (resolvedDefault) {
        workspaceState.setDefaultWorkspaceId(resolvedDefault);
        workspaceState.setActiveWorkspaceId(resolvedDefault);
        return router.createUrlTree(['/w', resolvedDefault]);
      }

      if (workspaces.length === 0) {
        return router.createUrlTree(['/workspaces/launch']);
      }

      return router.createUrlTree(['/workspaces/select']);
    }),
    catchError(() => of(router.createUrlTree(['/workspaces/launch']))),
  );
};
