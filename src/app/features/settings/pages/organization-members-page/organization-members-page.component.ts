import { Component, OnInit, inject } from '@angular/core';
import { MessageService } from 'primeng/api';
import { take } from 'rxjs';

import { OrganizationsService } from '../../../../core/api/organizations-api.service';
import { ActiveContextStateService } from '../../../../core/context/active-context-state.service';
import { AuthService } from '../../../../core/auth/auth.service';
import {
  IOrganization,
  IOrganizationRole,
  OrganizationMemberSummary,
  OrganizationMembershipStatus,
} from '../../../../shared/models/organization.model';

interface SelectOption {
  label: string;
  value: string;
}

@Component({
  standalone: false,
  selector: 'app-organization-members-page',
  templateUrl: './organization-members-page.component.html',
  styleUrls: ['./organization-members-page.component.scss'],
  providers: [MessageService],
})
export class OrganizationMembersPageComponent implements OnInit {
  private readonly organizationsApi = inject(OrganizationsService);
  private readonly activeContextState = inject(ActiveContextStateService);
  private readonly authService = inject(AuthService);
  private readonly messageService = inject(MessageService);

  contextMissing = false;
  loading = false;
  members: OrganizationMemberSummary[] = [];
  pendingMembers: OrganizationMemberSummary[] = [];
  roles: IOrganizationRole[] = [];
  roleOptions: SelectOption[] = [];
  permissions: string[] = [];
  canReadMembers = false;
  canWriteMembers = false;

  roleDialogOpen = false;
  selectedMember: OrganizationMemberSummary | null = null;
  selectedRoleKey: string | null = null;

  ngOnInit(): void {
    this.loadContext();
  }

  refresh(): void {
    this.loadContext();
  }

  openRoleDialog(member: OrganizationMemberSummary): void {
    if (!this.canWriteMembers) {
      return;
    }
    this.selectedMember = member;
    this.selectedRoleKey = member.roleKey;
    this.roleDialogOpen = true;
  }

  closeRoleDialog(): void {
    this.roleDialogOpen = false;
    this.selectedMember = null;
    this.selectedRoleKey = null;
  }

