import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of, take } from 'rxjs';

import { WorkspacesApiService } from '../api/workspaces-api.service';
import { CompanyStateService } from './company-state.service';
import { Workspace } from '../../shared/models/workspace.model';

const getCompanyId = (company: Workspace | null | undefined): string | null =>
  company?.id ?? company?._id ?? null;

export const CompanyBootstrapGuard: CanActivateFn = (_route, state) => {
  const workspacesApi = inject(WorkspacesApiService);
  const companyState = inject(CompanyStateService);
  const router = inject(Router);

  return workspacesApi.listMine().pipe(
    take(1),
    map((response) => {
      const companies = response.result?.workspaces ?? [];
      const count = companies.length;
      const currentUrl = state.url;

      if (count === 0) {
        if (currentUrl.startsWith('/companies/select')) {
          return true;
        }
        return router.parseUrl('/companies/select');
      }

      if (currentUrl.startsWith('/companies/select')) {
        return true;
      }

      const defaultId = response.result?.defaultWorkspaceId ?? companyState.getDefaultCompanyId();
      const resolvedDefault =
        defaultId && companies.some((company) => getCompanyId(company) === defaultId)
          ? defaultId
          : null;
      const storedActive = companyState.getActiveCompanyId();
      const resolvedActive =
        !resolvedDefault && storedActive && companies.some((company) => getCompanyId(company) === storedActive)
          ? storedActive
          : null;

      const targetCompanyId = resolvedDefault ?? resolvedActive;
      if (targetCompanyId) {
        if (resolvedDefault) {
          companyState.setDefaultCompanyId(resolvedDefault);
        }
        companyState.setActiveCompanyId(targetCompanyId);
        if (currentUrl.startsWith(`/company/${targetCompanyId}`)) {
          return true;
        }
        return router.parseUrl(`/company/${targetCompanyId}/dashboard`);
      }

      return router.parseUrl('/companies/select');
    }),
    catchError(() => of(router.parseUrl('/companies/select'))),
  );
};
