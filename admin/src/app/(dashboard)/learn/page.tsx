'use client';
import { useCallback, useEffect, useState } from 'react';
import { Eye, EyeOff, BarChart2, X } from 'lucide-react';
import { getAdminLearnContents, getLearnStats, setLearnVisibility } from '@/apis/admin';
import { ApiError } from '@/apis/client';
import Pagination from '@/components/Pagination';
import type { AdminLearnStats, LearnContent, PaginatedResult } from '@candle/shared';

const LIMIT = 10;
const levelLabel: Record<string, string> = { beginner: '입문', intermediate: '중급', advanced: '고급' };
const levelColor: Record<string, string> = { beginner: 'var(--gain)', intermediate: 'var(--amber)', advanced: 'var(--loss)' };

export default function LearnPage() {
  const [result, setResult] = useState<PaginatedResult<LearnContent> | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [page, setPage] = useState(1);
  const [mutatingId, setMutatingId] = useState<string | null>(null);
  const [statsPanel, setStatsPanel] = useState<AdminLearnStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null);

  const publishedParam = filter === 'published' ? true : filter === 'draft' ? false : undefined;

  const load = useCallback(async (p = page) => {
    setLoading(true);
    try {
      const data = await getAdminLearnContents({ published: publishedParam, page: p, limit: LIMIT });
      setResult(data);
    } catch (e) {
      showToast(false, e instanceof ApiError ? e.message : '불러오기 실패');
    } finally {
      setLoading(false);
    }
  }, [filter, page]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [filter]);

  function showToast(ok: boolean, text: string) {
    setToast({ ok, text });
    setTimeout(() => setToast(null), 3000);
  }

  function handlePageChange(p: number) {
    setPage(p);
    load(p);
  }

  async function toggleVisibility(content: LearnContent) {
    setMutatingId(content.id);
    try {
      const updated = await setLearnVisibility(content.id, { published: !content.published });
      setResult((prev) => prev ? { ...prev, items: prev.items.map((c) => c.id === content.id ? updated : c) } : prev);
      showToast(true, updated.published ? `"${content.title}" 공개로 변경` : `"${content.title}" 비공개로 변경`);
    } catch (e) {
      showToast(false, e instanceof ApiError ? e.message : '변경 실패');
    } finally {
      setMutatingId(null);
    }
  }

  async function openStats(id: string) {
    setStatsPanel(null);
    setStatsLoading(true);
    try {
      setStatsPanel(await getLearnStats(id));
    } catch (e) {
      showToast(false, e instanceof ApiError ? e.message : '통계 조회 실패');
    } finally {
      setStatsLoading(false);
    }
  }

  const contents = result?.items ?? [];

  return (
    <div className="p-6 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-black mb-1" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--text-primary)' }}>학습 콘텐츠 관리</h1>
        <p className="text-sm" style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>LEARN-014 · LEARN-015</p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1.5 mb-4">
        {(['all', 'published', 'draft'] as const).map((v) => {
          const labels = { all: '전체', published: '공개', draft: '비공개' };
          return (
            <button key={v} onClick={() => setFilter(v)}
              className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
              style={{
                background: filter === v ? 'var(--amber)' : 'var(--bg-card)',
                color: filter === v ? '#000' : 'var(--text-secondary)',
                border: `1px solid ${filter === v ? 'var(--amber)' : 'var(--border-subtle)'}`,
                fontFamily: 'Noto Sans KR',
              }}>
              {labels[v]}
            </button>
          );
        })}
        {result && (
          <span className="ml-auto text-xs self-center" style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>
            총 {result.total}건
          </span>
        )}
      </div>

      {toast && (
        <div className="mb-4 px-4 py-2 rounded-lg text-sm" style={{ background: toast.ok ? 'var(--gain-dim)' : 'var(--loss-dim)', color: toast.ok ? 'var(--gain)' : 'var(--loss)', fontFamily: 'Noto Sans KR' }}>
          {toast.text}
        </div>
      )}

      <div className="flex gap-4">
        {/* Content list */}
        <div className="flex-1 min-w-0">
          <div className="card overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-sm" style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>불러오는 중...</div>
            ) : contents.length === 0 ? (
              <div className="p-12 text-center text-sm" style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>콘텐츠가 없습니다.</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    {['콘텐츠', '카테고리', '난이도', '조회수', '상태', ''].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold" style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {contents.map((c) => {
                    const isMutating = mutatingId === c.id;
                    return (
                      <tr key={c.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-elevated)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = '')}>
                        <td className="px-4 py-3 max-w-[180px]">
                          <div className="flex items-center gap-2">
                            <span>{c.emoji}</span>
                            <div className="min-w-0">
                              <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)', fontFamily: 'Noto Sans KR' }}>{c.title}</p>
                              <p className="text-[10px] truncate" style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>{c.duration}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs" style={{ color: 'var(--text-secondary)', fontFamily: 'Noto Sans KR' }}>{c.category}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-semibold" style={{ color: levelColor[c.level] ?? 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>{levelLabel[c.level] ?? c.level}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs" style={{ color: 'var(--text-secondary)', fontFamily: 'JetBrains Mono' }}>{c.readCount.toLocaleString()}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={c.published ? 'badge-published' : 'badge-draft'}>{c.published ? '공개' : '비공개'}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => toggleVisibility(c)}
                              disabled={isMutating}
                              className={`flex items-center gap-1 text-xs ${c.published ? 'btn-danger' : 'btn-success'}`}
                              style={{ padding: '4px 8px' }}
                            >
                              {isMutating ? '...' : c.published ? <><EyeOff size={11} /> 비공개</> : <><Eye size={11} /> 공개</>}
                            </button>
                            <button
                              onClick={() => openStats(c.id)}
                              className="btn-outline flex items-center gap-1 text-xs"
                              style={{ padding: '4px 8px' }}
                            >
                              <BarChart2 size={11} /> 통계
                            </button>
                          </div>
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

        {/* Stats panel */}
        {(statsLoading || statsPanel) && (
          <div className="w-64 shrink-0 animate-fade-up">
            <div className="card p-4">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'Noto Sans KR' }}>콘텐츠 통계</p>
                <button onClick={() => setStatsPanel(null)} style={{ color: 'var(--text-muted)' }}><X size={14} /></button>
              </div>
              {statsLoading ? (
                <p className="text-xs text-center" style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>불러오는 중...</p>
              ) : statsPanel && (
                <div className="space-y-3">
                  <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)', fontFamily: 'Noto Sans KR' }}>{statsPanel.title}</p>
                  {[
                    { label: '총 조회수', value: statsPanel.readCount.toLocaleString() },
                    { label: '완독 수', value: statsPanel.completedCount.toLocaleString() },
                    { label: '즐겨찾기', value: statsPanel.favoriteCount.toLocaleString() },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between text-xs">
                      <span style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>{label}</span>
                      <span style={{ color: 'var(--text-primary)', fontFamily: 'JetBrains Mono' }}>{value}</span>
                    </div>
                  ))}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>완독률</span>
                      <span className="font-bold" style={{ color: 'var(--amber)', fontFamily: 'JetBrains Mono' }}>{statsPanel.completionRate}%</span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
                      <div className="h-full rounded-full" style={{ width: `${statsPanel.completionRate}%`, background: 'var(--amber)' }} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
