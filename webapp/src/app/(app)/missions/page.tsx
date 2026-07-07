'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Check, Gift, Trophy, XCircle } from 'lucide-react';
import {
  cancelMissionParticipation,
  claimMission,
  getChallengeResult,
  getChallenges,
  getMissionProgressStatus,
  getMissions,
  joinChallenge,
  joinMission,
  progressMission,
  useApi,
} from '@/apis';
import { Loader, ErrorState } from '@/components/AsyncState';
import { clearIdempotencyKey, resolveIdempotencyKey } from '@/lib/idempotency';
import type { Challenge, Mission } from '@/lib/api-types';

const tabs = ['미션', '챌린지', '보상'];
const categories = ['전체', '일일', '주간', '특별'];
const categoryMap: Record<string, Mission['category']> = { '일일': 'daily', '주간': 'weekly', '특별': 'special' };
const statusMeta: Record<Mission['status'], { label: string; color: string; bg: string }> = {
  available: { label: '참여 가능', color: 'var(--text-muted)', bg: 'var(--bg-surface)' },
  in_progress: { label: '진행 중', color: 'var(--amber)', bg: 'var(--amber-subtle)' },
  completed: { label: '완료', color: 'var(--gain)', bg: 'var(--gain-dim)' },
  failed: { label: '실패', color: 'var(--loss)', bg: 'var(--loss-dim)' },
  cancelled: { label: '취소', color: 'var(--text-muted)', bg: 'var(--bg-surface)' },
};

