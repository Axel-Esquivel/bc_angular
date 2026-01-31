import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { FloatLabel } from 'primeng/floatlabel';
import { Select } from 'primeng/select';
import { Toast } from 'primeng/toast';
import { take } from 'rxjs';

import { ContextApiService } from '../../../../core/api/context-api.service';
import { ContextStateService } from '../../../../core/context/context-state.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { IOrganization } from '../../../../shared/models/organization.model';
import { Company } from '../../../../shared/models/company.model';

@Component({
  selector: 'app-context-select-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, Button, Card, FloatLabel, Select, Toast],
  templateUrl: './context-select-page.component.html',
  styleUrl: './context-select-page.component.scss',
  providers: [MessageService],
})
export class ContextSelectPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly contextApi = inject(ContextApiService);
  private readonly contextState = inject(ContextStateService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);

  organizations: IOrganization[] = [];
  companies: Company[] = [];
  loadingOrganizations = false;
  loadingCompanies = false;
  submitting = false;

  readonly form = this.fb.group({
    organizationId: this.fb.nonNullable.control('', [Validators.required]),
    companyId: this.fb.nonNullable.control('', [Validators.required]),
  });

  ngOnInit(): void {
    this.loadOrganizations();
    this.form.controls.organizationId.valueChanges.subscribe((orgId) => {
      if (!orgId) {
        this.companies = [];
        this.form.controls.companyId.setValue('');
        return;
      }
      this.loadCompanies(orgId);
    });
  }

  private loadOrganizations(): void {
    this.loadingOrganizations = true;
    this.contextApi
      .listOrganizations()
      .pipe(take(1))
      .subscribe({
        next: (organizations) => {
          this.organizations = organizations ?? [];
          this.loadingOrganizations = false;
          const defaultOrgId = this.authService.getCurrentUser()?.defaultOrganizationId;
          const resolved =
            defaultOrgId && this.organizations.some((org) => org.id === defaultOrgId)
              ? defaultOrgId
              : this.organizations[0]?.id ?? '';
          if (resolved) {
            this.form.controls.organizationId.setValue(resolved);
          }
        },
        error: () => {
          this.loadingOrganizations = false;
          this.organizations = [];
          this.messageService.add({
            severity: 'error',
            summary: 'Contexto',
            detail: 'No se pudieron cargar las organizaciones.',
          });
        },
      });
  }

  private loadCompanies(organizationId: string): void {
    this.loadingCompanies = true;
    this.contextApi
      .listCompanies(organizationId)
      .pipe(take(1))
      .subscribe({
        next: (companies) => {
          this.companies = companies ?? [];
          this.loadingCompanies = false;
          const defaultCompanyId = this.authService.getCurrentUser()?.defaultCompanyId;
          const resolved =
            defaultCompanyId && this.companies.some((company) => company.id === defaultCompanyId)
              ? defaultCompanyId
              : this.companies[0]?.id ?? '';
          if (resolved) {
            this.form.controls.companyId.setValue(resolved);
          } else {
            this.form.controls.companyId.setValue('');
          }
        },
        error: () => {
          this.loadingCompanies = false;
          this.companies = [];
          this.messageService.add({
            severity: 'error',
            summary: 'Contexto',
            detail: 'No se pudieron cargar las companias.',
          });
        },
      });
  }

  save(): void {
    if (this.form.invalid || this.submitting) {
      this.form.markAllAsTouched();
      return;
    }

    const orgId = this.form.controls.organizationId.value;
    const companyId = this.form.controls.companyId.value;
    const company = this.companies.find((item) => item.id === companyId);
    if (!company || !company.id) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Contexto',
        detail: 'Selecciona una compania valida.',
      });
      return;
    }

    this.submitting = true;
    this.contextState
      .setDefaults(orgId, company)
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.submitting = false;
          this.router.navigateByUrl('/app');
        },
        error: () => {
          this.submitting = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Contexto',
            detail: 'No se pudo guardar el contexto.',
          });
        },
      });
  }
}
