import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { Dialog } from 'primeng/dialog';
import { FloatLabel } from 'primeng/floatlabel';
import { InputText } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { Toast } from 'primeng/toast';
import { take } from 'rxjs';

import { CountriesApiService } from '../../../../core/api/countries-api.service';
import { CurrenciesApiService } from '../../../../core/api/currencies-api.service';
import { OrganizationsService } from '../../../../core/api/organizations-api.service';
import { ActiveContextStateService } from '../../../../core/context/active-context-state.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { SessionStateService } from '../../../../core/services/session-state.service';
import { Country } from '../../../../shared/models/country.model';
import { Currency } from '../../../../shared/models/currency.model';
import { IOrganization, IOrganizationMembership } from '../../../../shared/models/organization.model';
import { OrgCreatePageComponent } from '../org-create-page/org-create-page.component';

@Component({
  selector: 'app-org-entry-page',
  standalone: true,
  imports: [CommonModule, FormsModule, Button, Card, Dialog, FloatLabel, InputText, TableModule, Toast, OrgCreatePageComponent],
  templateUrl: './org-entry-page.component.html',
  styleUrl: './org-entry-page.component.scss',
  providers: [MessageService],
})
export class OrgEntryPageComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly organizationsApi = inject(OrganizationsService);
  private readonly countriesApi = inject(CountriesApiService);
  private readonly currenciesApi = inject(CurrenciesApiService);
  private readonly activeContextState = inject(ActiveContextStateService);
  private readonly authService = inject(AuthService);
  private readonly sessionState = inject(SessionStateService);
  private readonly messageService = inject(MessageService);

  ownerOrganizations: IOrganization[] = [];
  memberships: IOrganizationMembership[] = [];
  countries: Country[] = [];
  currencies: Currency[] = [];
  countryMap = new Map<string, Country>();
  currencyMap = new Map<string, Currency>();
  loading = false;
  selecting = false;
  wizardDialogOpen = false;
  wizardOrganizationId: string | null = null;
  wizardStartStep = 0;
  editDialogOpen = false;
  editOrganizationId: string | null = null;
  editOrganizationName = '';
  pendingSetup = this.sessionState.getPendingOrgSetup();
  hidePendingBanner = false;

  ngOnInit(): void {
    this.pendingSetup = this.sessionState.getPendingOrgSetup();
    if (history.state?.refresh) {
      this.refreshLists();
      return;
    }
    this.loadData();
  }

  get activeMemberships(): IOrganizationMembership[] {
    return this.memberships.filter((member) => member.status === 'active');
  }

  get pendingMemberships(): IOrganizationMembership[] {
    return this.memberships.filter((member) => member.status === 'pending');
  }

  get rejectedMemberships(): IOrganizationMembership[] {
    return [];
  }

  get isEmpty(): boolean {
    return this.ownerOrganizations.length === 0 && this.memberships.length === 0;
  }

  refreshLists(): void {
    this.pendingSetup = this.sessionState.getPendingOrgSetup();
    this.loadData();
  }

  private loadData(): void {
    this.loading = true;
    this.loadCountries();
    this.loadCurrencies();
    this.organizationsApi
      .list()
      .pipe(take(1))
      .subscribe({
        next: (response) => {
          const orgs = response?.result ?? [];
          const userId = this.authService.getCurrentUser()?.id ?? null;
          this.ownerOrganizations = userId ? orgs.filter((org) => org.ownerUserId === userId) : [];
          this.loadMemberships();
        },
        error: () => {
          this.loading = false;
          this.ownerOrganizations = [];
          this.messageService.add({
            severity: 'error',
            summary: 'Organizaciones',
            detail: 'No se pudieron cargar las organizaciones.',
          });
          this.loadMemberships();
        },
      });
  }

  private loadMemberships(): void {
    this.organizationsApi
      .listMemberships()
      .pipe(take(1))
      .subscribe({
        next: (response) => {
          this.memberships = response?.result ?? [];
          this.loading = false;
        },
        error: () => {
          this.memberships = [];
          this.loading = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Organizaciones',
            detail: 'No se pudieron cargar las membresias.',
          });
        },
      });
  }

  private loadCountries(): void {
    this.countriesApi
      .list()
      .pipe(take(1))
      .subscribe({
        next: (response) => {
          const items = Array.isArray(response?.result) ? response.result : [];
          this.countries = items;
          const entries = items
            .map((country) => {
              const id = country.id ?? country.iso2;
              return id ? ([id, country] as const) : null;
            })
            .filter((entry): entry is [string, Country] => Boolean(entry));
          this.countryMap = new Map(entries);
        },
        error: () => {
          this.countries = [];
          this.countryMap = new Map();
        },
      });
  }

  private loadCurrencies(): void {
    this.currenciesApi
      .list()
      .pipe(take(1))
      .subscribe({
        next: (response) => {
          const items = Array.isArray(response?.result) ? response.result : [];
          this.currencies = items;
          const entries = items
            .map((currency) => {
              const id = currency.id ?? currency.code;
              return id ? ([id, currency] as const) : null;
            })
            .filter((entry): entry is [string, Currency] => Boolean(entry));
          this.currencyMap = new Map(entries);
        },
        error: () => {
          this.currencies = [];
          this.currencyMap = new Map();
        },
      });
  }

  getCountryLabel(organization: IOrganization): string {
    const id = organization.countryIds?.[0];
    if (!id) {
      return '—';
    }
    const country = this.countryMap.get(id);
    if (!country) {
      return id;
    }
    const code = (country.iso2 || id).toUpperCase();
    return `${country.nameEs || country.nameEn || code} (${code})`;
  }

  getCurrencyLabel(organization: IOrganization): string {
    const id = organization.currencyIds?.[0];
    if (!id) {
      return '—';
    }
    const currency = this.currencyMap.get(id);
    if (!currency) {
      return id;
    }
    return `${currency.name} (${currency.symbol || currency.code})`;
  }

  get pendingOrganizationLabel(): string {
    const pendingId = this.pendingSetup?.organizationId;
    if (!pendingId) {
      return 'Organizacion pendiente';
    }
    const owner = this.ownerOrganizations.find((org) => org.id === pendingId);
    if (owner?.name) {
      return owner.name;
    }
    const member = this.memberships.find((org) => org.organizationId === pendingId);
    if (member?.name) {
      return member.name;
    }
    return pendingId;
  }

  openEdit(organization: IOrganization): void {
    if (!organization?.id) {
      return;
    }
    this.editOrganizationId = organization.id;
    this.editOrganizationName = organization.name;
    this.editDialogOpen = true;
  }

  closeEdit(): void {
    this.editDialogOpen = false;
    this.editOrganizationId = null;
    this.editOrganizationName = '';
  }

  saveEdit(): void {
    if (!this.editOrganizationId) {
      return;
    }
    const name = this.editOrganizationName.trim();
    if (!name) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'El nombre es obligatorio.' });
      return;
    }

    this.organizationsApi
      .updateOrganization(this.editOrganizationId, { name })
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.messageService.add({ severity: 'success', summary: 'Listo', detail: 'Organizacion actualizada.' });
          this.closeEdit();
          this.refreshLists();
        },
        error: () => {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo actualizar la organizacion.' });
        },
      });
  }

  selectOrganization(organization: IOrganization): void {
    const orgId = organization?.id;
    if (!orgId || this.selecting) {
      return;
    }

    this.selecting = true;
    this.organizationsApi
      .setDefaultOrganization(orgId)
      .pipe(take(1))
      .subscribe({
        next: () => {
          const current = this.activeContextState.getActiveContext();
          this.activeContextState.setActiveContext({ ...current, organizationId: orgId });
          this.selecting = false;
          this.router.navigate(['/context/select']);
        },
        error: () => {
          this.selecting = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Organizaciones',
            detail: 'No se pudo seleccionar la organizacion.',
          });
        },
      });
  }

  setDefault(organization: IOrganization): void {
    const orgId = organization?.id;
    if (!orgId || this.selecting) {
      return;
    }
    this.selecting = true;
    this.organizationsApi
      .setDefaultOrganization(orgId)
      .pipe(take(1))
      .subscribe({
        next: () => {
          const current = this.activeContextState.getActiveContext();
          this.activeContextState.setActiveContext({ ...current, organizationId: orgId });
          this.selecting = false;
          this.messageService.add({ severity: 'success', summary: 'Listo', detail: 'Organizacion por defecto actualizada.' });
        },
        error: () => {
          this.selecting = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Organizaciones',
            detail: 'No se pudo actualizar la organizacion por defecto.',
          });
        },
      });
  }

  deleteOrganization(organization: IOrganization): void {
    const orgId = organization?.id;
    if (!orgId || this.selecting) {
      return;
    }
    this.selecting = true;
    this.organizationsApi
      .deleteOrganization(orgId)
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.selecting = false;
          this.messageService.add({ severity: 'success', summary: 'Listo', detail: 'Organizacion eliminada.' });
          if (this.pendingSetup?.organizationId === orgId) {
            this.sessionState.clearPendingOrgSetup();
            this.pendingSetup = null;
          }
          this.refreshLists();
        },
        error: () => {
          this.selecting = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Organizaciones',
            detail: 'No se pudo eliminar la organizacion.',
          });
        },
      });
  }

  leaveOrganization(membership: IOrganizationMembership): void {
    const orgId = membership?.organizationId;
    if (!orgId || this.selecting) {
      return;
    }
    this.selecting = true;
    this.organizationsApi
      .leaveOrganization(orgId)
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.selecting = false;
          this.messageService.add({ severity: 'success', summary: 'Listo', detail: 'Saliste de la organizacion.' });
          this.refreshLists();
        },
        error: () => {
          this.selecting = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Organizaciones',
            detail: 'No se pudo salir de la organizacion.',
          });
        },
      });
  }

  goCreate(): void {
    this.wizardOrganizationId = null;
    this.wizardStartStep = 0;
    this.wizardDialogOpen = true;
  }

  goJoin(): void {
    this.router.navigate(['/org/setup/join']);
  }

  closeWizardDialog(): void {
    this.wizardDialogOpen = false;
  }

  onWizardCancelled(): void {
    this.closeWizardDialog();
  }

  onWizardCompleted(payload: { organizationId: string }): void {
    this.sessionState.clearPendingOrgSetup();
    this.pendingSetup = null;
    this.closeWizardDialog();
    this.refreshLists();
    if (payload.organizationId) {
      this.selectOrganization({ id: payload.organizationId } as IOrganization);
    }
  }

  onWizardOrganizationCreated(payload: { organizationId: string }): void {
    if (!payload?.organizationId) {
      return;
    }
    this.wizardOrganizationId = payload.organizationId;
    this.sessionState.setPendingOrgSetup({
      organizationId: payload.organizationId,
      startedAt: new Date().toISOString(),
      lastStep: 1,
    });
    this.pendingSetup = this.sessionState.getPendingOrgSetup();
    this.refreshLists();
  }

  onWizardStepChanged(step: number): void {
    const orgId = this.wizardOrganizationId || this.pendingSetup?.organizationId;
    if (!orgId) {
      return;
    }
    const startedAt = this.pendingSetup?.startedAt ?? new Date().toISOString();
    this.sessionState.setPendingOrgSetup({
      organizationId: orgId,
      startedAt,
      lastStep: step,
    });
    this.pendingSetup = this.sessionState.getPendingOrgSetup();
  }

  continuePendingSetup(): void {
    if (!this.pendingSetup?.organizationId) {
      return;
    }
    this.wizardOrganizationId = this.pendingSetup.organizationId;
    this.wizardStartStep = this.pendingSetup.lastStep ?? 1;
    this.wizardDialogOpen = true;
  }

  deletePendingSetup(): void {
    const orgId = this.pendingSetup?.organizationId;
    if (!orgId || this.selecting) {
      return;
    }
    const ok = window.confirm('¿Seguro que deseas eliminar la organizacion pendiente?');
    if (!ok) {
      return;
    }
    this.selecting = true;
    this.organizationsApi
      .deleteOrganization(orgId)
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.selecting = false;
          this.sessionState.clearPendingOrgSetup();
          this.pendingSetup = null;
          this.messageService.add({ severity: 'success', summary: 'Listo', detail: 'Organizacion eliminada.' });
          this.refreshLists();
        },
        error: () => {
          this.selecting = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Organizaciones',
            detail: 'No se pudo eliminar la organizacion pendiente.',
          });
        },
      });
  }

  hidePending(): void {
    this.hidePendingBanner = true;
  }
}
