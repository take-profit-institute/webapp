/**
 * AuthService gRPC client stub.
 * Owns: login / logout / token refresh / token verification.
 *
 * TODO: Replace StubAuthServiceClient with:
 *   import { AuthServiceClient, AuthServiceDefinition } from '../../gen/auth/v1/auth';
 *   import { createClientFactory } from 'nice-grpc';
 *   return createClientFactory().create(AuthServiceDefinition, channel);
 */
import type { GrpcChannel } from '../channel';
import type { GrpcCallOptions } from '../types';
import { notImplemented } from '../types';

// --- Request / Response types (proto-generated types will replace these) ---

export interface LoginRequest {
  username: string;
  password: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface VerifyTokenRequest {
  token: string;
}

export interface VerifyTokenResponse {
  userId: string;
  role: 'USER' | 'ADMIN';
  username: string;
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface LogoutRequest {
  refreshToken: string;
}

// --- Service interface ---

export interface AuthServiceClient {
  login(req: LoginRequest, opts?: GrpcCallOptions): Promise<TokenPair>;
  logout(req: LogoutRequest, opts?: GrpcCallOptions): Promise<void>;
  refresh(req: RefreshRequest, opts?: GrpcCallOptions): Promise<TokenPair>;
  /** Validates JWT and returns identity — used by BFF auth middleware. */
  verifyToken(req: VerifyTokenRequest, opts?: GrpcCallOptions): Promise<VerifyTokenResponse>;
}

// --- Stub ---

class StubAuthServiceClient implements AuthServiceClient {
  login(): Promise<TokenPair> { return notImplemented('AuthService', 'login'); }
  logout(): Promise<void> { return notImplemented('AuthService', 'logout'); }
  refresh(): Promise<TokenPair> { return notImplemented('AuthService', 'refresh'); }
  verifyToken(): Promise<VerifyTokenResponse> { return notImplemented('AuthService', 'verifyToken'); }
}

export function createAuthServiceClient(_channel: GrpcChannel): AuthServiceClient {
  return new StubAuthServiceClient();
}
