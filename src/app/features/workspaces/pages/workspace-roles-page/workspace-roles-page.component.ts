import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MessageService } from 'primeng/api';
import { forkJoin, take } from 'rxjs';

import { WorkspacesApiService } from '../../../../core/api/workspaces-api.service';
import { TokenStorageService } from '../../../../core/auth/token-storage.service';
import { Workspace } from '../../../../shared/models/workspace.model';

interface WorkspaceRoleDefinition {
  key: string;
  name: string;
  permissions: string[];
}

interface WorkspaceMember {
  userId: string;
  roleKey?: string;
  role?: 'admin' | 'member';
  status?: 'active' | 'invited' | 'disabled';
}

@Component({
  selector: 'app-workspace-roles-page',
  templateUrl: './workspace-roles-page.component.html',
  styleUrl: './workspace-roles-page.component.scss',
  standalone: false,
})
export class WorkspaceRolesPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly workspacesApi = inject(WorkspacesApiService);
  private readonly tokenStorage = inject(TokenStorageService);
  private readonly messageService = inject(MessageService);

  workspaceId = this.route.parent?.snapshot.paramMap.get('id') ?? '';
  roles: WorkspaceRoleDefinition[] = [];
  members: WorkspaceMember[] = [];
  roleOptions: Array<{ label: string; value: string }> = [];
  permissions: string[] = [];
  currentUserId = this.tokenStorage.getUser()?.id ?? '';

  canManageRoles = false;
  canInviteMembers = false;

  roleDialogOpen = false;
  roleDialogMode: 'create' | 'edit' = 'create';
  roleDraft: WorkspaceRoleDefinition = { key: '', name: '', permissions: [] };
  permissionsDraft = '';
  memberDraft = { userId: '', roleKey: 'member' };
  submitting = false;

  ngOnInit(): void {
    if (!this.workspaceId) {
      this.workspaceId = this.route.snapshot.paramMap.get('id') ?? '';
    }
    if (!this.workspaceId) {
      return;
    }

    forkJoin({
      roles: this.workspacesApi.listRoles(this.workspaceId),
      workspaces: this.workspacesApi.listMine(),
    })
      .pipe(take(1))
      .subscribe({
        next: ({ roles, workspaces }) => {
          this.roles = roles.result ?? [];
          this.roleOptions = this.roles.map((role) => ({ label: role.name, value: role.key }));
          const workspace = (workspaces.result?.workspaces ?? []).find(
            (item) => this.getWorkspaceId(item) === this.workspaceId
          );
          this.members = (workspace?.members ?? []) as WorkspaceMember[];
          this.resolvePermissions();
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudieron cargar los roles.',
          });
        },
      });
  }

  openCreateRole(): void {
    this.roleDialogMode = 'create';
    this.roleDraft = { key: '', name: '', permissions: [] };
    this.permissionsDraft = '';
    this.roleDialogOpen = true;
  }

  openEditRole(role: WorkspaceRoleDefinition): void {
    this.roleDialogMode = 'edit';
    this.roleDraft = { ...role, permissions: [...role.permissions] };
    this.permissionsDraft = role.permissions.join(', ');
    this.roleDialogOpen = true;
  }

  saveRole(): void {
    if (!this.workspaceId || this.submitting) {
      return;
    }

    const payload = {
      key: this.roleDraft.key.trim(),
      name: this.roleDraft.name.trim(),
      permissions: this.parsePermissions(this.permissionsDraft),
    };

    if (!payload.key || !payload.name) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Campos requeridos',
        detail: 'Completa key y nombre del rol.',
      });
      return;
    }

    this.submitting = true;
    const request$ =
      this.roleDialogMode === 'create'
        ? this.workspacesApi.createRole(this.workspaceId, payload)
        : this.workspacesApi.updateRole(this.workspaceId, payload.key, {
            name: payload.name,
            permissions: payload.permissions,
          });

    request$.pipe(take(1)).subscribe({
      next: ({ result }) => {
        this.roles = result ?? [];
        this.roleOptions = this.roles.map((role) => ({ label: role.name, value: role.key }));
        this.roleDialogOpen = false;
        this.submitting = false;
        this.resolvePermissions();
      },
      error: () => {
        this.submitting = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo guardar el rol.',
        });
      },
    });
  }

  deleteRole(role: WorkspaceRoleDefinition): void {
    if (!this.workspaceId || this.submitting) {
      return;
    }
    if (!confirm(`Eliminar rol ${role.name}?`)) {
      return;
    }

    this.submitting = true;
    this.workspacesApi.deleteRole(this.workspaceId, role.key).pipe(take(1)).subscribe({
      next: ({ result }) => {
        this.roles = result ?? [];
        this.roleOptions = this.roles.map((item) => ({ label: item.name, value: item.key }));
        this.submitting = false;
        this.resolvePermissions();
      },
      error: () => {
        this.submitting = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo eliminar el rol.',
        });
      },
    });
  }

  updateMemberRole(member: WorkspaceMember): void {
    if (!this.workspaceId || this.submitting) {
      return;
    }
    const roleKey = member.roleKey ?? member.role ?? 'member';
    this.submitting = true;
    this.workspacesApi.updateMemberRole(this.workspaceId, member.userId, roleKey).pipe(take(1)).subscribe({
      next: ({ result }) => {
        const updated = (result as WorkspaceMember | null) ?? { ...member, roleKey };
        this.members = this.members.map((item) => (item.userId === updated.userId ? updated : item));
        this.submitting = false;
      },
      error: () => {
        this.submitting = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo actualizar el rol del miembro.',
        });
      },
    });
  }

  inviteMember(): void {
    if (!this.workspaceId || this.submitting) {
      return;
    }
    if (!this.memberDraft.userId) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Campos requeridos',
        detail: 'Ingresa el id del usuario.',
      });
      return;
    }

    this.submitting = true;
    this.workspacesApi
      .addMember(this.workspaceId, {
        userId: this.memberDraft.userId.trim(),
        roleKey: this.memberDraft.roleKey,
      })
      .pipe(take(1))
      .subscribe({
        next: ({ result }) => {
          const members = ((result as { members?: WorkspaceMember[] } | null)?.members ?? []) as WorkspaceMember[];
          this.members = members.length > 0 ? members : this.members;
          this.memberDraft = { userId: '', roleKey: 'member' };
          this.submitting = false;
        },
        error: () => {
          this.submitting = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo invitar al miembro.',
          });
        },
      });
  }

  hasPermission(permission: string): boolean {
    return this.permissions.includes(permission);
  }

  isDefaultRole(role: WorkspaceRoleDefinition): boolean {
    return role.key === 'admin' || role.key === 'member';
  }

  private resolvePermissions(): void {
    const member = this.members.find((item) => item.userId === this.currentUserId);
    const roleKey = member?.roleKey ?? member?.role ?? 'member';
    const role = this.roles.find((item) => item.key === roleKey);
    this.permissions = role?.permissions ?? [];
    this.canManageRoles = this.permissions.includes('roles.manage');
    this.canInviteMembers = this.permissions.includes('workspace.invite');
  }

  private parsePermissions(raw: string): string[] {
    return raw
      .split(',')
      .map((permission) => permission.trim())
      .filter((permission) => permission.length > 0);
  }

  private getWorkspaceId(workspace: Workspace | null | undefined): string | null {
    return workspace?.id ?? workspace?._id ?? null;
  }
}
