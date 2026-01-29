import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin, take } from 'rxjs';
import { MessageService } from 'primeng/api';

import { AuthService } from '../../../../core/auth/auth.service';
import { OrganizationsService } from '../../../../core/api/organizations-api.service';
import { ActiveContextStateService } from '../../../../core/context/active-context-state.service';
import {
  IOrganization,
  IOrganizationMember,
  IOrganizationMembership,
  UpdateOrganizationRequest,
} from '../../../../shared/models/organization.model';
import { OrganizationSelectionRow } from '../../models/organization-selection.model';

interface OrganizationSelectionState {
  active: OrganizationSelectionRow[];
  invitations: OrganizationSelectionRow[];
}

@Component({
  selector: 'app-organization-select-page',
  templateUrl: './organization-select-page.component.html',
  styleUrl: './organization-select-page.component.scss',
  providers: [MessageService],
  standalone: false,
})
export class OrganizationSelectPageComponent implements OnInit {
  loading = false;
  activeOrganizations: OrganizationSelectionRow[] = [];
  invitedOrganizations: OrganizationSelectionRow[] = [];
  currentUserId: string | null = null;
  defaultOrganizationId: string | null = null;

  editDialogOpen = false;
  deleteDialogOpen = false;
  selectedOrganization: OrganizationSelectionRow | null = null;

  editForm: FormGroup<{
    name: FormControl<string>;
  }>;

