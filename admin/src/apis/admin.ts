import { apiClient } from './client';
import type {
  AdminLearnStats,
  AdminUpdateLearnVisibilityBody,
  AdminUpdateMissionRewardBody,
  AdminUpdateUserStatusBody,
  LearnContent,
  Mission,
  MissionCategory,
  MissionParticipant,
  MissionStats,
  OAuthLoginResult,
  PaginatedResult,
  UserProfile,
  UserStatus,
} from '@candle/shared';

// ── Auth ────────────────────────────────────────────────────────────
export function adminLogin(email: string, password: string) {
  return apiClient.post<OAuthLoginResult>('/api/admin/login', { email, password });
}

// ── Users ───────────────────────────────────────────────────────────
export interface UserListParams {
  status?: UserStatus;
  q?: string;
  page?: number;
  limit?: number;
}

export function getAdminUsers(params?: UserListParams) {
  return apiClient.get<PaginatedResult<UserProfile>>('/api/admin/users', {
    status: params?.status,
    q: params?.q,
    page: params?.page?.toString(),
    limit: params?.limit?.toString(),
  });
}

export function updateUserStatus(id: string, body: AdminUpdateUserStatusBody) {
  return apiClient.patch<UserProfile>(`/api/admin/users/${id}/status`, body);
}

// ── Learn ────────────────────────────────────────────────────────────
export interface LearnListParams {
  published?: boolean;
  page?: number;
  limit?: number;
}

export function getAdminLearnContents(params?: LearnListParams) {
  return apiClient.get<PaginatedResult<LearnContent>>('/api/admin/learn', {
    published: params?.published?.toString(),
    page: params?.page?.toString(),
    limit: params?.limit?.toString(),
  });
}

export function setLearnVisibility(id: string, body: AdminUpdateLearnVisibilityBody) {
  return apiClient.patch<LearnContent>(`/api/admin/learn/${id}/visibility`, body);
}

export function getLearnStats(id: string) {
  return apiClient.get<AdminLearnStats>(`/api/admin/learn/${id}/stats`);
}

// ── Missions ─────────────────────────────────────────────────────────
export interface MissionListParams {
  category?: MissionCategory;
  page?: number;
  limit?: number;
}

export function getAdminMissions(params?: MissionListParams) {
  return apiClient.get<PaginatedResult<Mission>>('/api/admin/missions', {
    category: params?.category,
    page: params?.page?.toString(),
    limit: params?.limit?.toString(),
  });
}

export function updateMissionReward(id: string, body: AdminUpdateMissionRewardBody) {
  return apiClient.patch<Mission>(`/api/admin/missions/${id}/reward`, body);
}

export function getMissionParticipants(id: string) {
  return apiClient.get<MissionParticipant[]>(`/api/admin/missions/${id}/participants`);
}

export function getMissionStats(id: string) {
  return apiClient.get<MissionStats>(`/api/admin/missions/${id}/stats`);
}
