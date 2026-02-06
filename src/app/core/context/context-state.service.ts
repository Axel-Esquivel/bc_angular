import { Injectable } from '@angular/core';
import { Observable, map, switchMap, tap } from 'rxjs';

import { ContextApiService } from '../api/context-api.service';
import { ActiveContextStateService } from './active-context-state.service';
import { CompanyStateService } from '../company/company-state.service';
import { AuthService } from '../auth/auth.service';
import { Company } from '../../shared/models/company.model';
import { ActiveContext } from '../../shared/models/active-context.model';

@Injectable({ providedIn: 'root' })
export class ContextStateService {
  constructor(
    private readonly contextApi: ContextApiService,
    private readonly activeContext: ActiveContextStateService,
    private readonly companyState: CompanyStateService,
    private readonly authService: AuthService,
  ) {}

  setDefaults(
    organizationId: string,
    company: Company,
    enterpriseId: string,
    currencyId: string,
  ): Observable<void> {
    return this.contextApi
      .setDefaultOrganization(organizationId)
      .pipe(
        switchMap(() => this.contextApi.setDefaultCompany(company.id ?? '')),
        switchMap(() => this.contextApi.setDefaultEnterprise(enterpriseId)),
        switchMap(() => this.contextApi.setDefaultCurrency(currencyId)),
        switchMap(() => this.authService.loadMe()),
        tap(() => {
          const context = this.buildActiveContext(organizationId, company, enterpriseId, currencyId);
          this.activeContext.setActiveContext(context);
          if (company.id) {
            this.companyState.setActiveCompanyId(company.id);
            this.companyState.setDefaultCompanyId(company.id);
          }
        }),
        map(() => undefined)
      );
  }

  buildActiveContext(
    organizationId: string,
    company: Company,
    enterpriseId: string | null,
    currencyId: string | null,
  ): ActiveContext {
    const enterprise = company.enterprises?.find((item) => item.id === enterpriseId) ?? null;
    const resolvedCurrencyId =
      currencyId ??
      enterprise?.defaultCurrencyId ??
      company.defaultCurrencyId ??
      company.baseCurrencyId ??
      null;

    return {
      organizationId,
      companyId: company.id ?? null,
      countryId: enterprise?.countryId ?? company.baseCountryId ?? null,
      enterpriseId: enterprise?.id ?? null,
      currencyId: resolvedCurrencyId,
    };
  }
}
