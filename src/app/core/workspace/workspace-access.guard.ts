import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of, take } from 'rxjs';

import { WorkspacesApiService } from '../api/workspaces-api.service';
import { WorkspaceStateService } from './workspace-state.service';
import { Workspace } from '../../shared/models/workspace.model';

const getWorkspaceId = (workspace: Workspace | null | undefined): string | null =>
  workspace?.id ?? workspace?._id ?? null;

export const WorkspaceAccessGuard: CanActivateFn = (route, state) => {
  const workspacesApi = inject(WorkspacesApiService);
  const workspaceState = inject(WorkspaceStateService);
  const router = inject(Router);
  const workspaceId = route.paramMap.get('id') ?? route.paramMap.get('workspaceId');

  if (!workspaceId) {
    return router.createUrlTree(['/workspaces/select']);
  }

  return workspacesApi.listMine().pipe(
    take(1),
    map((response) => {
      const workspaces = response.result?.workspaces ?? [];
      if (workspaces.length === 0) {
        return router.createUrlTree(['/workspaces/onboarding']);
      }

      const currentUrl = state.url;
      const workspace = workspaces.find((item) => getWorkspaceId(item) === workspaceId);
      if (!workspace) {
        return router.createUrlTree(['/workspaces/select']);
      }

      if (response.result?.defaultWorkspaceId) {
        workspaceState.setDefaultWorkspaceId(response.result.defaultWorkspaceId);
      }
      workspaceState.setActiveWorkspaceId(workspaceId);
      workspaceState.setActiveWorkspaceSetupCompleted(workspace.setupCompleted ?? null);

      if (workspace.setupCompleted === false) {
        if (currentUrl.startsWith(`/workspace/${workspaceId}/setup`)) {
          return true;
        }
        return router.createUrlTree(['/workspace', workspaceId, 'setup']);
      }

      return true;
    }),
    catchError(() => of(router.createUrlTree(['/workspaces/onboarding']))),
  );
};
