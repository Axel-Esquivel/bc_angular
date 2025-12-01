export interface AuthUser {
  id: string;
  name?: string;
  email: string;
  roles?: string[];
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string | null;
}

export interface AuthPayload {
  user?: AuthUser | null;
  tokens?: AuthTokens | null;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface RefreshRequest {
  refreshToken: string;
}
