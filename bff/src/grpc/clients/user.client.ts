/**
 * UserService gRPC client stub.
 * Owns: user profile, nickname, avatar, invest style, withdrawal.
 */
import type { GrpcChannel } from '../channel';
import type { GrpcCallOptions } from '../types';
import { notImplemented } from '../types';

export interface UserProfile {
  userId: string;
  username: string;
  email: string;
  avatar: string;
  role: 'USER' | 'ADMIN';
  investStyle: 'conservative' | 'balanced' | 'aggressive' | 'momentum';
  status: 'active' | 'inactive' | 'withdrawn';
  createdAt: string;
}

export interface UpdateProfileRequest {
  userId: string;
  username?: string;
  avatar?: string;
  investStyle?: UserProfile['investStyle'];
}

export interface CheckNicknameRequest {
  nickname: string;
}

export interface UserServiceClient {
  getProfile(req: { userId: string }, opts?: GrpcCallOptions): Promise<UserProfile>;
  updateProfile(req: UpdateProfileRequest, opts?: GrpcCallOptions): Promise<UserProfile>;
  checkNickname(req: CheckNicknameRequest, opts?: GrpcCallOptions): Promise<{ available: boolean }>;
  withdraw(req: { userId: string }, opts?: GrpcCallOptions): Promise<void>;
}

class StubUserServiceClient implements UserServiceClient {
  getProfile(): Promise<UserProfile> { return notImplemented('UserService', 'getProfile'); }
  updateProfile(): Promise<UserProfile> { return notImplemented('UserService', 'updateProfile'); }
  checkNickname(): Promise<{ available: boolean }> { return notImplemented('UserService', 'checkNickname'); }
  withdraw(): Promise<void> { return notImplemented('UserService', 'withdraw'); }
}

export function createUserServiceClient(_channel: GrpcChannel): UserServiceClient {
  return new StubUserServiceClient();
}