function MissionCard({
  mission,
  expanded,
  mutating,
  onToggle,
  onJoin,
  onCancel,
  onProgress,
  onClaim,
}: {
  mission: Mission;
  expanded: boolean;
  mutating: boolean;
  onToggle: () => void;
  onJoin: () => void;
  onCancel: () => void;
  onProgress: () => void;
  onClaim: () => void;
}) {
  const meta = statusMeta[mission.status];
  const pct = mission.total > 0 ? Math.min(100, Math.round((mission.progress / mission.total) * 100)) : 0;
  const claimable = mission.status === 'completed' && !mission.claimed;
  return (
    <div className="card overflow-hidden" style={{ borderColor: mission.status === 'completed' ? 'rgba(14,203,129,0.2)' : undefined }}>
      <button onClick={onToggle} className="w-full p-3 md:p-4 text-left">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
            style={{ background: mission.status === 'completed' ? 'var(--gain-dim)' : 'var(--bg-surface)' }}>
            {mission.status === 'completed' ? '✅' : mission.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
              <p className="text-sm font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'Noto Sans KR' }}>{mission.title}</p>
              <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: meta.bg, color: meta.color, fontFamily: 'Noto Sans KR' }}>{meta.label}</span>
            </div>
            <p className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>{mission.description}</p>
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: mission.status === 'failed' ? 'var(--loss)' : mission.status === 'completed' ? 'var(--gain)' : 'var(--amber)' }} />
              </div>
              <span className="text-[10px] font-mono shrink-0" style={{ color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>
                {mission.progress}/{mission.total}
              </span>
            </div>
          </div>
          <div className="shrink-0 flex flex-col items-end gap-1">
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full"
              style={{ background: 'var(--amber-subtle)', border: '1px solid rgba(245,166,35,0.2)' }}>
              <span className="text-xs">🪙</span>
              <span className="text-xs font-bold" style={{ color: 'var(--amber)', fontFamily: 'JetBrains Mono' }}>+{mission.reward.toLocaleString()}</span>
            </div>
            {mission.badgeReward && <span className="text-[10px]" style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>{mission.badgeReward}</span>}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="px-3 md:px-4 pb-3 md:pb-4" style={{ background: 'var(--bg-surface)' }}>
          <div className="grid grid-cols-2 gap-2 py-3">
            {[
              { label: '상태', value: meta.label },
              { label: '종료일', value: mission.endsAt.slice(0, 10) },
              { label: '뱃지', value: mission.badgeReward ?? '-' },
              { label: '업적', value: mission.achievementReward ?? '-' },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between text-xs">
                <span style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>{label}</span>
                <span className="text-right" style={{ color: 'var(--text-primary)', fontFamily: 'Noto Sans KR' }}>{value}</span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {mission.status === 'available' && (
              <button onClick={onJoin} disabled={mutating} className="btn-amber text-xs col-span-2" style={{ opacity: mutating ? 0.5 : 1 }}>
                참여하기
              </button>
            )}
            {mission.status === 'in_progress' && (
              <>
                <button onClick={onProgress} disabled={mutating} className="btn-amber text-xs" style={{ opacity: mutating ? 0.5 : 1 }}>
                  진행도 +1
                </button>
                <button onClick={onCancel} disabled={mutating} className="text-xs py-2 rounded-lg font-bold"
                  style={{ background: 'var(--loss-dim)', color: 'var(--loss)', opacity: mutating ? 0.5 : 1, fontFamily: 'Noto Sans KR' }}>
                  참여 취소
                </button>
              </>
            )}
            {claimable && (
              <button onClick={onClaim} disabled={mutating} className="btn-amber text-xs col-span-2 flex items-center justify-center gap-1" style={{ opacity: mutating ? 0.5 : 1 }}>
                <Gift size={13} /> 보상 받기
              </button>
            )}
            {mission.status === 'completed' && mission.claimed && (
              <p className="text-xs text-center col-span-2" style={{ color: 'var(--gain)', fontFamily: 'Noto Sans KR' }}>보상 수령 완료</p>
            )}
            {mission.status === 'failed' && (
              <p className="text-xs text-center col-span-2" style={{ color: 'var(--loss)', fontFamily: 'Noto Sans KR' }}>종료일까지 조건을 달성하지 못했습니다</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ChallengeCard({
  challenge,
  mutating,
  onJoin,
  onResult,
}: {
  challenge: Challenge;
  mutating: boolean;
  onJoin: () => void;
  onResult: () => void;
}) {
  const statusLabel = { upcoming: '예정', active: '진행 중', completed: '종료' }[challenge.status];
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <Trophy size={15} style={{ color: 'var(--amber)' }} />
            <p className="text-sm font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'Noto Sans KR' }}>{challenge.title}</p>
          </div>
          <p className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>{challenge.description}</p>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded-full shrink-0" style={{ background: 'var(--amber-subtle)', color: 'var(--amber)', fontFamily: 'Noto Sans KR' }}>{statusLabel}</span>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-3">
        {[
          { label: '시즌', value: challenge.season },
          { label: '참여자', value: `${challenge.participants.toLocaleString()}명` },
          { label: '내 순위', value: challenge.myRank ? `${challenge.myRank}위` : '-' },
          { label: '보상', value: `${challenge.reward.toLocaleString()}P` },
        ].map(({ label, value }) => (
          <div key={label} className="flex justify-between text-xs">
            <span style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>{label}</span>
            <span style={{ color: 'var(--text-primary)', fontFamily: 'JetBrains Mono' }}>{value}</span>
          </div>
        ))}
      </div>
      {challenge.joined ? (
        <div className="grid grid-cols-2 gap-2">
          <Link href="/missions/challenges" className="btn-outline w-full text-xs text-center">
            상세 보기
          </Link>
          <button onClick={onResult} disabled={mutating} className="btn-outline w-full text-xs" style={{ opacity: mutating ? 0.5 : 1 }}>
            결과 보기
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <Link href="/missions/challenges" className="btn-outline w-full text-xs text-center">
            상세 보기
          </Link>
          <button onClick={onJoin} disabled={mutating || challenge.status === 'completed'} className="btn-amber w-full text-xs" style={{ opacity: mutating || challenge.status === 'completed' ? 0.5 : 1 }}>
            챌린지 참여
          </button>
        </div>
      )}
    </div>
  );
}

export default function MissionsPage() {
  const [activeTab, setActiveTab] = useState('미션');
  const [activeCategory, setActiveCategory] = useState('전체');
  const [expandedMission, setExpandedMission] = useState<string | null>(null);
  const [mutatingId, setMutatingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const { data, loading, error, refetch } = useApi(() => getMissions(), []);
  const { data: progress, refetch: refetchProgress } = useApi(() => getMissionProgressStatus(), []);
  const { data: challenges, refetch: refetchChallenges } = useApi(() => getChallenges(), []);
  const missions = data ?? [];

  const refreshAll = () => {
    refetch();
    refetchProgress();
  };

  const mutateMission = async (id: string, action: () => Promise<unknown>, success: string) => {
    setMutatingId(id);
    setMessage(null);
    try {
      await action();
      setMessage({ ok: true, text: success });
      refreshAll();
    } catch (e) {
      setMessage({ ok: false, text: e instanceof Error ? e.message : '요청 처리에 실패했습니다' });
    } finally {
      setMutatingId(null);
    }
  };

  const mutateChallenge = async (id: string, action: () => Promise<unknown>, success: string) => {
    setMutatingId(id);
    setMessage(null);
    try {
      await action();
      setMessage({ ok: true, text: success });
      refetchChallenges();
    } catch (e) {
      setMessage({ ok: false, text: e instanceof Error ? e.message : '요청 처리에 실패했습니다' });
    } finally {
      setMutatingId(null);
    }
  };

  const filtered = missions.filter(m => {
    if (activeCategory === '전체') return true;
    return m.category === categoryMap[activeCategory];
  });

  return (
    <div className="p-3 md:p-6 max-w-[1000px]">
      <div className="mb-4 md:mb-6">
        <h1 className="text-xl md:text-2xl font-black mb-1" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--text-primary)' }}>미션 & 챌린지</h1>
        <p className="text-xs md:text-sm" style={{ color: 'var(--text-secondary)', fontFamily: 'Noto Sans KR' }}>미션에 참여하고 보상, 뱃지, 업적을 획득하세요</p>
      </div>

      <div className="grid grid-cols-3 gap-2 md:gap-4 mb-4">
        {[
          { value: (progress?.claimableRewards ?? 0).toLocaleString(), label: '수령 가능', colored: true },
          { value: String(progress?.completed ?? 0), label: '완료', colored: false },
          { value: String(progress?.inProgress ?? 0), label: '진행 중', colored: false },
        ].map(({ value, label, colored }) => (
          <div key={label} className="card p-3 md:p-4 text-center">
            <p className={`text-xl md:text-3xl font-black mb-0.5 ${colored ? 'gradient-text' : ''}`}
              style={{ fontFamily: 'Syne, sans-serif', color: colored ? undefined : 'var(--text-primary)' }}>{value}</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>{label}</p>
          </div>
        ))}
      </div>

      {message && (
        <p className="text-xs text-center mb-3" style={{ color: message.ok ? 'var(--gain)' : 'var(--loss)', fontFamily: 'Noto Sans KR' }}>
          {message.text}
        </p>
      )}

      <div className="card overflow-hidden mb-4">
        <div className="flex overflow-x-auto scrollbar-none" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          {tabs.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className="px-4 md:px-5 py-3 text-sm font-medium transition-all shrink-0"
              style={{
                color: activeTab === tab ? 'var(--amber)' : 'var(--text-secondary)',
                borderBottom: activeTab === tab ? '2px solid var(--amber)' : '2px solid transparent',
                fontFamily: 'Noto Sans KR',
              }}>
              {tab}
            </button>
          ))}
        </div>

        {activeTab === '미션' && (
          <div className="p-3 md:p-4">
            <div className="flex gap-2 overflow-x-auto pb-1 mb-4 scrollbar-none">
              {categories.map(c => (
                <button key={c} onClick={() => setActiveCategory(c)}
                  className="px-4 py-1.5 rounded-full text-sm font-medium transition-all shrink-0"
                  style={{
                    background: activeCategory === c ? 'var(--amber)' : 'var(--bg-card)',
                    color: activeCategory === c ? '#000' : 'var(--text-secondary)',
                    border: `1px solid ${activeCategory === c ? 'var(--amber)' : 'var(--border-subtle)'}`,
                    fontFamily: 'Noto Sans KR',
                  }}>
                  {c}
                </button>
              ))}
            </div>

            {loading && <Loader />}
            {error && <ErrorState error={error} onRetry={refetch} />}
            {!loading && !error && (
              <div className="space-y-2 md:space-y-3">
                {filtered.map((mission) => (
                  <MissionCard
                    key={mission.id}
                    mission={mission}
                    expanded={expandedMission === mission.id}
                    mutating={mutatingId === mission.id}
                    onToggle={() => setExpandedMission(expandedMission === mission.id ? null : mission.id)}
                    onJoin={() => mutateMission(mission.id, () => joinMission(mission.id), '미션 참여가 시작되었습니다')}
                    onCancel={() => mutateMission(mission.id, () => cancelMissionParticipation(mission.id), '미션 참여를 취소했습니다')}
                    onProgress={() => mutateMission(mission.id, () => progressMission(mission.id, 1), '진행 상태를 갱신했습니다')}
                    onClaim={() => {
                      const scope = `claim-mission:${mission.id}`;
                      return mutateMission(
                        mission.id,
                        async () => {
                          const r = await claimMission(mission.id, resolveIdempotencyKey(scope));
                          clearIdempotencyKey(scope); // 성공 — 다음 수령 의도는 새 키
                          return r;
                        },
                        '보상을 수령했습니다',
                      );
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === '챌린지' && (
          <div className="p-3 md:p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            {(challenges ?? []).map((challenge) => (
              <ChallengeCard
                key={challenge.id}
                challenge={challenge}
                mutating={mutatingId === challenge.id}
                onJoin={() => mutateChallenge(challenge.id, () => joinChallenge(challenge.id), '챌린지에 참여했습니다')}
                onResult={async () => {
                  setMutatingId(challenge.id);
                  setMessage(null);
                  try {
                    const result = await getChallengeResult(challenge.id);
                    setMessage({ ok: true, text: `${result.challenge.title} · ${result.rank}위 · 수익률 ${result.returnPercent}%` });
                  } catch (e) {
                    setMessage({ ok: false, text: e instanceof Error ? e.message : '챌린지 결과 조회에 실패했습니다' });
                  } finally {
                    setMutatingId(null);
                  }
                }}
              />
            ))}
          </div>
        )}

        {activeTab === '보상' && (
          <div className="p-3 md:p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-4 rounded-xl" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
                <div className="flex items-center gap-2 mb-3">
                  <Gift size={15} style={{ color: 'var(--amber)' }} />
                  <p className="text-sm font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'Noto Sans KR' }}>보상 현황</p>
                </div>
                {[
                  { label: '완료', value: `${progress?.completed ?? 0}건` },
                  { label: '실패', value: `${progress?.failed ?? 0}건` },
                  { label: '취소', value: `${progress?.cancelled ?? 0}건` },
                  { label: '수령 가능 포인트', value: `${(progress?.claimableRewards ?? 0).toLocaleString()}P` },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between text-xs py-1">
                    <span style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>{label}</span>
                    <span style={{ color: 'var(--text-primary)', fontFamily: 'JetBrains Mono' }}>{value}</span>
                  </div>
                ))}
              </div>
              <div className="p-4 rounded-xl" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
                <div className="flex items-center gap-2 mb-3">
                  <Trophy size={15} style={{ color: 'var(--amber)' }} />
                  <p className="text-sm font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'Noto Sans KR' }}>뱃지 & 업적</p>
                </div>
                {[...(progress?.badges ?? []), ...(progress?.achievements ?? [])].length === 0 ? (
                  <p className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>아직 획득한 뱃지나 업적이 없습니다</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {[...(progress?.badges ?? []), ...(progress?.achievements ?? [])].map((item) => (
                      <span key={item} className="text-xs px-2 py-1 rounded-full" style={{ background: 'var(--amber-subtle)', color: 'var(--amber)', fontFamily: 'Noto Sans KR' }}>{item}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>
              <XCircle size={13} /> 종료일까지 조건 미달성 미션은 자동 실패 처리됩니다.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
