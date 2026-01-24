import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';

import { CompaniesApiService } from '../../../../core/api/companies-api.service';
import { OrganizationsService } from '../../../../core/api/organizations-api.service';
import { CompanyStateService } from '../../../../core/company/company-state.service';
import { Company } from '../../../../shared/models/company.model';
import { IOrganization } from '../../../../shared/models/organization.model';

@Component({
  selector: 'app-company-selector',
  templateUrl: './company-selector.component.html',
  styleUrl: './company-selector.component.scss',
  providers: [MessageService],
  standalone: false,
})
export class CompanySelectorComponent implements OnInit {
  organizations: IOrganization[] = [];
  companies: Company[] = [];
  selectedOrganizationId = '';
  selectedCompanyId = '';
  loading = false;

  constructor(
    private readonly organizationsApi: OrganizationsService,
    private readonly companiesApi: CompaniesApiService,
    private readonly companyState: CompanyStateService,
    private readonly router: Router,
    private readonly messageService: MessageService,
  ) {}

  ngOnInit(): void {
    this.loadOrganizations();
  }

  get organizationOptions(): Array<{ label: string; value: string }> {
    return this.organizations.map((org) => ({ label: org.name, value: org.id ?? '' }));
  }

  get companyOptions(): Array<{ label: string; value: string }> {
    return this.companies.map((company) => ({ label: company.name, value: company.id ?? '' }));
  }

  onOrganizationChange(): void {
    this.selectedCompanyId = '';
    if (!this.selectedOrganizationId) {
      this.companies = [];
      return;
    }
    this.loadCompanies(this.selectedOrganizationId);
  }

  selectCompany(): void {
    if (!this.selectedCompanyId) {
      return;
    }
    this.companyState.setActiveCompanyId(this.selectedCompanyId);
    if (!this.companyState.getDefaultCompanyId()) {
      this.companyState.setDefaultCompanyId(this.selectedCompanyId);
    }
    this.router.navigateByUrl(`/company/${this.selectedCompanyId}/dashboard`);
  }

  goToOrganizations(): void {
    this.router.navigate(['/organizations']);
  }

  goToCompanies(): void {
    if (!this.selectedOrganizationId) {
      return;
    }
    this.router.navigate(['/organizations', this.selectedOrganizationId, 'companies']);
  }

  private loadOrganizations(): void {
    this.loading = true;
    this.organizationsApi.list().subscribe({
      next: ({ result }) => {
        this.organizations = result ?? [];
        this.loading = false;
        if (this.organizations.length > 0 && !this.selectedOrganizationId) {
          this.selectedOrganizationId = this.organizations[0]?.id ?? '';
          if (this.selectedOrganizationId) {
            this.loadCompanies(this.selectedOrganizationId);
          }
        }
      },
      error: () => {
        this.loading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Organizaciones',
          detail: 'No se pudieron cargar las organizaciones.',
        });
      },
    });
  }

  private loadCompanies(orgId: string): void {
    this.loading = true;
    this.companiesApi.listByOrganization(orgId).subscribe({
      next: ({ result }) => {
        this.companies = result ?? [];
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Companias',
          detail: 'No se pudieron cargar las companias.',
        });
      },
    });
  }
}
