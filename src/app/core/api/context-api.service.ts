import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';

import { OrganizationsService } from './organizations-api.service';
import { CompaniesApiService } from './companies-api.service';
import { UsersApiService } from './users-api.service';
import { ApiResponse } from '../../shared/models/api-response.model';
import { IOrganization, OrganizationDefaultResult } from '../../shared/models/organization.model';
import { Company } from '../../shared/models/company.model';
import { AuthUser } from '../../shared/models/auth.model';

@Injectable({ providedIn: 'root' })
export class ContextApiService {
  constructor(
    private readonly organizationsApi: OrganizationsService,
    private readonly companiesApi: CompaniesApiService,
    private readonly usersApi: UsersApiService,
  ) {}

  listOrganizations(): Observable<IOrganization[]> {
    return this.organizationsApi.list().pipe(map((response) => response.result ?? []));
  }

  listCompanies(organizationId: string): Observable<Company[]> {
    return this.companiesApi.listByOrganization(organizationId).pipe(map((response) => response.result ?? []));
  }

  setDefaultOrganization(organizationId: string): Observable<ApiResponse<OrganizationDefaultResult>> {
    return this.organizationsApi.setDefaultOrganization(organizationId);
  }

  setDefaultCompany(companyId: string): Observable<ApiResponse<AuthUser>> {
    return this.usersApi.setDefaultCompany(companyId);
  }

  setDefaultEnterprise(enterpriseId: string): Observable<ApiResponse<AuthUser>> {
    return this.usersApi.setDefaultEnterprise(enterpriseId);
  }

  setDefaultCurrency(currencyId: string): Observable<ApiResponse<AuthUser>> {
    return this.usersApi.setDefaultCurrency(currencyId);
  }
}
