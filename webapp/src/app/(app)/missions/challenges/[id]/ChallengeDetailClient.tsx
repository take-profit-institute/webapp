'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CalendarDays, Gift, Medal, Trophy, Users } from 'lucide-react';
import { getChallenge, getChallengeResult, joinChallenge, useApi } from '@/apis';
import { Loader, ErrorState } from '@/components/AsyncState';
import type { ChallengeResult } from '@/lib/api-types';

const statusMeta = {
  upcoming: { label: '예정', color: 'var(--text-muted)', bg: 'var(--bg-surface)' },
  active: { label: '진행 중', color: 'var(--amber)', bg: 'var(--amber-subtle)' },
  completed: { label: '종료', color: 'var(--gain)', bg: 'var(--gain-dim)' },
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export default function ChallengeDetailClient({ id }: { id: string }) {
  const { data: challenge, loading, error, refetch } = useApi(() => getChallenge(id), [id]);
  const [result, setResult] = useState<ChallengeResult | null>(null);
  const [mutating, setMutating] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const handleJoin = async () => {
    setMutating(true);
    setMessage(null);
    try {
      await joinChallenge(id);
      setMessage({ ok: true, text: '챌린지에 참여했습니다' });
      refetch();
    } catch (e) {
      setMessage({ ok: false, text: e instanceof Error ? e.message : '챌린지 참여에 실패했습니다' });
    } finally {
      setMutating(false);
    }
  };

  const handleResult = async () => {
    setMutating(true);
    setMessage(null);
    try {
      const next = await getChallengeResult(id);
      setResult(next);
      setMessage({ ok: true, text: '챌린지 결과를 불러왔습니다' });
    } catch (e) {
      setMessage({ ok: false, text: e instanceof Error ? e.message : '챌린지 결과 조회에 실패했습니다' });
    } finally {
      setMutating(false);
    }
  };

  if (loading) {
    return (
      <div className="p-3 md:p-6 max-w-[900px]">
        <Loader />
      </div>
    );
  }

  if (error || !challenge) {
    return (
      <div className="p-3 md:p-6 max-w-[900px]">
        <ErrorState error={error ?? new Error('챌린지를 찾을 수 없습니다')} onRetry={refetch} />
      </div>
    );
  }

  const meta = statusMeta[challenge.status];
  const canJoin = !challenge.joined && challenge.status !== 'completed';
  const canViewResult = challenge.joined;

  return (
    <div className="p-3 md:p-6 max-w-[900px]">
      <Link href="/missions" className="inline-flex items-center gap-1 text-xs mb-4" style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>
        <ArrowLeft size={14} /> 미션으로 돌아가기
      </Link>

      <div className="card overflow-hidden mb-4">
        <div className="p-4 md:p-5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <Trophy size={18} style={{ color: 'var(--amber)' }} />
                <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: meta.bg, color: meta.color, fontFamily: 'Noto Sans KR' }}>
                  {meta.label}
                </span>
              </div>
              <h1 className="text-xl md:text-2xl font-black mb-2" style={{ color: 'var(--text-primary)', fontFamily: 'Noto Sans KR' }}>
                {challenge.title}
              </h1>
              <p className="text-sm leading-6" style={{ color: 'var(--text-secondary)', fontFamily: 'Noto Sans KR' }}>
                {challenge.description}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[10px]" style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>시즌</p>
              <p className="text-sm font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'JetBrains Mono' }}>{challenge.season}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-0">
          {[
            { icon: CalendarDays, label: '기간', value: `${formatDateTime(challenge.startsAt)} - ${formatDateTime(challenge.endsAt)}` },
            { icon: Users, label: '참여자', value: `${challenge.participants.toLocaleString()}명` },
            { icon: Medal, label: '내 순위', value: challenge.myRank ? `${challenge.myRank}위` : '-' },
            { icon: Gift, label: '보상', value: `${challenge.reward.toLocaleString()}P` },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="p-4" style={{ borderRight: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)' }}>
              <div className="flex items-center gap-1.5 mb-2">
                <Icon size={14} style={{ color: 'var(--amber)' }} />
                <p className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>{label}</p>
              </div>
              <p className="text-sm font-bold" style={{ color: 'var(--text-primary)', fontFamily: label === '기간' ? 'Noto Sans KR' : 'JetBrains Mono' }}>
                {value}
              </p>
            </div>
          ))}
        </div>

        <div className="p-4 md:p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {canJoin && (
              <button onClick={handleJoin} disabled={mutating} className="btn-amber text-sm" style={{ opacity: mutating ? 0.5 : 1 }}>
                챌린지 참여
              </button>
            )}
            {canViewResult && (
              <button onClick={handleResult} disabled={mutating} className="btn-outline text-sm" style={{ opacity: mutating ? 0.5 : 1 }}>
                결과 조회
              </button>
            )}
            {!canJoin && !canViewResult && (
              <p className="text-sm text-center md:col-span-2" style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>
                종료된 챌린지는 새로 참여할 수 없습니다
              </p>
            )}
          </div>

          {message && (
            <p className="text-xs text-center mt-3" style={{ color: message.ok ? 'var(--gain)' : 'var(--loss)', fontFamily: 'Noto Sans KR' }}>
              {message.text}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="card p-4">
          <p className="text-sm font-bold mb-3" style={{ color: 'var(--text-primary)', fontFamily: 'Noto Sans KR' }}>참여 조건</p>
          <div className="space-y-2">
            {[
              '시즌 기간 동안 투자 활동을 진행합니다',
              '참여 후 내 순위와 결과를 조회할 수 있습니다',
              '종료된 챌린지는 결과 조회만 가능합니다',
            ].map((item) => (
              <div key={item} className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)', fontFamily: 'Noto Sans KR' }}>
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: 'var(--amber)' }} />
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="card p-4">
          <p className="text-sm font-bold mb-3" style={{ color: 'var(--text-primary)', fontFamily: 'Noto Sans KR' }}>결과</p>
          {result ? (
            <div className="space-y-2">
              {[
                { label: '순위', value: `${result.rank}위` },
                { label: '수익률', value: `${result.returnPercent}%` },
                { label: '지급 포인트', value: `${result.rewardedPoints.toLocaleString()}P` },
                { label: '뱃지', value: result.rewardedBadge ?? '-' },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between text-xs">
                  <span style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>{label}</span>
                  <span style={{ color: 'var(--text-primary)', fontFamily: label === '뱃지' ? 'Noto Sans KR' : 'JetBrains Mono' }}>{value}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>
              참여한 챌린지는 결과 조회 버튼으로 순위와 보상을 확인할 수 있습니다
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
