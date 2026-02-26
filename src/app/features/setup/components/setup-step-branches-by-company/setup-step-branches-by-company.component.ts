import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { take } from 'rxjs/operators';

import { BranchesApiService } from '../../../../core/api/branches-api.service';
import { CompaniesApiService } from '../../../../core/api/companies-api.service';
import { OrganizationCoreApiService } from '../../../../core/api/organization-core-api.service';
import { Branch } from '../../../../shared/models/branch.model';
import { Company } from '../../../../shared/models/company.model';
import { CoreCurrency } from '../../../../shared/models/organization-core.model';

@Component({
  selector: 'app-setup-step-branches-by-company',
  templateUrl: './setup-step-branches-by-company.component.html',
  styleUrl: './setup-step-branches-by-company.component.scss',
  standalone: false,
})
export class SetupStepBranchesByCompanyComponent implements OnChanges {
  private readonly fb = inject(FormBuilder);
  private readonly branchesApi = inject(BranchesApiService);
  private readonly companiesApi = inject(CompaniesApiService);
  private readonly organizationCoreApi = inject(OrganizationCoreApiService);
  private readonly messageService = inject(MessageService);

  @Input() organizationId: string | null = null;
  @Input() refreshToken = 0;

  @Output() finished = new EventEmitter<void>();
  @Output() editBranch = new EventEmitter<Branch>();
  @Output() deleteBranch = new EventEmitter<Branch>();

  companies: Company[] = [];
  branches: Branch[] = [];
  currencies: SelectOption[] = [];

  readonly companyFilterControl = this.fb.control<string | null>(null);

  isLoading = false;
  isBranchDialogOpen = false;
  isSubmittingBranch = false;

  readonly branchForm = this.fb.nonNullable.group({
    name: this.fb.nonNullable.control('', [Validators.required, Validators.minLength(2)]),
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['organizationId']) {
      this.loadData();
    }
    if (changes['refreshToken'] && !changes['refreshToken'].firstChange) {
      this.loadData();
    }
  }

  get hasOrganization(): boolean {
    return Boolean(this.organizationId);
  }

  get selectedCompany(): Company | null {
    const companyId = this.companyFilterControl.value;
    if (!companyId) {
      return null;
    }
    return this.companies.find((company) => company.id === companyId) ?? null;
  }

  openCreateBranchDialog(): void {
    if (!this.selectedCompany?.id) {
      this.messageService.add({
        severity: 'info',
        summary: 'Atencion',
        detail: 'Selecciona una compania para continuar.',
      });
      return;
    }
    this.branchForm.reset({
      name: '',
    });
    this.isBranchDialogOpen = true;
  }

  onCompanyChange(companyId: string | null): void {
    if (!companyId) {
      this.branches = [];
      return;
    }
    this.loadBranches(companyId);
  }

  submitBranch(): void {
    const companyId = this.selectedCompany?.id;
    if (!companyId || this.isSubmittingBranch) {
      return;
    }

    if (this.branchForm.invalid) {
      this.branchForm.markAllAsTouched();
      return;
    }

    const { name } = this.branchForm.getRawValue();
    const countryId = this.resolveCompanyCountryId(this.selectedCompany);
    if (!name?.trim() || !countryId) {
      this.branchForm.markAllAsTouched();
      if (!countryId) {
        this.messageService.add({
          severity: 'warn',
          summary: 'Atencion',
          detail: 'La compania seleccionada no tiene pais base.',
        });
      }
      return;
    }

    this.isSubmittingBranch = true;
    this.branchesApi
      .create(companyId, {
        name: name.trim(),
        countryId,
        currencyIds: this.currencies.length ? this.currencies.map((currency) => currency.id) : undefined,
      })
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.isSubmittingBranch = false;
          this.isBranchDialogOpen = false;
          this.loadBranches(companyId);
          this.messageService.add({
            severity: 'success',
            summary: 'Listo',
            detail: 'Empresa creada.',
          });
        },
        error: () => {
          this.isSubmittingBranch = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo crear la empresa.',
          });
        },
      });
  }

  private loadData(): void {
    if (!this.organizationId) {
      this.companies = [];
      this.branches = [];
      this.currencies = [];
      return;
    }

    this.isLoading = true;
    this.organizationCoreApi
      .getCoreSettings(this.organizationId)
      .pipe(take(1))
      .subscribe({
        next: (response) => {
          const result = response?.result;
          const currencies = Array.isArray(result?.currencies) ? result.currencies : [];
          this.currencies = currencies
            .map((currency: CoreCurrency) => ({
              id: currency.id,
              name: currency.name,
              code: currency.code,
              symbol: currency.symbol,
            }))
            .filter((item) => item.id);
          this.loadCompanies();
        },
        error: () => {
          this.isLoading = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudieron cargar las empresas.',
          });
        },
      });
  }

  private loadCompanies(): void {
    if (!this.organizationId) {
      this.companies = [];
      this.branches = [];
      this.isLoading = false;
      return;
    }

    this.companiesApi
      .listByOrganization(this.organizationId)
      .pipe(take(1))
      .subscribe({
        next: (response) => {
          this.companies = Array.isArray(response?.result) ? response.result : [];
          if (!this.companyFilterControl.value && this.companies.length > 0) {
            this.companyFilterControl.setValue(this.companies[0].id ?? null);
          }
          const selected = this.companyFilterControl.value;
          if (selected) {
            this.loadBranches(selected);
          } else {
            this.branches = [];
            this.isLoading = false;
          }
        },
        error: () => {
          this.companies = [];
          this.branches = [];
          this.isLoading = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudieron cargar las companias.',
          });
        },
      });
  }

  private loadBranches(companyId: string): void {
    if (!companyId) {
      this.branches = [];
      this.isLoading = false;
      return;
    }

    this.branchesApi
      .listByCompany(companyId)
      .pipe(take(1))
      .subscribe({
        next: (response) => {
          this.branches = Array.isArray(response?.result) ? response.result : [];
          this.isLoading = false;
          if (this.branches.length > 0) {
            this.finished.emit();
          }
        },
        error: () => {
          this.branches = [];
          this.isLoading = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudieron cargar las empresas.',
          });
        },
      });
  }

  private resolveCompanyCountryId(company: Company | null): string | null {
    if (!company) {
      return null;
    }
    return company.baseCountryId || (company as { countryId?: string }).countryId || null;
  }
}

interface SelectOption {
  id: string;
  name: string;
  code?: string;
  symbol?: string;
}
