import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { DataView } from 'primeng/dataview';
import { Listbox } from 'primeng/listbox';
import { Toast } from 'primeng/toast';
import { take } from 'rxjs';

import { OrganizationsService } from '../../../../core/api/organizations-api.service';
import { ActiveContextStateService } from '../../../../core/context/active-context-state.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { IOrganization, IOrganizationMembership } from '../../../../shared/models/organization.model';

@Component({
  selector: 'app-org-entry-page',
  standalone: true,
  imports: [CommonModule, Button, Card, DataView, Listbox, Toast],
  templateUrl: './org-entry-page.component.html',
  styleUrl: './org-entry-page.component.scss',
  providers: [MessageService],
})
export class OrgEntryPageComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly organizationsApi = inject(OrganizationsService);
  private readonly activeContextState = inject(ActiveContextStateService);
  private readonly authService = inject(AuthService);
  private readonly messageService = inject(MessageService);

  ownerOrganizations: IOrganization[] = [];
  memberships: IOrganizationMembership[] = [];
  loading = false;
  selecting = false;

  ngOnInit(): void {
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

  private loadData(): void {
    this.loading = true;
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

  goCreate(): void {
    this.router.navigate(['/org/setup/create']);
  }

  goJoin(): void {
    this.router.navigate(['/org/setup/join']);
  }
}
