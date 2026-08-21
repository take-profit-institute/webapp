'use client';
import { useCallback, useEffect, useState } from 'react';
import { Search, RefreshCw } from 'lucide-react';
import { getMembers } from '@/apis/admin';
import { ApiError } from '@/apis/client';
import Pagination from '@/components/Pagination';
import type { AdminUserAccountStatus, AdminUserSummary, PaginatedResult } from '@candle/shared';

const LIMIT = 20;
/** 검색어 디바운스 — 타이핑마다 목록 조회를 날리면 서버 검색이 LIKE 스캔이라 부담이 크다. */
const SEARCH_DEBOUNCE_MS = 300;

const statusFilters: { label: string; value: AdminUserAccountStatus | 'all' }[] = [
  { label: '전체', value: 'all' },
  { label: '활성', value: 'active' },
  { label: '탈퇴', value: 'withdrawn' },
];

const statusMeta: Record<AdminUserAccountStatus, { label: string; className: string }> = {
  active: { label: '활성', className: 'badge-active' },
  withdrawn: { label: '탈퇴', className: 'badge-suspended' },
};

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString('ko-KR', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function MembersPage() {
  const [result, setResult] = useState<PaginatedResult<AdminUserSummary> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<AdminUserAccountStatus | 'all'>('all');
  const [query, setQuery] = useState('');
  // 입력값(query)과 조회에 실제로 쓰는 값(appliedQuery)을 분리해 디바운스한다.
  const [appliedQuery, setAppliedQuery] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => setAppliedQuery(query.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [query]);

  // 필터/검색어가 바뀌면 1페이지로 되돌린다 — 3페이지를 보던 중 조건이 좁아지면 빈 페이지가 뜬다.
  useEffect(() => { setPage(1); }, [filter, appliedQuery]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setResult(await getMembers({
        status: filter === 'all' ? undefined : filter,
        q: appliedQuery || undefined,
        page,
        limit: LIMIT,
      }));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '회원 목록을 불러오지 못했습니다.');
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [filter, appliedQuery, page]);

  useEffect(() => { load(); }, [load]);

  const members = result?.items ?? [];

  return (
    <div className="p-6 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-black mb-1" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--text-primary)' }}>전체 회원</h1>
        <p className="text-sm" style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>
          앱에 가입한 회원 목록{result ? ` · 총 ${result.total.toLocaleString()}명` : ''}
        </p>
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
            placeholder="닉네임 · 이메일 검색"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <button onClick={() => load()} className="btn-outline flex items-center gap-1.5 py-1.5 px-3 text-xs">
          <RefreshCw size={13} /> 새로고침
        </button>
      </div>

      {error && (
        <div className="mb-4 px-4 py-2 rounded-lg text-sm" style={{ background: 'var(--loss-dim)', color: 'var(--loss)', fontFamily: 'Noto Sans KR' }}>
          {error}
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-sm" style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>불러오는 중...</div>
        ) : members.length === 0 ? (
          <div className="p-12 text-center text-sm" style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>
            {appliedQuery || filter !== 'all' ? '조건에 맞는 회원이 없습니다.' : '가입한 회원이 없습니다.'}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                {['회원', '이메일', '상태', '가입일', '최근 변경'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold" style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {members.map((member) => {
                const meta = statusMeta[member.status];
                return (
                  <tr key={member.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-elevated)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = '')}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {/* profile_image_url에는 이모지가 들어간다(V20260701_001 마이그레이션). URL이면 그대로 노출된다. */}
                        <span className="text-base leading-none">{member.avatar}</span>
                        <div className="min-w-0">
                          <p className="font-medium truncate" style={{ color: 'var(--text-primary)', fontFamily: 'Noto Sans KR' }}>{member.nickname}</p>
                          <p className="text-[10px] truncate" style={{ color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>{member.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs" style={{ color: 'var(--text-secondary)', fontFamily: 'JetBrains Mono' }}>{member.email}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={meta.className}>{meta.label}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>{member.createdAt.slice(0, 10)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>{formatDateTime(member.updatedAt)}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {result && result.totalPages > 1 && (
        <Pagination
          page={result.page}
          totalPages={result.totalPages}
          total={result.total}
          limit={result.limit}
          onChange={setPage}
        />
      )}
    </div>
  );
}
