'use client';
import { useCallback, useEffect, useState } from 'react';
import { Eye, EyeOff, BarChart2, X, Plus, Edit2, Trash2, Check } from 'lucide-react';
import { createLearnContent, deleteLearnContent, getAdminLearnContents, getLearnStats, setLearnVisibility, updateLearnContent } from '@/apis/admin';
import { ApiError } from '@/apis/client';
import Pagination from '@/components/Pagination';
import type { AdminLearnStats, AdminUpsertLearnContentBody, LearnContent, LearnLevel, PaginatedResult } from '@candle/shared';

const LIMIT = 10;
const levelLabel: Record<string, string> = { beginner: '입문', intermediate: '중급', advanced: '고급' };
const levelColor: Record<string, string> = { beginner: 'var(--gain)', intermediate: 'var(--amber)', advanced: 'var(--loss)' };
const emptyDraft: AdminUpsertLearnContentBody = {
  title: '',
  description: '',
  category: '',
  level: 'beginner',
  body: '',
  durationMin: 5,
  xpReward: 0,
  keywords: [],
  published: false,
};

function durationToMin(duration: string): number {
  const matched = duration.match(/\d+/);
  return matched ? Number(matched[0]) : 5;
}

export default function LearnPage() {
  const [result, setResult] = useState<PaginatedResult<LearnContent> | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [page, setPage] = useState(1);
  const [mutatingId, setMutatingId] = useState<string | null>(null);
  const [statsPanel, setStatsPanel] = useState<AdminLearnStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [editing, setEditing] = useState<{ id?: string; draft: AdminUpsertLearnContentBody; keywordsText: string } | null>(null);
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

  function startCreate() {
    setStatsPanel(null);
    setEditing({ draft: emptyDraft, keywordsText: '' });
  }

  function startEdit(content: LearnContent) {
    setStatsPanel(null);
    setEditing({
      id: content.id,
      draft: {
        title: content.title,
        description: content.description,
        category: content.category,
        level: content.level,
        body: content.body,
        durationMin: durationToMin(content.duration),
        xpReward: 0,
        keywords: content.keywords,
        published: content.published,
      },
      keywordsText: content.keywords.join(', '),
    });
  }

  function updateDraft(patch: Partial<AdminUpsertLearnContentBody>) {
    setEditing((prev) => prev ? { ...prev, draft: { ...prev.draft, ...patch } } : prev);
  }

  async function saveContent() {
    if (!editing) return;
    const keywords = editing.keywordsText.split(',').map((v) => v.trim()).filter(Boolean);
    const body = { ...editing.draft, keywords };
    if (!body.title || !body.category || !body.body) {
      showToast(false, '제목, 카테고리, 본문을 입력하세요');
      return;
    }
    setMutatingId(editing.id ?? 'new');
    try {
      const saved = editing.id ? await updateLearnContent(editing.id, body) : await createLearnContent(body);
      setResult((prev) => {
        if (!prev) return prev;
        if (editing.id) return { ...prev, items: prev.items.map((c) => c.id === editing.id ? saved : c) };
        return { ...prev, items: [saved, ...prev.items].slice(0, prev.limit), total: prev.total + 1 };
      });
      setEditing(null);
      showToast(true, editing.id ? '콘텐츠가 수정되었습니다.' : '콘텐츠가 생성되었습니다.');
    } catch (e) {
      showToast(false, e instanceof ApiError ? e.message : '저장 실패');
    } finally {
      setMutatingId(null);
    }
  }

  async function removeContent(content: LearnContent) {
    if (!confirm(`"${content.title}" 콘텐츠를 삭제할까요?`)) return;
    setMutatingId(content.id);
    try {
      await deleteLearnContent(content.id);
      setResult((prev) => prev ? { ...prev, items: prev.items.filter((c) => c.id !== content.id), total: Math.max(0, prev.total - 1) } : prev);
      showToast(true, '콘텐츠가 삭제되었습니다.');
    } catch (e) {
      showToast(false, e instanceof ApiError ? e.message : '삭제 실패');
    } finally {
      setMutatingId(null);
    }
  }

  const contents = result?.items ?? [];

  return (
    <div className="p-6 max-w-6xl">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black mb-1" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--text-primary)' }}>학습 콘텐츠 관리</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>LEARN-014 · LEARN-015 · 콘텐츠 업로드</p>
        </div>
        <button onClick={startCreate} className="btn-amber flex items-center gap-2 text-xs" style={{ padding: '8px 12px' }}>
          <Plus size={14} /> 새 콘텐츠
        </button>
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
                            <button
                              onClick={() => startEdit(c)}
                              className="btn-outline flex items-center gap-1 text-xs"
                              style={{ padding: '4px 8px' }}
                            >
                              <Edit2 size={11} /> 수정
                            </button>
                            <button
                              onClick={() => removeContent(c)}
                              disabled={isMutating}
                              className="btn-danger flex items-center gap-1 text-xs"
                              style={{ padding: '4px 8px' }}
                            >
                              <Trash2 size={11} />
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

        {editing && (
          <div className="w-80 shrink-0 animate-fade-up">
            <div className="card p-4">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'Noto Sans KR' }}>{editing.id ? '콘텐츠 수정' : '콘텐츠 생성'}</p>
                <button onClick={() => setEditing(null)} style={{ color: 'var(--text-muted)' }}><X size={14} /></button>
              </div>
              <div className="space-y-3">
                <input className="input-dark text-xs" value={editing.draft.title} onChange={(e) => updateDraft({ title: e.target.value })} placeholder="제목" />
                <input className="input-dark text-xs" value={editing.draft.description} onChange={(e) => updateDraft({ description: e.target.value })} placeholder="설명" />
                <div className="grid grid-cols-2 gap-2">
                  <input className="input-dark text-xs" value={editing.draft.category} onChange={(e) => updateDraft({ category: e.target.value })} placeholder="카테고리" />
                  <select className="input-dark text-xs" value={editing.draft.level} onChange={(e) => updateDraft({ level: e.target.value as LearnLevel })}>
                    <option value="beginner">입문</option>
                    <option value="intermediate">중급</option>
                    <option value="advanced">고급</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input className="input-dark text-xs" type="number" min={1} value={editing.draft.durationMin} onChange={(e) => updateDraft({ durationMin: Number(e.target.value) })} placeholder="분" />
                  <input className="input-dark text-xs" type="number" min={0} value={editing.draft.xpReward} onChange={(e) => updateDraft({ xpReward: Number(e.target.value) })} placeholder="XP" />
                </div>
                <input className="input-dark text-xs" value={editing.keywordsText} onChange={(e) => setEditing((prev) => prev ? { ...prev, keywordsText: e.target.value } : prev)} placeholder="키워드, 쉼표 구분" />
                <textarea className="input-dark text-xs min-h-40" value={editing.draft.body} onChange={(e) => updateDraft({ body: e.target.value })} placeholder="본문" />
                <label className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)', fontFamily: 'Noto Sans KR' }}>
                  <input type="checkbox" checked={editing.draft.published} onChange={(e) => updateDraft({ published: e.target.checked })} />
                  공개 상태로 저장
                </label>
                <button onClick={saveContent} disabled={mutatingId === (editing.id ?? 'new')} className="btn-amber w-full flex items-center justify-center gap-2 text-xs">
                  <Check size={13} /> {mutatingId === (editing.id ?? 'new') ? '저장 중...' : '저장'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Stats panel */}
        {!editing && (statsLoading || statsPanel) && (
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
