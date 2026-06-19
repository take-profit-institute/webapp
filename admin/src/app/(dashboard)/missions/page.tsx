'use client';
import { useCallback, useEffect, useState } from 'react';
import { Users, BarChart2, Edit2, X, Check } from 'lucide-react';
import { getAdminMissions, getMissionParticipants, getMissionStats, updateMissionReward } from '@/apis/admin';
import { ApiError } from '@/apis/client';
import Pagination from '@/components/Pagination';
import type { Mission, MissionCategory, MissionParticipant, MissionStats, PaginatedResult } from '@candle/shared';

const LIMIT = 10;

const categoryLabel: Record<Mission['category'], string> = { daily: '일일', weekly: '주간', special: '특별' };
const statusColor: Record<Mission['status'], string> = {
  available: 'var(--text-secondary)',
  in_progress: 'var(--amber)',
  completed: 'var(--gain)',
  failed: 'var(--loss)',
  cancelled: 'var(--text-muted)',
};
const statusLabel: Record<Mission['status'], string> = { available: '참여 가능', in_progress: '진행 중', completed: '완료', failed: '실패', cancelled: '취소' };

type SidePanel = { type: 'participants'; data: MissionParticipant[]; missionTitle: string } | { type: 'stats'; data: MissionStats; missionTitle: string };

