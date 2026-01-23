import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of, take } from 'rxjs';

import { WorkspacesApiService } from '../api/workspaces-api.service';
import { LoggerService } from '../logging/logger.service';
import { WorkspaceStateService } from './workspace-state.service';
import { Workspace } from '../../shared/models/workspace.model';

const getWorkspaceId = (workspace: Workspace | null | undefined): string | null =>
  workspace?.id ?? workspace?._id ?? null;

export const WorkspaceAccessGuard: CanActivateFn = (route, state) => {
  const workspacesApi = inject(WorkspacesApiService);
  const logger = inject(LoggerService);
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
          logger.debug('[guard access] allow stored', { workspaceId, url: state.url });
          return true;
        }
        const redirect = router.createUrlTree(['/workspaces/onboarding']);
        logger.debug('[guard access] deny no workspaces', { workspaceId, url: state.url, redirect: redirect.toString() });
        return router.createUrlTree(['/workspaces/onboarding']);
      }

      const currentUrl = state.url;
      const workspace = workspaces.find((item) => getWorkspaceId(item) === workspaceId);
      if (!workspace) {
        const redirect = router.createUrlTree(['/workspaces/select']);
        logger.debug('[guard access] deny missing workspace', { workspaceId, url: state.url, redirect: redirect.toString() });
        return router.createUrlTree(['/workspaces/select']);
      }

      const storedActive = workspaceState.getActiveWorkspaceId();
      const storedSetupCompleted = workspaceState.getActiveWorkspaceSetupCompleted();

      if (response.result?.defaultWorkspaceId) {
        workspaceState.setDefaultWorkspaceId(response.result.defaultWorkspaceId);
      }
      workspaceState.setActiveWorkspaceId(workspaceId);
      const setupCompleted = deriveSetupCompleted(workspace);
      const trustStored =
        setupCompleted === false &&
        storedSetupCompleted === true &&
        storedActive === workspaceId;
      if (setupCompleted !== null && !trustStored) {
        workspaceState.setActiveWorkspaceSetupCompleted(setupCompleted);
      }

      if (currentUrl.startsWith(`/workspaces/${workspaceId}/setup`)) {
        logger.debug('[guard access] allow setup route', { workspaceId, url: state.url });
        return true;
      }

      const hasEnabledModules = workspace.enabledModules?.some((module) => module.enabled) ?? false;
      if (!hasEnabledModules && setupCompleted !== true) {
        const redirect = router.createUrlTree(['/workspaces', workspaceId, 'setup']);
        logger.debug('[guard access] deny no enabled modules', {
          workspaceId,
          url: state.url,
          redirect: redirect.toString(),
        });
        return router.createUrlTree(['/workspaces', workspaceId, 'setup']);
      }

      logger.debug('[guard access] allow', { workspaceId, url: state.url, setupCompleted });
      return true;
    }),
    catchError(() => of(router.createUrlTree(['/workspaces/onboarding']))),
  );
};

const deriveSetupCompleted = (workspace: Workspace | null | undefined): boolean | null => {
  if (!workspace) {
    return null;
  }
  if (typeof workspace.setupCompleted === 'boolean') {
    return workspace.setupCompleted;
  }
  if (Array.isArray(workspace.enabledModules)) {
    return workspace.enabledModules.some((module) => module.enabled);
  }
  return null;
};
