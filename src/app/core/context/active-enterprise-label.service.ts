import { Injectable } from '@angular/core';
import { Observable, catchError, distinctUntilChanged, map, of, shareReplay, switchMap } from 'rxjs';

import { CompaniesApiService } from '../api/companies-api.service';
import { ActiveContextStateService } from './active-context-state.service';
import { Company, CompanyEnterprise } from '../../shared/models/company.model';

interface ContextIds {
  organizationId: string | null;
  enterpriseId: string | null;
}

@Injectable({ providedIn: 'root' })
export class ActiveEnterpriseLabelService {
  readonly enterpriseName$: Observable<string | null>;

  constructor(
    private readonly activeContextState: ActiveContextStateService,
    private readonly companiesApi: CompaniesApiService,
  ) {
    this.enterpriseName$ = this.activeContextState.activeContext$.pipe(
      map((context): ContextIds => ({
        organizationId: context.organizationId ?? null,
        enterpriseId: context.enterpriseId ?? null,
      })),
      distinctUntilChanged(
        (a, b) => a.organizationId === b.organizationId && a.enterpriseId === b.enterpriseId,
      ),
      switchMap(({ organizationId, enterpriseId }) => {
        if (!organizationId || !enterpriseId) {
          return of(null);
        }

        return this.companiesApi.listByOrganization(organizationId).pipe(
          map((response) => response.result ?? []),
          map((companies: Company[]) => {
            const match = companies
              .flatMap((company) => company.enterprises ?? [])
              .find((enterprise: CompanyEnterprise) => (enterprise.id ?? enterprise._id ?? '') === enterpriseId);
            return match?.name ?? null;
          }),
          catchError(() => of(null)),
        );
      }),
      shareReplay({ bufferSize: 1, refCount: true }),
    );
  }
}