export default function MissionsPage() {
  const [result, setResult] = useState<PaginatedResult<Mission> | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<MissionCategory | 'all'>('all');
  const [page, setPage] = useState(1);
  const [panel, setPanel] = useState<SidePanel | null>(null);
  const [panelLoading, setPanelLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [rewardDraft, setRewardDraft] = useState<{ reward: string; badge: string; achievement: string }>({ reward: '', badge: '', achievement: '' });
  const [mutatingId, setMutatingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async (p = page) => {
    setLoading(true);
    try {
      const data = await getAdminMissions({ category: filter === 'all' ? undefined : filter, page: p, limit: LIMIT });
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

  function startEdit(m: Mission) {
    setEditingId(m.id);
    setRewardDraft({ reward: String(m.reward), badge: m.badgeReward ?? '', achievement: m.achievementReward ?? '' });
  }

  async function saveReward(id: string) {
    const parsed = Number(rewardDraft.reward);
    if (isNaN(parsed) || parsed < 0) { showToast(false, '유효한 포인트를 입력하세요'); return; }
    setMutatingId(id);
    try {
      const updated = await updateMissionReward(id, { reward: parsed, badgeReward: rewardDraft.badge || undefined, achievementReward: rewardDraft.achievement || undefined });
      setResult((prev) => prev ? { ...prev, items: prev.items.map((m) => m.id === id ? updated : m) } : prev);
      showToast(true, '보상이 업데이트되었습니다.');
      setEditingId(null);
    } catch (e) {
      showToast(false, e instanceof ApiError ? e.message : '업데이트 실패');
    } finally {
      setMutatingId(null);
    }
  }

  async function openParticipants(m: Mission) {
    setPanel(null);
    setPanelLoading(true);
    try {
      const data = await getMissionParticipants(m.id);
      setPanel({ type: 'participants', data, missionTitle: m.title });
    } catch (e) {
      showToast(false, e instanceof ApiError ? e.message : '참여자 조회 실패');
    } finally {
      setPanelLoading(false);
    }
  }

  async function openStats(m: Mission) {
    setPanel(null);
    setPanelLoading(true);
    try {
      const data = await getMissionStats(m.id);
      setPanel({ type: 'stats', data, missionTitle: m.title });
    } catch (e) {
      showToast(false, e instanceof ApiError ? e.message : '통계 조회 실패');
    } finally {
      setPanelLoading(false);
    }
  }

  const missions = result?.items ?? [];

  return (
    <div className="p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-black mb-1" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--text-primary)' }}>미션 관리</h1>
        <p className="text-sm" style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>MISSION-018 · MISSION-019 · MISSION-020</p>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-1.5 mb-4">
        {(['all', 'daily', 'weekly', 'special'] as const).map((v) => {
          const label = v === 'all' ? '전체' : categoryLabel[v];
          return (
            <button key={v} onClick={() => setFilter(v)}
              className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
              style={{
                background: filter === v ? 'var(--amber)' : 'var(--bg-card)',
                color: filter === v ? '#000' : 'var(--text-secondary)',
                border: `1px solid ${filter === v ? 'var(--amber)' : 'var(--border-subtle)'}`,
                fontFamily: 'Noto Sans KR',
              }}>
              {label}
            </button>
          );
        })}
        {result && (
          <span className="ml-auto text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>
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
        {/* Mission list */}
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="card p-12 text-center text-sm" style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>불러오는 중...</div>
          ) : missions.length === 0 ? (
            <div className="card p-12 text-center text-sm" style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>미션이 없습니다.</div>
          ) : (
            <div className="space-y-3">
              {missions.map((m) => {
                const isEditing = editingId === m.id;
                const isMutating = mutatingId === m.id;
                return (
                  <div key={m.id} className="card p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0" style={{ background: 'var(--bg-surface)' }}>
                        {m.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)', fontFamily: 'Noto Sans KR' }}>{m.title}</span>
                          <span className="badge-amber">{categoryLabel[m.category]}</span>
                          <span className="text-xs" style={{ color: statusColor[m.status], fontFamily: 'Noto Sans KR' }}>{statusLabel[m.status]}</span>
                        </div>
                        <p className="text-xs mb-2" style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>{m.description}</p>

                        {isEditing ? (
                          <div className="p-3 rounded-lg space-y-2" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-normal)' }}>
                            <p className="text-xs font-semibold mb-2" style={{ color: 'var(--amber)', fontFamily: 'Noto Sans KR' }}>보상 설정 (MISSION-019)</p>
                            <div className="grid grid-cols-3 gap-2">
                              <div>
                                <label className="block text-[10px] mb-1" style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>포인트</label>
                                <input className="input-dark text-xs" style={{ padding: '6px 10px' }} type="number" min="0" value={rewardDraft.reward} onChange={(e) => setRewardDraft((d) => ({ ...d, reward: e.target.value }))} />
                              </div>
                              <div>
                                <label className="block text-[10px] mb-1" style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>뱃지 (선택)</label>
                                <input className="input-dark text-xs" style={{ padding: '6px 10px' }} value={rewardDraft.badge} onChange={(e) => setRewardDraft((d) => ({ ...d, badge: e.target.value }))} placeholder="예: 첫 거래" />
                              </div>
                              <div>
                                <label className="block text-[10px] mb-1" style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>업적 (선택)</label>
                                <input className="input-dark text-xs" style={{ padding: '6px 10px' }} value={rewardDraft.achievement} onChange={(e) => setRewardDraft((d) => ({ ...d, achievement: e.target.value }))} placeholder="예: 분산투자 입문" />
                              </div>
                            </div>
                            <div className="flex gap-2 mt-2">
                              <button onClick={() => saveReward(m.id)} disabled={isMutating} className="btn-amber text-xs flex items-center gap-1" style={{ padding: '5px 12px' }}>
                                <Check size={12} /> {isMutating ? '저장 중...' : '저장'}
                              </button>
                              <button onClick={() => setEditingId(null)} className="btn-outline text-xs" style={{ padding: '5px 12px' }}>취소</button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3 flex-wrap">
                            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full" style={{ background: 'var(--amber-subtle)', border: '1px solid rgba(245,166,35,0.2)' }}>
                              <span className="text-xs">🪙</span>
                              <span className="text-xs font-bold" style={{ color: 'var(--amber)', fontFamily: 'JetBrains Mono' }}>{m.reward.toLocaleString()}P</span>
                            </div>
                            {m.badgeReward && <span className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>🏅 {m.badgeReward}</span>}
                            {m.achievementReward && <span className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>🏆 {m.achievementReward}</span>}
                            <span className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>~{m.endsAt.slice(0, 10)}</span>
                          </div>
                        )}
                      </div>

                      {!isEditing && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button onClick={() => startEdit(m)} className="btn-outline flex items-center gap-1 text-xs" style={{ padding: '5px 10px' }}>
                            <Edit2 size={11} /> 보상
                          </button>
                          <button onClick={() => openParticipants(m)} className="btn-outline flex items-center gap-1 text-xs" style={{ padding: '5px 10px' }} title="참여자 조회">
                            <Users size={11} />
                          </button>
                          <button onClick={() => openStats(m)} className="btn-outline flex items-center gap-1 text-xs" style={{ padding: '5px 10px' }} title="통계 조회">
                            <BarChart2 size={11} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

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

        {/* Side panel */}
        {(panelLoading || panel) && (
          <div className="w-64 shrink-0 animate-fade-up">
            <div className="card p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'Noto Sans KR' }}>
                  {panel?.type === 'participants' ? '참여자 목록' : '미션 통계'}
                </p>
                <button onClick={() => setPanel(null)} style={{ color: 'var(--text-muted)' }}><X size={14} /></button>
              </div>
              {panelLoading ? (
                <p className="text-xs text-center" style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>불러오는 중...</p>
              ) : panel?.type === 'participants' ? (
                <div>
                  <p className="text-[10px] mb-3 truncate" style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>{panel.missionTitle}</p>
                  {panel.data.length === 0 ? (
                    <p className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>참여자 없음</p>
                  ) : (
                    <div className="space-y-2">
                      {panel.data.map((p) => (
                        <div key={p.userId} className="p-2 rounded-lg" style={{ background: 'var(--bg-surface)' }}>
                          <div className="flex justify-between text-xs mb-1">
                            <span style={{ color: 'var(--text-primary)', fontFamily: 'Noto Sans KR' }}>{p.username}</span>
                            <span style={{ color: statusColor[p.status], fontFamily: 'Noto Sans KR' }}>{statusLabel[p.status]}</span>
                          </div>
                          <div className="flex justify-between text-[10px]">
                            <span style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>진행도</span>
                            <span style={{ color: 'var(--text-secondary)', fontFamily: 'JetBrains Mono' }}>{p.progress}</span>
                          </div>
                          <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>{p.joinedAt.slice(0, 10)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : panel?.type === 'stats' ? (
                <div>
                  <p className="text-[10px] mb-3 truncate" style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>{panel.missionTitle}</p>
                  <div className="space-y-3">
                    {[
                      { label: '총 참여자', value: `${panel.data.participants}명` },
                      { label: '완료', value: `${panel.data.completed}명` },
                      { label: '실패', value: `${panel.data.failed}명` },
                      { label: '지급 포인트', value: `${panel.data.totalRewardedPoints.toLocaleString()}P` },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex justify-between text-xs">
                        <span style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>{label}</span>
                        <span style={{ color: 'var(--text-primary)', fontFamily: 'JetBrains Mono' }}>{value}</span>
                      </div>
                    ))}
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>완료율</span>
                        <span className="font-bold" style={{ color: 'var(--amber)', fontFamily: 'JetBrains Mono' }}>{panel.data.completionRate}%</span>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
                        <div className="h-full rounded-full" style={{ width: `${panel.data.completionRate}%`, background: 'var(--amber)' }} />
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
