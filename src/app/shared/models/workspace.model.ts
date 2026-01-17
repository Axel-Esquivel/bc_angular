export interface Workspace {
  _id?: string;
  id?: string;
  name: string;
  description?: string;
  code?: string;
  ownerUserId?: string;
  ownerId?: string;
  members?: WorkspaceMember[];
  enabledModules?: { key: string; enabled: boolean; enabledAt?: string; enabledBy?: string }[];
  setupCompleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface WorkspaceMember {
  userId: string;
  role: 'admin' | 'member';
}

export interface WorkspaceListResult {
  workspaces: Workspace[];
  defaultWorkspaceId?: string;
}
