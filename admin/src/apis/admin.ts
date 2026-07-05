import { apiClient } from './client';
import type {
  AdminLearnStats,
  AdminSendNotificationBody,
  AdminSendNotificationResult,
  AdminUpdateLearnVisibilityBody,
  AdminUpdateMissionRewardBody,
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
} from '@candle/shared';

// ── Auth ────────────────────────────────────────────────────────────
export function adminLogin(username: string, password: string) {
  return apiClient.post<OAuthLoginResult>('/api/admin/login', { username, password });
}

// ── Admin accounts ("사용자 관리") ───────────────────────────────────
// 앱 일반 유저 목록/정지 백엔드는 아직 없어, 이 화면은 auth-service의
// 관리자 계정 관리 API(/api/v1/admin/accounts, SUPER_ADMIN 전용)에 연결한다.
// 게이트웨이가 JWT 검증 후 X-Account-Role을 주입하므로 게이트웨이로 직접 호출한다.
// 목록은 서버가 페이지네이션/필터를 지원하지 않아 클라이언트에서 처리한다.
export type AdminUserStatus = 'active' | 'suspended';

export interface UserListParams {
  status?: AdminUserStatus;
  q?: string;
  page?: number;
  limit?: number;
}

/** 화면용 관리자 계정 행. */
export interface AdminUserRow {
  id: string;
  username: string;
  role: 'ADMIN' | 'SUPER_ADMIN';
  status: AdminUserStatus; // ACTIVE→active, DISABLED→suspended
  lastLoginAt: string | null;
  createdAt: string;
}

/** auth-service AdminAccountResponse */
interface AdminAccount {
  id: string;
  username: string;
  displayName: string;
  role: 'ADMIN' | 'SUPER_ADMIN';
  status: 'ACTIVE' | 'DISABLED';
  lastLoginAt?: string | null;
  createdAt: string;
}

function toRow(a: AdminAccount): AdminUserRow {
  return {
    id: a.id,
    username: a.displayName || a.username,
    role: a.role,
    status: a.status === 'ACTIVE' ? 'active' : 'suspended',
    lastLoginAt: a.lastLoginAt ?? null,
    createdAt: a.createdAt,
  };
}

export async function getAdminUsers(params?: UserListParams): Promise<PaginatedResult<AdminUserRow>> {
  const accounts = await apiClient.get<AdminAccount[]>('/api/v1/admin/accounts');
  let items = accounts.map(toRow);
  if (params?.status) items = items.filter((u) => u.status === params.status);
  if (params?.q) {
    const lq = params.q.toLowerCase();
    items = items.filter((u) => u.username.toLowerCase().includes(lq));
  }
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 20;
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const start = (page - 1) * limit;
  return { items: items.slice(start, start + limit), total, page, limit, totalPages };
}

export async function updateUserStatus(id: string, status: AdminUserStatus): Promise<AdminUserRow> {
  // 화면 상태(active/suspended) → 계정 상태(ACTIVE/DISABLED).
  const next = status === 'active' ? 'ACTIVE' : 'DISABLED';
  const updated = await apiClient.patch<AdminAccount>(`/api/v1/admin/accounts/${id}/status`, { status: next });
  return toRow(updated);
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
