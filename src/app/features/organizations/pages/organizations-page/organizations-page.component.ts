import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';

import { AuthService } from '../../../../core/auth/auth.service';
import { OrganizationsService } from '../../../../core/api/organizations-api.service';
import { UsersApiService } from '../../../../core/api/users-api.service';
import { IOrganization, IOrganizationMember, IOrganizationRole } from '../../../../shared/models/organization.model';

@Component({
  selector: 'app-organizations-page',
  templateUrl: './organizations-page.component.html',
  styleUrl: './organizations-page.component.scss',
  providers: [MessageService],
  standalone: false,
})
export class OrganizationsPageComponent implements OnInit {
  organizations: IOrganization[] = [];
  loading = false;

  createDialogOpen = false;
  membersDialogOpen = false;
  addMemberDialogOpen = false;
  rolesDialogOpen = false;
  roleEditorOpen = false;
  submitting = false;

  selectedOrganization: IOrganization | null = null;
  members: IOrganizationMember[] = [];
  memberEmails = new Map<string, string>();
  currentUserId: string | null = null;
  pendingJoinRequestsCount = 0;

  roles: IOrganizationRole[] = [];
  rolesOptions: Array<{ label: string; value: string }> = [];
  permissionsCatalog: Array<{ moduleKey: string; permissions: string[] }> = [];
  roleDraft: { key: string; name: string; permissions: string[] } = {
    key: '',
    name: '',
    permissions: [],
  };
  roleMode: 'create' | 'edit' = 'create';

  createForm!: FormGroup<{
    name: FormControl<string>;
  }>;

  addMemberForm!: FormGroup<{
    email: FormControl<string>;
    role: FormControl<string>;
  }>;

