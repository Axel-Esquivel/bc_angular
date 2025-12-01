export interface AuthUser {
  id: string;
  username?: string;
  email: string;
  roles?: string[];
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string | null;
}

export interface LoginRequest {
  identifier: string;
  password: string;
  workspaceId?: string;
  deviceId?: string;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
  workspaceId?: string;
}

export interface LoginResult extends AuthTokens {
  user: AuthUser;
  workspaceId?: string;
  deviceId?: string;
  refreshToken: string;
}

export interface RegisterResult {
  user: AuthUser;
  workspaceId?: string;
  accessToken?: string;
  refreshToken?: string | null;
}

export interface RefreshRequest {
  refreshToken: string;
}
