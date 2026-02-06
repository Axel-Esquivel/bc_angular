import { ActiveContext } from './active-context.model';

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  defaultOrganizationId?: string;
  defaultCompanyId?: string;
  defaultEnterpriseId?: string;
  defaultCurrencyId?: string;
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
  deviceId?: string;
  refreshToken: string;
  activeContext?: ActiveContext;
}

export interface RegisterResult {
  user: AuthUser;
  accessToken?: string;
  refreshToken?: string | null;
  deviceId?: string;
  activeContext?: ActiveContext;
}

export interface MeResult {
  user: AuthUser;
  isFirstTime?: boolean;
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface RefreshResult extends AuthTokens {
  activeContext?: ActiveContext;
}