  constructor(
    private readonly organizationsApi: OrganizationsService,
    private readonly usersApi: UsersApiService,
    private readonly fb: FormBuilder,
    private readonly authService: AuthService,
    private readonly messageService: MessageService,
  ) {
    this.createForm = this.fb.nonNullable.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
    });

    this.addMemberForm = this.fb.nonNullable.group({
      email: ['', [Validators.required, Validators.email]],
      role: ['', [Validators.required]],
    });
  }

  ngOnInit(): void {
    this.currentUserId = this.authService.getCurrentUser()?.id ?? null;
    this.loadOrganizations();
  }

  loadOrganizations(): void {
    this.loading = true;
    this.organizationsApi.list().subscribe({
      next: (res) => {
        const result = res?.result ?? [];
        this.organizations = result;
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

  getOrganizationMembershipStatus(organization: IOrganization): 'pending' | 'active' | null {
    if (!this.currentUserId) {
      return null;
    }
    const member = organization.members?.find((item) => item.userId === this.currentUserId);
    return member?.status ?? null;
  }

  openCreateDialog(): void {
    this.createDialogOpen = true;
  }

  createOrganization(): void {
    if (this.createForm.invalid || this.submitting) {
      this.createForm.markAllAsTouched();
      return;
    }

    this.submitting = true;
    const payload = this.createForm.getRawValue();
    this.organizationsApi.create({ name: payload.name }).subscribe({
      next: (res) => {
        const result = res?.result;
        if (result) {
          this.organizations = [result, ...this.organizations];
        }
        this.createDialogOpen = false;
        this.createForm.reset();
        this.submitting = false;
      },
      error: () => {
        this.submitting = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Crear grupo',
          detail: 'No se pudo crear la organizacion.',
        });
      },
    });
  }

  openMembersDialog(organization: IOrganization): void {
    this.selectedOrganization = organization;
    this.membersDialogOpen = true;
    this.loadRoles(organization.id ?? '');
    this.loadMembers(organization.id ?? '');
  }

  openRolesDialog(): void {
    if (!this.selectedOrganization?.id) {
      return;
    }
    this.rolesDialogOpen = true;
    this.loadRoles(this.selectedOrganization.id);
    this.loadPermissions(this.selectedOrganization.id);
  }

  openAddMember(): void {
    const defaultRole = this.rolesOptions[0]?.value ?? '';
    this.addMemberForm.reset({ email: '', role: defaultRole });
    this.addMemberDialogOpen = true;
  }

  addMember(): void {
    if (this.addMemberForm.invalid || !this.selectedOrganization?.id || this.submitting) {
      this.addMemberForm.markAllAsTouched();
      return;
    }

    this.submitting = true;
    const payload = this.addMemberForm.getRawValue();
    this.organizationsApi.addMember(this.selectedOrganization.id, payload).subscribe({
      next: (res) => {
        const result = res?.result;
        if (result?.members) {
          this.setMembers(result.members);
        }
        this.addMemberDialogOpen = false;
        this.submitting = false;
      },
      error: (error) => {
        this.submitting = false;
        const message = error?.error?.message;
        const detail =
          message === 'User with email not found'
            ? 'No existe un usuario con ese correo.'
            : message === 'User already member'
              ? 'El usuario ya pertenece a la organizacion.'
              : 'No se pudo agregar el miembro.';
        this.messageService.add({
          severity: 'error',
          summary: 'Miembros',
          detail,
        });
      },
    });
  }

  updateMemberRole(member: IOrganizationMember, role: string): void {
    if (!this.selectedOrganization?.id) {
      return;
    }

    this.organizationsApi.updateMemberRole(this.selectedOrganization.id, member.userId, { role }).subscribe({
      next: (res) => {
        const result = res?.result;
        if (result?.members) {
          this.setMembers(result.members);
        }
      },
      error: (error) => {
        if (error?.status === 403) {
          this.messageService.add({
            severity: 'warn',
            summary: 'Miembros',
            detail: 'No puedes modificar/eliminar un Owner',
          });
          return;
        }
        this.messageService.add({
          severity: 'error',
          summary: 'Miembros',
          detail: 'No se pudo actualizar el rol.',
        });
      },
    });
  }

  acceptMember(member: IOrganizationMember): void {
    if (!this.selectedOrganization?.id || this.submitting) {
      return;
    }
    this.submitting = true;
    this.organizationsApi.acceptMember(this.selectedOrganization.id, member.userId).subscribe({
      next: (res) => {
        const result = res?.result;
        if (result?.members) {
          this.setMembers(result.members);
        }
        this.submitting = false;
      },
      error: () => {
        this.submitting = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Miembros',
          detail: 'No se pudo aceptar el miembro.',
        });
      },
    });
  }

  rejectMember(member: IOrganizationMember): void {
    if (!this.selectedOrganization?.id || this.submitting) {
      return;
    }
    this.submitting = true;
    this.organizationsApi.rejectMember(this.selectedOrganization.id, member.userId).subscribe({
      next: (res) => {
        const result = res?.result;
        if (result?.members) {
          this.setMembers(result.members);
        }
        this.submitting = false;
      },
      error: (error) => {
        this.submitting = false;
        if (error?.status === 403) {
          this.messageService.add({
            severity: 'warn',
            summary: 'Miembros',
            detail: 'No puedes modificar/eliminar un Owner',
          });
          return;
        }
        this.messageService.add({
          severity: 'error',
          summary: 'Miembros',
          detail: 'No se pudo rechazar el miembro.',
        });
      },
    });
  }

  removeMember(member: IOrganizationMember): void {
    if (!this.selectedOrganization?.id || this.submitting) {
      return;
    }
    this.submitting = true;
    this.organizationsApi.removeMember(this.selectedOrganization.id, member.userId).subscribe({
      next: (res) => {
        const result = res?.result;
        if (result?.members) {
          this.setMembers(result.members);
        }
        this.submitting = false;
      },
      error: (error) => {
        this.submitting = false;
        if (error?.status === 403) {
          this.messageService.add({
            severity: 'warn',
            summary: 'Miembros',
            detail: 'No puedes modificar/eliminar un Owner',
          });
          return;
        }
        this.messageService.add({
          severity: 'error',
          summary: 'Miembros',
          detail: 'No se pudo quitar el miembro.',
        });
      },
    });
  }

  private loadMembers(organizationId: string): void {
    if (!organizationId) {
      this.setMembers([]);
      this.memberEmails.clear();
      return;
    }
    this.organizationsApi.getById(organizationId).subscribe({
      next: (res) => {
        const result = res?.result;
        this.setMembers(result?.members ?? []);
      },
      error: () => {
        this.setMembers([]);
        this.memberEmails.clear();
        this.messageService.add({
          severity: 'error',
          summary: 'Miembros',
          detail: 'No se pudieron cargar los miembros.',
        });
      },
    });
  }

  private loadRoles(organizationId: string): void {
    if (!organizationId) {
      this.roles = [];
      this.rolesOptions = this.getFallbackRoles();
      return;
    }
    this.organizationsApi.listRoles(organizationId).subscribe({
      next: (res) => {
        const roles = res?.result ?? [];
        this.roles = roles;
        this.rolesOptions = this.toRoleOptions(roles);
        if (this.rolesOptions.length === 0) {
          this.rolesOptions = this.getFallbackRoles();
        }
      },
      error: () => {
        this.roles = [];
        this.rolesOptions = this.getFallbackRoles();
      },
    });
  }

  private loadPermissions(organizationId: string): void {
    if (!organizationId) {
      this.permissionsCatalog = [];
      return;
    }
    this.organizationsApi.listPermissions(organizationId).subscribe({
      next: (res) => {
        this.permissionsCatalog = res?.result ?? [];
      },
      error: () => {
        this.permissionsCatalog = [];
      },
    });
  }

  private resolveMemberEmails(members: IOrganizationMember[]): void {
    const ids = members.map((member) => member.userId).filter(Boolean);
    if (ids.length === 0) {
      this.memberEmails.clear();
      return;
    }
    this.usersApi.resolve(ids).subscribe({
      next: (resolved) => {
        this.memberEmails.clear();
        resolved.forEach((user) => {
          if (user?.id && user.email) {
            this.memberEmails.set(user.id, user.email);
          }
        });
      },
      error: () => {
        this.memberEmails.clear();
      },
    });
  }

  getMemberLabel(member: IOrganizationMember): string {
    return this.memberEmails.get(member.userId) ?? member.userId;
  }

  getMemberRoleKey(member: IOrganizationMember): string {
    return member.roleKey;
  }

  getMemberStatusLabel(member: IOrganizationMember): string {
    return member.status === 'pending' ? 'Pendiente' : 'Activo';
  }

  isMemberPending(member: IOrganizationMember): boolean {
    return member.status === 'pending';
  }

  isJoinRequestPending(member: IOrganizationMember): boolean {
    return member.status === 'pending' && !!member.requestedBy;
  }

  isCreator(member: IOrganizationMember): boolean {
    return !!this.selectedOrganization?.createdBy && member.userId === this.selectedOrganization.createdBy;
  }

  isOwner(member: IOrganizationMember): boolean {
    return member.roleKey === 'owner';
  }

  canEditMember(member: IOrganizationMember): boolean {
    return this.canManageMembers() && !this.isCreator(member) && !this.isOwner(member);
  }

  canRemoveMember(member: IOrganizationMember): boolean {
    return this.canManageMembers() && !this.isCreator(member) && !this.isOwner(member) && member.status === 'active';
  }

  canAcceptReject(member: IOrganizationMember): boolean {
    return this.canManageMembers() && !this.isCreator(member) && this.isJoinRequestPending(member);
  }

  canManageMembers(): boolean {
    const roleKey = this.getCurrentRoleKey();
    if (!roleKey) {
      return false;
    }
    const roleDefinition =
      this.roles.find((role) => role.key === roleKey) ??
      this.selectedOrganization?.roles?.find((role) => role.key === roleKey);
    const permissions = roleDefinition?.permissions ?? [];
    return permissions.includes('*') || permissions.includes('users.write');
  }

  private getCurrentMember(): IOrganizationMember | null {
    if (!this.currentUserId) {
      return null;
    }
    return this.members.find((member) => member.userId === this.currentUserId) ?? null;
  }

  private getCurrentRoleKey(): string | null {
    const currentMember = this.getCurrentMember();
    if (!currentMember || currentMember.status !== 'active') {
      return null;
    }
    return currentMember.roleKey;
  }

  private getFallbackRoles(): Array<{ label: string; value: string }> {
    const fallbackRoles = this.selectedOrganization?.roles ?? [];
    return this.toRoleOptions(fallbackRoles);
  }

  private formatRoleLabel(roleKey: IOrganizationRole['key']): string {
    return roleKey
      .split(/[-_]/g)
      .map((token) => (token ? token[0].toUpperCase() + token.slice(1) : token))
      .join(' ');
  }

  private toRoleOptions(roles: IOrganizationRole[]): Array<{ label: string; value: string }> {
    return roles.map((role) => ({
      label: role.name || this.formatRoleLabel(role.key),
      value: role.key,
    }));
  }

  private setMembers(members: IOrganizationMember[]): void {
    this.members = members;
    this.pendingJoinRequestsCount = members.filter((member) => this.isJoinRequestPending(member)).length;
    this.resolveMemberEmails(members);
  }

  openCreateRole(): void {
    this.roleMode = 'create';
    this.roleDraft = { key: '', name: '', permissions: [] };
    this.roleEditorOpen = true;
  }

  openEditRole(role: IOrganizationRole): void {
    this.roleMode = 'edit';
    this.roleDraft = {
      key: role.key,
      name: role.name,
      permissions: [...(role.permissions ?? [])],
    };
    this.roleEditorOpen = true;
  }

  togglePermission(permission: string, checked: boolean): void {
    const current = new Set(this.roleDraft.permissions);
    if (checked) {
      current.add(permission);
    } else {
      current.delete(permission);
    }
    this.roleDraft.permissions = Array.from(current);
  }

  isPermissionSelected(permission: string): boolean {
    return this.roleDraft.permissions.includes(permission);
  }

  saveRole(): void {
    if (!this.selectedOrganization?.id || this.submitting) {
      return;
    }
    const payload = {
      key: this.roleDraft.key.trim(),
      name: this.roleDraft.name.trim(),
      permissions: this.roleDraft.permissions,
    };
    if (!payload.key || !payload.name) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Roles',
        detail: 'Key y nombre son obligatorios.',
      });
      return;
    }

    this.submitting = true;
    const request$ =
      this.roleMode === 'edit'
        ? this.organizationsApi.updateRole(this.selectedOrganization.id, payload.key, {
            name: payload.name,
            permissions: payload.permissions,
          })
        : this.organizationsApi.createRole(this.selectedOrganization.id, payload);

    request$.subscribe({
      next: (res) => {
        const result = res?.result ?? [];
        this.roles = result;
        this.rolesOptions = this.roles.map((role) => ({
          label: role.name || this.formatRoleLabel(role.key),
          value: role.key,
        }));
        this.roleEditorOpen = false;
        this.submitting = false;
      },
      error: () => {
        this.submitting = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Roles',
          detail: 'No se pudo guardar el rol.',
        });
      },
    });
  }

  deleteRole(role: IOrganizationRole): void {
    if (!this.selectedOrganization?.id || this.submitting) {
      return;
    }
    this.submitting = true;
    this.organizationsApi.deleteRole(this.selectedOrganization.id, role.key).subscribe({
      next: (res) => {
        const result = res?.result ?? [];
        this.roles = result;
        this.rolesOptions = this.roles.map((item) => ({
          label: item.name || this.formatRoleLabel(item.key),
          value: item.key,
        }));
        this.submitting = false;
      },
      error: () => {
        this.submitting = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Roles',
          detail: 'No se pudo eliminar el rol.',
        });
      },
    });
  }
}