  saveRole(): void {
    if (!this.selectedMember || !this.selectedRoleKey) {
      return;
    }
    const organizationId = this.getOrganizationId();
    if (!organizationId) {
      return;
    }
    this.organizationsApi
      .updateMemberRole(organizationId, this.selectedMember.userId, { role: this.selectedRoleKey })
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Listo',
            detail: 'Rol actualizado.',
          });
          this.closeRoleDialog();
          this.loadMembers();
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo actualizar el rol.',
          });
        },
      });
  }

  approveMember(member: OrganizationMemberSummary): void {
    const organizationId = this.getOrganizationId();
    if (!organizationId || !this.canWriteMembers) {
      return;
    }
    this.organizationsApi
      .acceptMember(organizationId, member.userId)
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Listo',
            detail: 'Ingreso aprobado.',
          });
          this.loadMembers();
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo aprobar el ingreso.',
          });
        },
      });
  }

  rejectMember(member: OrganizationMemberSummary): void {
    const organizationId = this.getOrganizationId();
    if (!organizationId || !this.canWriteMembers) {
      return;
    }
    this.organizationsApi
      .rejectMember(organizationId, member.userId)
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Listo',
            detail: 'Solicitud rechazada.',
          });
          this.loadMembers();
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo rechazar la solicitud.',
          });
        },
      });
  }

  toggleAccess(member: OrganizationMemberSummary): void {
    const organizationId = this.getOrganizationId();
    if (!organizationId || !this.canWriteMembers) {
      return;
    }
    const nextStatus = member.status === 'disabled' ? 'active' : 'disabled';
    this.organizationsApi
      .updateMemberAccess(organizationId, member.userId, { status: nextStatus })
      .pipe(take(1))
      .subscribe({
        next: () => {
          const detail =
            nextStatus === 'active' ? 'Acceso activado.' : 'Acceso deshabilitado.';
          this.messageService.add({ severity: 'success', summary: 'Listo', detail });
          this.loadMembers();
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo actualizar el acceso.',
          });
        },
      });
  }

  removeMember(member: OrganizationMemberSummary): void {
    const organizationId = this.getOrganizationId();
    if (!organizationId || !this.canWriteMembers) {
      return;
    }
    const ok = window.confirm('¿Seguro que deseas remover este miembro?');
    if (!ok) {
      return;
    }
    this.organizationsApi
      .removeMember(organizationId, member.userId)
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Listo',
            detail: 'Miembro removido.',
          });
          this.loadMembers();
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo remover el miembro.',
          });
        },
      });
  }

  statusLabel(status: OrganizationMembershipStatus): string {
    if (status === 'pending') {
      return 'Pendiente';
    }
    if (status === 'disabled') {
      return 'Deshabilitado';
    }
    return 'Activo';
  }

  statusSeverity(status: OrganizationMembershipStatus): 'success' | 'info' | 'warn' | 'danger' {
    if (status === 'pending') {
      return 'warn';
    }
    if (status === 'disabled') {
      return 'danger';
    }
    return 'success';
  }

  getRolePermissions(): string[] {
    if (!this.selectedRoleKey) {
      return [];
    }
    const role = this.roles.find((item) => item.key === this.selectedRoleKey);
    return role?.permissions ?? [];
  }

  private loadContext(): void {
    const organizationId = this.getOrganizationId();
    if (!organizationId) {
      this.contextMissing = true;
      this.members = [];
      this.pendingMembers = [];
      return;
    }
    this.contextMissing = false;
    this.loadOrganization(organizationId);
  }

  private loadOrganization(organizationId: string): void {
    this.loading = true;
    this.organizationsApi
      .getById(organizationId)
      .pipe(take(1))
      .subscribe({
        next: (response) => {
          const organization = response.result;
          this.roles = organization?.roles ?? [];
          this.roleOptions = this.roles.map((role) => ({
            label: role.name,
            value: role.key,
          }));
          this.permissions = this.resolvePermissions(organization);
          this.canReadMembers = this.hasPermission('users.read');
          this.canWriteMembers = this.hasPermission('users.write');
          if (this.canReadMembers) {
            this.loadMembers();
          } else {
            this.loading = false;
            this.members = [];
            this.pendingMembers = [];
          }
        },
        error: () => {
          this.loading = false;
          this.members = [];
          this.pendingMembers = [];
        },
      });
  }

  private loadMembers(): void {
    const organizationId = this.getOrganizationId();
    if (!organizationId) {
      return;
    }
    this.loading = true;
    this.organizationsApi
      .listMembers(organizationId)
      .pipe(take(1))
      .subscribe({
        next: (response) => {
          const items = response.result ?? [];
          this.pendingMembers = items.filter((member) => member.status === 'pending');
          this.members = items.filter((member) => member.status !== 'pending');
          this.loading = false;
        },
        error: () => {
          this.members = [];
          this.pendingMembers = [];
          this.loading = false;
        },
      });
  }

  private resolvePermissions(organization?: IOrganization): string[] {
    const currentUser = this.authService.getCurrentUser();
    const userId = currentUser?.id ?? null;
    if (!organization || !userId) {
      return [];
    }
    const member = organization.members?.find((item) => item.userId === userId);
    if (!member) {
      return [];
    }
    const role = organization.roles?.find((item) => item.key === member.roleKey);
    return role?.permissions ?? [];
  }

  private hasPermission(required: string): boolean {
    if (this.permissions.includes('*') || this.permissions.includes(required)) {
      return true;
    }
    return this.permissions.some((permission) => {
      if (!permission.endsWith('.*')) {
        return false;
      }
      const prefix = permission.slice(0, -1);
      return required.startsWith(prefix);
    });
  }

  private getOrganizationId(): string | null {
    const context = this.activeContextState.getActiveContext();
    return context.organizationId ?? null;
  }
}
