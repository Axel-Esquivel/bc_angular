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
        const storedActive = workspaceState.getActiveWorkspaceId();
        const storedDefault = workspaceState.getDefaultWorkspaceId();
        if (workspaceId && (workspaceId === storedActive || workspaceId === storedDefault)) {
          console.log('[GUARD WorkspaceAccessGuard]', { workspaceId, ok: true, source: 'stored', url: state.url });
          return true;
        }
        const redirect = router.createUrlTree(['/workspaces/onboarding']);
        console.log('[GUARD WorkspaceAccessGuard]', { workspaceId, ok: false, redirect: redirect.toString(), url: state.url });
        return router.createUrlTree(['/workspaces/onboarding']);
      }

      const currentUrl = state.url;
      const workspace = workspaces.find((item) => getWorkspaceId(item) === workspaceId);
      if (!workspace) {
        const redirect = router.createUrlTree(['/workspaces/select']);
        console.log('[GUARD WorkspaceAccessGuard]', { workspaceId, ok: false, redirect: redirect.toString(), url: state.url });
        return router.createUrlTree(['/workspaces/select']);
      }

      const storedActive = workspaceState.getActiveWorkspaceId();
      const storedSetupCompleted = workspaceState.getActiveWorkspaceSetupCompleted();

      if (response.result?.defaultWorkspaceId) {
        workspaceState.setDefaultWorkspaceId(response.result.defaultWorkspaceId);
      }
      workspaceState.setActiveWorkspaceId(workspaceId);
      const setupCompleted = workspace.setupCompleted;
      const trustStored =
        setupCompleted === false &&
        storedSetupCompleted === true &&
        storedActive === workspaceId;
      if (typeof setupCompleted === 'boolean' && !trustStored) {
        workspaceState.setActiveWorkspaceSetupCompleted(setupCompleted);
      }

      if (setupCompleted === false) {
        if (trustStored) {
          return true;
        }
        if (currentUrl.startsWith(`/workspaces/${workspaceId}/setup`)) {
          console.log('[GUARD WorkspaceAccessGuard]', { workspaceId, ok: true, url: state.url, setupCompleted: false });
          return true;
        }
        const redirect = router.createUrlTree(['/workspaces', workspaceId, 'setup']);
        console.log('[GUARD WorkspaceAccessGuard]', { workspaceId, ok: false, redirect: redirect.toString(), url: state.url, setupCompleted: false });
        return router.createUrlTree(['/workspaces', workspaceId, 'setup']);
      }

      console.log('[GUARD WorkspaceAccessGuard]', { workspaceId, ok: true, url: state.url, setupCompleted: workspace.setupCompleted });
      return true;
    }),
    catchError(() => of(router.createUrlTree(['/workspaces/onboarding']))),
  );
};
