'use client';
import { useCallback, useEffect, useState } from 'react';
import { Search, UserX, UserCheck, RefreshCw } from 'lucide-react';
import { getAdminUsers, updateUserStatus } from '@/apis/admin';
import { ApiError } from '@/apis/client';
import Pagination from '@/components/Pagination';
import type { PaginatedResult, UserProfile, UserStatus } from '@candle/shared';

const LIMIT = 10;

const statusFilters: { label: string; value: UserStatus | 'all' }[] = [
  { label: '전체', value: 'all' },
  { label: '활성', value: 'active' },
  { label: '정지', value: 'suspended' },
  { label: '탈퇴', value: 'withdrawn' },
];

const statusMeta: Record<UserStatus, { label: string; className: string }> = {
  active: { label: '활성', className: 'badge-active' },
  suspended: { label: '정지', className: 'badge-suspended' },
  withdrawn: { label: '탈퇴', className: 'badge-withdrawn' },
};

const providerLabel: Record<string, string> = { google: 'Google', kakao: '카카오', naver: '네이버' };
const styleLabel: Record<string, string> = { conservative: '안정형', balanced: '균형형', aggressive: '공격형', momentum: '모멘텀형' };

export default function UsersPage() {
  const [result, setResult] = useState<PaginatedResult<UserProfile> | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<UserStatus | 'all'>('all');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [mutatingId, setMutatingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async (p = page) => {
    setLoading(true);
    try {
      const data = await getAdminUsers({ status: filter === 'all' ? undefined : filter, q: query || undefined, page: p, limit: LIMIT });
      setResult(data);
    } catch (e) {
      showToast(false, e instanceof ApiError ? e.message : '목록 조회 실패');
    } finally {
      setLoading(false);
    }
  }, [filter, query, page]);

  useEffect(() => { load(); }, [load]);

  // Reset to page 1 when filter/query changes
  useEffect(() => { setPage(1); }, [filter, query]);

  function showToast(ok: boolean, text: string) {
    setToast({ ok, text });
    setTimeout(() => setToast(null), 3000);
  }

  function handlePageChange(p: number) {
    setPage(p);
    load(p);
  }

  async function toggleStatus(user: UserProfile) {
    const next: UserStatus = user.status === 'active' ? 'suspended' : 'active';
    setMutatingId(user.id);
    try {
      const updated = await updateUserStatus(user.id, { status: next });
      setResult((prev) => prev ? { ...prev, items: prev.items.map((u) => u.id === user.id ? updated : u) } : prev);
      showToast(true, next === 'suspended' ? `${user.username} 계정을 정지했습니다.` : `${user.username} 계정을 활성화했습니다.`);
    } catch (e) {
      showToast(false, e instanceof ApiError ? e.message : '상태 변경 실패');
    } finally {
      setMutatingId(null);
    }
  }

  const users = result?.items ?? [];
  const totalActive = result ? result.total : 0; // filtered total from server

  return (
    <div className="p-6 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-black mb-1" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--text-primary)' }}>사용자 관리</h1>
        <p className="text-sm" style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>USER-019 · USER-020</p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex gap-1.5">
          {statusFilters.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
              style={{
                background: filter === value ? 'var(--amber)' : 'var(--bg-card)',
                color: filter === value ? '#000' : 'var(--text-secondary)',
                border: `1px solid ${filter === value ? 'var(--amber)' : 'var(--border-subtle)'}`,
                fontFamily: 'Noto Sans KR',
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-48 max-w-72">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
          <input
            className="input-dark"
            style={{ paddingLeft: 36, paddingTop: 7, paddingBottom: 7 }}
            placeholder="이름 또는 이메일 검색"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <button onClick={() => load()} className="btn-outline flex items-center gap-1.5 py-1.5 px-3 text-xs">
          <RefreshCw size={13} /> 새로고침
        </button>
      </div>

      {toast && (
        <div className="mb-4 px-4 py-2 rounded-lg text-sm" style={{ background: toast.ok ? 'var(--gain-dim)' : 'var(--loss-dim)', color: toast.ok ? 'var(--gain)' : 'var(--loss)', fontFamily: 'Noto Sans KR' }}>
          {toast.text}
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-sm" style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>불러오는 중...</div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-sm" style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>사용자가 없습니다.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                {['사용자', '이메일', '가입일', '투자성향', '프로바이더', '상태', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold" style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const meta = statusMeta[user.status];
                const isMutating = mutatingId === user.id;
                const canToggle = user.status !== 'withdrawn';
                return (
                  <tr key={user.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-elevated)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = '')}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{user.avatar}</span>
                        <span className="font-medium" style={{ color: 'var(--text-primary)', fontFamily: 'Noto Sans KR' }}>{user.username}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs" style={{ color: 'var(--text-secondary)', fontFamily: 'JetBrains Mono' }}>{user.email}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>{user.createdAt.slice(0, 10)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs" style={{ color: 'var(--text-secondary)', fontFamily: 'Noto Sans KR' }}>{user.investStyle ? styleLabel[user.investStyle] ?? user.investStyle : '-'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>{user.provider ? providerLabel[user.provider] ?? user.provider : '-'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={meta.className}>{meta.label}</span>
                    </td>
                    <td className="px-4 py-3">
                      {canToggle && (
                        <button
                          onClick={() => toggleStatus(user)}
                          disabled={isMutating}
                          className={`flex items-center gap-1 text-xs ${user.status === 'active' ? 'btn-danger' : 'btn-success'}`}
                          style={{ padding: '4px 10px' }}
                        >
                          {isMutating ? '...' : user.status === 'active' ? <><UserX size={12} /> 정지</> : <><UserCheck size={12} /> 활성화</>}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {result && (
        <Pagination
          page={result.page}
          totalPages={result.totalPages}
          total={result.total}
          limit={result.limit}
          onChange={handlePageChange}
        />
      )}
    </div>
  );
}
