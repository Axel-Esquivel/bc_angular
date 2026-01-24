import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of, take } from 'rxjs';

import { WorkspacesApiService } from '../api/workspaces-api.service';
import { LoggerService } from '../logging/logger.service';
import { CompanyStateService } from './company-state.service';
import { Workspace } from '../../shared/models/workspace.model';

const getCompanyId = (company: Workspace | null | undefined): string | null =>
  company?.id ?? company?._id ?? null;

export const CompanyAccessGuard: CanActivateFn = (route, state) => {
  const workspacesApi = inject(WorkspacesApiService);
  const logger = inject(LoggerService);
  const companyState = inject(CompanyStateService);
  const router = inject(Router);
  const companyId = route.paramMap.get('id') ?? route.paramMap.get('companyId');

  if (!companyId) {
    return router.createUrlTree(['/companies/select']);
  }

  return workspacesApi.listMine().pipe(
    take(1),
    map((response) => {
      const companies = response.result?.workspaces ?? [];
      if (companies.length === 0) {
        const storedActive = companyState.getActiveCompanyId();
        const storedDefault = companyState.getDefaultCompanyId();
        if (companyId && (companyId === storedActive || companyId === storedDefault)) {
          logger.debug('[guard access] allow stored', { companyId, url: state.url });
          return true;
        }
        const redirect = router.createUrlTree(['/companies/select']);
        logger.debug('[guard access] deny no companies', { companyId, url: state.url, redirect: redirect.toString() });
        return router.createUrlTree(['/companies/select']);
      }

      const currentUrl = state.url;
      const company = companies.find((item) => getCompanyId(item) === companyId);
      if (!company) {
        const redirect = router.createUrlTree(['/companies/select']);
        logger.debug('[guard access] deny missing company', { companyId, url: state.url, redirect: redirect.toString() });
        return router.createUrlTree(['/companies/select']);
      }

      const storedActive = companyState.getActiveCompanyId();
      const storedSetupCompleted = companyState.getActiveCompanySetupCompleted();

      if (response.result?.defaultWorkspaceId) {
        companyState.setDefaultCompanyId(response.result.defaultWorkspaceId);
      }
      companyState.setActiveCompanyId(companyId);
      const setupCompleted = deriveSetupCompleted(company);
      const trustStored =
        setupCompleted === false &&
        storedSetupCompleted === true &&
        storedActive === companyId;
      if (setupCompleted !== null && !trustStored) {
        companyState.setActiveCompanySetupCompleted(setupCompleted);
      }

      if (currentUrl.startsWith(`/company/${companyId}/setup`)) {
        logger.debug('[guard access] allow setup route', { companyId, url: state.url });
        return true;
      }

      const hasEnabledModules = company.enabledModules?.some((module) => module.enabled) ?? false;
      if (!hasEnabledModules && setupCompleted !== true) {
        const redirect = router.createUrlTree(['/company', companyId, 'setup']);
        logger.debug('[guard access] deny no enabled modules', {
          companyId,
          url: state.url,
          redirect: redirect.toString(),
        });
        return router.createUrlTree(['/company', companyId, 'setup']);
      }

      logger.debug('[guard access] allow', { companyId, url: state.url, setupCompleted });
      return true;
    }),
    catchError(() => of(router.createUrlTree(['/companies/select']))),
  );
};

const deriveSetupCompleted = (company: Workspace | null | undefined): boolean | null => {
  if (!company) {
    return null;
  }
  if (typeof company.setupCompleted === 'boolean') {
    return company.setupCompleted;
  }
  if (Array.isArray(company.enabledModules)) {
    return company.enabledModules.some((module) => module.enabled);
  }
  return null;
};