  constructor(
    private readonly organizationsApi: OrganizationsService,
    private readonly authService: AuthService,
    private readonly activeContextState: ActiveContextStateService,
    private readonly router: Router,
    private readonly fb: FormBuilder,
    private readonly messageService: MessageService,
  ) {
    this.editForm = this.fb.nonNullable.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
    });
  }

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    this.currentUserId = user?.id ?? null;
    this.defaultOrganizationId = user?.defaultOrganizationId ?? null;
    this.loadOrganizations();
  }

  loadOrganizations(): void {
    this.loading = true;
    forkJoin({
      organizations: this.organizationsApi.list(),
      memberships: this.organizationsApi.listMemberships(),
    }).subscribe({
      next: ({ organizations, memberships }) => {
        const orgList = organizations.result ?? [];
        const membershipList = memberships.result ?? [];
        const state = this.buildSelectionState(orgList, membershipList);
        this.activeOrganizations = state.active;
        this.invitedOrganizations = state.invitations;
        this.loading = false;
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

  openCreateOrganization(): void {
    this.router.navigateByUrl('/organizations/create');
  }

  selectOrganization(row: OrganizationSelectionRow): void {
    if (row.status !== 'active') {
      return;
    }

    if (row.isDefault) {
      this.redirectFromContext();
      return;
    }

    this.organizationsApi.setDefaultOrganization(row.id).subscribe({
      next: () => {
        this.updateDefault(row.id);
        this.syncUserAndContext(true);
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Organizaciones',
          detail: 'No se pudo marcar la organizacion como predeterminada.',
        });
      },
    });
  }

  setDefault(row: OrganizationSelectionRow): void {
    if (row.isDefault) {
      return;
    }

    this.organizationsApi.setDefaultOrganization(row.id).subscribe({
      next: () => {
        this.updateDefault(row.id);
        this.syncUserAndContext(false);
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Organizaciones',
          detail: 'No se pudo marcar la organizacion como predeterminada.',
        });
      },
    });
  }

  openEdit(row: OrganizationSelectionRow): void {
    this.selectedOrganization = row;
    this.editForm.reset({ name: row.name });
    this.editDialogOpen = true;
  }

  saveEdit(): void {
    if (!this.selectedOrganization?.id || this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    const payload = this.editForm.getRawValue();
    const request: UpdateOrganizationRequest = {
      name: payload.name.trim(),
    };
    this.organizationsApi.updateOrganization(this.selectedOrganization.id, request).subscribe({
      next: (res) => {
        const result = res?.result;
        if (result?.id) {
          this.applyOrganizationUpdate(result.id, result.name);
        }
        this.editDialogOpen = false;
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Organizaciones',
          detail: 'No se pudo actualizar la organizacion.',
        });
      },
    });
  }

  openDelete(row: OrganizationSelectionRow): void {
    this.selectedOrganization = row;
    this.deleteDialogOpen = true;
  }

  confirmDelete(): void {
    if (!this.selectedOrganization?.id) {
      return;
    }

    this.organizationsApi.deleteOrganization(this.selectedOrganization.id).subscribe({
      next: () => {
        this.removeOrganization(this.selectedOrganization!.id);
        this.deleteDialogOpen = false;
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Organizaciones',
          detail: 'No se pudo eliminar la organizacion.',
        });
      },
    });
  }

  leaveOrganization(row: OrganizationSelectionRow): void {
    this.organizationsApi.leaveOrganization(row.id).subscribe({
      next: () => {
        this.removeOrganization(row.id);
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Organizaciones',
          detail: 'No se pudo salir de la organizacion.',
        });
      },
    });
  }

  canEdit(row: OrganizationSelectionRow): boolean {
    return row.isOwner;
  }

  canDelete(row: OrganizationSelectionRow): boolean {
    return row.isOwner;
  }

  private buildSelectionState(
    organizations: IOrganization[],
    memberships: IOrganizationMembership[],
  ): OrganizationSelectionState {
    const membershipMap = new Map(memberships.map((item) => [item.organizationId, item]));
    const rows = organizations
      .map((organization) => this.toRow(organization, membershipMap))
      .filter((row): row is OrganizationSelectionRow => Boolean(row));

    return {
      active: rows.filter((row) => row.status === 'active'),
      invitations: rows.filter((row) => row.status === 'pending'),
    };
  }

  private toRow(
    organization: IOrganization,
    membershipMap: Map<string, IOrganizationMembership>,
  ): OrganizationSelectionRow | null {
    if (!organization.id) {
      return null;
    }

    const membership = membershipMap.get(organization.id);
    if (!membership) {
      return null;
    }

    const member = this.findMemberRecord(organization.members ?? []);
    const isOwner = membership.roleKey === 'owner';
    const canLeave = !isOwner && (membership.status === 'pending' || Boolean(member?.invitedBy));

    return {
      id: organization.id,
      name: organization.name,
      code: organization.code,
      roleKey: membership.roleKey,
      status: membership.status,
      isDefault: organization.id === this.defaultOrganizationId,
      isOwner,
      canLeave,
    };
  }

  private findMemberRecord(members: IOrganizationMember[]): IOrganizationMember | null {
    if (!this.currentUserId) {
      return null;
    }
    return members.find((member) => member.userId === this.currentUserId) ?? null;
  }

  private updateDefault(organizationId: string): void {
    this.defaultOrganizationId = organizationId;
    this.activeOrganizations = this.activeOrganizations.map((row) =>
      this.withDefaultFlag(row, organizationId)
    );
    this.invitedOrganizations = this.invitedOrganizations.map((row) =>
      this.withDefaultFlag(row, organizationId)
    );
  }

  private applyOrganizationUpdate(id: string, name: string): void {
    const update = (row: OrganizationSelectionRow): OrganizationSelectionRow =>
      row.id === id ? this.withName(row, name) : row;
    this.activeOrganizations = this.activeOrganizations.map(update);
    this.invitedOrganizations = this.invitedOrganizations.map(update);
  }

  private removeOrganization(id: string): void {
    this.activeOrganizations = this.activeOrganizations.filter((row) => row.id !== id);
    this.invitedOrganizations = this.invitedOrganizations.filter((row) => row.id !== id);
    if (this.defaultOrganizationId === id) {
      this.defaultOrganizationId = null;
    }
  }

  private withDefaultFlag(
    row: OrganizationSelectionRow,
    organizationId: string,
  ): OrganizationSelectionRow {
    return {
      ...row,
      isDefault: row.id === organizationId,
    };
  }

  private withName(row: OrganizationSelectionRow, name: string): OrganizationSelectionRow {
    return {
      ...row,
      name,
    };
  }

  private syncUserAndContext(shouldRedirect: boolean): void {
    this.authService.loadMe().pipe(take(1)).subscribe({
      next: (user) => {
        this.defaultOrganizationId = user?.defaultOrganizationId ?? this.defaultOrganizationId;
      },
    });
    this.authService.refreshToken().subscribe({
      next: () => {
        if (shouldRedirect) {
          this.redirectFromContext();
        }
      },
      error: () => {
        if (shouldRedirect) {
          this.redirectFromContext();
        }
      },
    });
  }

  private redirectFromContext(): void {
    const context = this.activeContextState.getActiveContext();
    if (this.activeContextState.isComplete(context) && context.companyId) {
      this.router.navigateByUrl(`/company/${context.companyId}/dashboard`);
      return;
    }
    if (context.organizationId) {
      this.router.navigateByUrl('/organizations/setup');
      return;
    }
    this.router.navigateByUrl('/organizations/entry');
  }
}
