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

      if (currentUrl.startsWith('/workspaces/select') || currentUrl.startsWith('/workspaces/onboarding')) {
        return true;
      }

      const defaultId = response.result?.defaultWorkspaceId ?? workspaceState.getDefaultWorkspaceId();
      const resolvedDefault =
        defaultId && workspaces.some((workspace) => getWorkspaceId(workspace) === defaultId)
          ? defaultId
          : null;
      const storedActive = workspaceState.getActiveWorkspaceId();
      const resolvedActive =
        !resolvedDefault && storedActive && workspaces.some((workspace) => getWorkspaceId(workspace) === storedActive)
          ? storedActive
          : null;

      const targetWorkspaceId = resolvedDefault ?? resolvedActive;
      if (targetWorkspaceId) {
        if (resolvedDefault) {
          workspaceState.setDefaultWorkspaceId(resolvedDefault);
        }
        workspaceState.setActiveWorkspaceId(targetWorkspaceId);
        if (currentUrl.startsWith(`/workspace/${targetWorkspaceId}`)) {
          return true;
        }
        return router.parseUrl(`/workspace/${targetWorkspaceId}/dashboard`);
      }

      return router.parseUrl('/workspaces/select');
    }),
    catchError(() => {
      return of(router.parseUrl('/workspaces/onboarding'));
    }),
  );
};
