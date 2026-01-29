import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { LoggerService } from '../logging/logger.service';
import { CompanyStateService } from './company-state.service';
import { ActiveContextStateService } from '../context/active-context-state.service';

export const CompanyAccessGuard: CanActivateFn = (route, state) => {
  const logger = inject(LoggerService);
  const companyState = inject(CompanyStateService);
  const activeContextState = inject(ActiveContextStateService);
  const router = inject(Router);
  const companyId = route.paramMap.get('id') ?? route.paramMap.get('companyId');

  if (!companyId) {
    return router.createUrlTree(['/organizations/setup']);
  }

  const activeContext = activeContextState.getActiveContext();
  if (!activeContextState.isComplete(activeContext)) {
    const redirect = activeContext.organizationId ? '/companies/select' : '/organizations/entry';
    logger.debug('[guard access] deny missing context', { companyId, url: state.url, redirect });
    return router.parseUrl(redirect);
  }

  if (activeContext.companyId && activeContext.companyId !== companyId) {
    const redirect = `/company/${activeContext.companyId}/dashboard`;
    logger.debug('[guard access] redirect active company', { companyId, url: state.url, redirect });
    return router.parseUrl(redirect);
  }

  companyState.setActiveCompanyId(companyId);
  logger.debug('[guard access] allow', { companyId, url: state.url });
  return true;
};
