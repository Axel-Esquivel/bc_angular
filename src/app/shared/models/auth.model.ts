export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  defaultWorkspaceId?: string;
  displayName?: string;
  roles?: string[];
  isFirstTime?: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string | null;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  password: string;
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

export interface MeResult {
  user: AuthUser;
  isFirstTime?: boolean;
}

export interface RefreshRequest {
  refreshToken: string;
}
