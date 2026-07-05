import { apiClient } from './client';
import type {
  AdminLearnStats,
  AdminSendNotificationBody,
  AdminSendNotificationResult,
  AdminUpdateLearnVisibilityBody,
  AdminUpdateMissionRewardBody,
  AdminUpdateUserStatusBody,
  AdminUpsertLearnContentBody,
  BatchExecution,
  BatchJob,
  TriggerBatchJobBody,
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
export function adminLogin(username: string, password: string) {
  return apiClient.post<OAuthLoginResult>('/api/admin/login', { username, password });
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

export function createLearnContent(body: AdminUpsertLearnContentBody) {
  return apiClient.post<LearnContent>('/api/admin/learn', body);
}

export function updateLearnContent(id: string, body: AdminUpsertLearnContentBody) {
  return apiClient.patch<LearnContent>(`/api/admin/learn/${id}`, body);
}

export function deleteLearnContent(id: string) {
  return apiClient.del<{ success: boolean }>(`/api/admin/learn/${id}`);
}

export function getLearnStats(id: string) {
  return apiClient.get<AdminLearnStats>(`/api/admin/learn/${id}/stats`);
}

// ── Notifications ───────────────────────────────────────────────────
export function sendAdminNotification(body: AdminSendNotificationBody) {
  return apiClient.post<AdminSendNotificationResult>('/api/admin/notifications/send', body);
}

// ── Batch ───────────────────────────────────────────────────────────
export interface BatchExecutionListParams {
  limit?: number;
}

export function getBatchJobs() {
  return apiClient.get<BatchJob[]>('/api/admin/batch/jobs');
}

export function triggerBatchJob(jobName: string, body: TriggerBatchJobBody) {
  return apiClient.post<BatchExecution>(`/api/admin/batch/jobs/${jobName}/trigger`, body);
}

export function getBatchExecutions(jobName: string, params?: BatchExecutionListParams) {
  return apiClient.get<BatchExecution[]>(`/api/admin/batch/jobs/${jobName}/executions`, {
    limit: params?.limit?.toString(),
  });
}

export function getBatchExecution(executionId: number | string) {
  return apiClient.get<BatchExecution>(`/api/admin/batch/executions/${executionId}`);
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
