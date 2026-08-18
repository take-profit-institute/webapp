'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  X,
} from 'lucide-react';
import { getAdvisoryRecommendations } from '@/apis';
import { ApiError } from '@/apis/client';
import { ErrorState } from '@/components/AsyncState';
import { marketDetailHref } from '@/lib/market-routes';
import type {
  AdvisoryInvestmentHorizon,
  AdvisoryRecommendationBody,
  AdvisoryRecommendationResult,
  AdvisoryRiskTolerance,
} from '@/lib/api-types';

const riskOptions: Array<{ value: AdvisoryRiskTolerance; label: string; icon: typeof ShieldCheck }> = [
  { value: 'conservative', label: '안정형', icon: ShieldCheck },
  { value: 'moderate', label: '균형형', icon: Target },
  { value: 'aggressive', label: '공격형', icon: Sparkles },
];

const horizonOptions: Array<{ value: AdvisoryInvestmentHorizon; label: string }> = [
  { value: 'short', label: '단기' },
  { value: 'mid', label: '중기' },
  { value: 'long', label: '장기' },
];

const sectorPresets = ['반도체', '자동차', '바이오', '배터리', '플랫폼', '금융', '화학', '게임'];

const riskLabel: Record<AdvisoryRiskTolerance, string> = {
  conservative: '안정형',
  moderate: '균형형',
  aggressive: '공격형',
};

const horizonLabel: Record<AdvisoryInvestmentHorizon, string> = {
  short: '단기',
  mid: '중기',
  long: '장기',
};

function formatPrice(value: number): string {
  if (!value) return '-';
  return `${value.toLocaleString()}원`;
}

function statusLabel(status: AdvisoryRecommendationResult['validationStatus']): string {
  switch (status) {
    case 'passed':
      return '검증 완료';
    case 'retried':
      return '재검증 완료';
    case 'failed':
      return '검증 실패';
    default:
      return '검증 대기';
  }
}

export default function AdvisoryPage() {
  const [riskTolerance, setRiskTolerance] = useState<AdvisoryRiskTolerance>('moderate');
  const [investmentHorizon, setInvestmentHorizon] = useState<AdvisoryInvestmentHorizon>('mid');
  const [preferredSectors, setPreferredSectors] = useState<string[]>(['반도체', '바이오']);
  const [sectorInput, setSectorInput] = useState('');
  const [freeTextQuery, setFreeTextQuery] = useState('');
  const [result, setResult] = useState<AdvisoryRecommendationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const requestBody = useMemo<AdvisoryRecommendationBody>(() => ({
    riskTolerance,
    investmentHorizon,
    preferredSectors,
    freeTextQuery: freeTextQuery.trim() || undefined,
  }), [freeTextQuery, investmentHorizon, preferredSectors, riskTolerance]);

  const toggleSector = (sector: string) => {
    setPreferredSectors((prev) => (
      prev.includes(sector)
        ? prev.filter((item) => item !== sector)
        : prev.length >= 10
          ? prev
          : [...prev, sector]
    ));
  };

  const addSector = () => {
    const next = sectorInput.trim();
    if (!next || next.length > 50 || preferredSectors.includes(next) || preferredSectors.length >= 10) return;
    setPreferredSectors((prev) => [...prev, next]);
    setSectorInput('');
  };

  const submit = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAdvisoryRecommendations(requestBody);
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-3 md:p-6 max-w-[1280px]">
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-black" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--text-primary)' }}>
            종목 추천
          </h1>
          <p className="text-xs md:text-sm mt-0.5" style={{ color: 'var(--text-secondary)', fontFamily: 'Noto Sans KR' }}>
            {riskLabel[riskTolerance]} · {horizonLabel[investmentHorizon]} · {preferredSectors.length}개 섹터
          </p>
        </div>
        {result && (
          <button
            onClick={submit}
            disabled={loading}
            className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors disabled:opacity-50"
            title="새로고침"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}
          >
            <RefreshCw size={16} />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-3">
        <div className="space-y-3">
          <section className="card p-4">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck size={16} style={{ color: 'var(--amber)' }} />
              <p className="text-sm font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'Noto Sans KR' }}>투자 성향</p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {riskOptions.map(({ value, label, icon: Icon }) => {
                const active = riskTolerance === value;
                return (
                  <button
                    key={value}
                    onClick={() => setRiskTolerance(value)}
                    className="h-[74px] rounded-lg flex flex-col items-center justify-center gap-1 transition-all"
                    style={{
                      background: active ? 'var(--amber-subtle)' : 'var(--bg-surface)',
                      color: active ? 'var(--amber)' : 'var(--text-secondary)',
                      border: `1px solid ${active ? 'rgba(245,166,35,0.35)' : 'var(--border-subtle)'}`,
                      fontFamily: 'Noto Sans KR',
                    }}
                  >
                    <Icon size={17} />
                    <span className="text-xs font-bold">{label}</span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Clock3 size={16} style={{ color: 'var(--amber)' }} />
              <p className="text-sm font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'Noto Sans KR' }}>투자 기간</p>
            </div>
            <div className="grid grid-cols-3 gap-1.5 p-1 rounded-lg" style={{ background: 'var(--bg-surface)' }}>
              {horizonOptions.map(({ value, label }) => {
                const active = investmentHorizon === value;
                return (
                  <button
                    key={value}
                    onClick={() => setInvestmentHorizon(value)}
                    className="py-2 rounded-md text-xs transition-all"
                    style={{
                      background: active ? 'var(--amber)' : 'transparent',
                      color: active ? '#000' : 'var(--text-secondary)',
                      fontFamily: 'Noto Sans KR',
                      fontWeight: active ? 800 : 500,
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Target size={16} style={{ color: 'var(--amber)' }} />
              <p className="text-sm font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'Noto Sans KR' }}>관심 섹터</p>
            </div>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {sectorPresets.map((sector) => {
                const active = preferredSectors.includes(sector);
                return (
                  <button
                    key={sector}
                    onClick={() => toggleSector(sector)}
                    className="px-2.5 py-1.5 rounded-full text-xs transition-colors"
                    style={{
                      background: active ? 'var(--amber-subtle)' : 'transparent',
                      color: active ? 'var(--amber)' : 'var(--text-muted)',
                      border: `1px solid ${active ? 'rgba(245,166,35,0.25)' : 'var(--border-subtle)'}`,
                      fontFamily: 'Noto Sans KR',
                    }}
                  >
                    {sector}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2 mb-3">
              <input
                value={sectorInput}
                onChange={(e) => setSectorInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addSector();
                  }
                }}
                className="input-dark text-xs"
                placeholder="섹터 추가"
                maxLength={50}
                style={{ fontFamily: 'Noto Sans KR' }}
              />
              <button
                onClick={addSector}
                className="btn-outline text-xs px-3 py-2 shrink-0"
                style={{ fontFamily: 'Noto Sans KR' }}
              >
                추가
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5 min-h-7">
              {preferredSectors.map((sector) => (
                <span
                  key={sector}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs"
                  style={{ background: 'var(--bg-surface)', color: 'var(--text-secondary)', fontFamily: 'Noto Sans KR' }}
                >
                  {sector}
                  <button onClick={() => toggleSector(sector)} title="삭제" className="opacity-70 hover:opacity-100">
                    <X size={11} />
                  </button>
                </span>
              ))}
            </div>
          </section>

          <section className="card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Search size={16} style={{ color: 'var(--amber)' }} />
              <p className="text-sm font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'Noto Sans KR' }}>검색 문장</p>
            </div>
            <textarea
              value={freeTextQuery}
              onChange={(e) => setFreeTextQuery(e.target.value)}
              className="input-dark text-sm min-h-[104px] resize-none"
              placeholder="예: 변동성은 낮고 실적이 안정적인 반도체 종목"
              maxLength={500}
              style={{ fontFamily: 'Noto Sans KR' }}
            />
            <div className="flex items-center justify-between mt-2">
              <span className="text-[10px]" style={{ color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>
                {freeTextQuery.length}/500
              </span>
              <button
                onClick={submit}
                disabled={loading}
                className="btn-amber text-sm px-4 py-2 inline-flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ fontFamily: 'Noto Sans KR' }}
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                추천 받기
              </button>
            </div>
          </section>
        </div>

        <section className="card p-4 md:p-5 min-h-[520px]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'Noto Sans KR' }}>추천 결과</p>
              {result && (
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)', fontFamily: 'Noto Sans KR' }}>
                  {statusLabel(result.validationStatus)} · 재시도 {result.retryCount}회
                </p>
              )}
            </div>
            {result && (
              <span
                className={result.validationStatus === 'failed' ? 'badge-loss' : 'badge-amber'}
                style={{ fontFamily: 'Noto Sans KR' }}
              >
                {result.recommendations.length}종목
              </span>
            )}
          </div>

          {loading && (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 size={28} className="animate-spin" style={{ color: 'var(--amber)' }} />
              <p className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>추천을 계산하는 중...</p>
            </div>
          )}

          {!loading && error && (
            <ErrorState
              error={error instanceof ApiError ? new Error(error.message) : error}
              onRetry={submit}
            />
          )}

          {!loading && !error && !result && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3" style={{ background: 'var(--amber-subtle)' }}>
                <Sparkles size={24} style={{ color: 'var(--amber)' }} />
              </div>
              <p className="text-sm font-bold mb-1" style={{ color: 'var(--text-primary)', fontFamily: 'Noto Sans KR' }}>조건을 선택하세요</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>최대 5개 종목이 표시됩니다</p>
            </div>
          )}

          {!loading && !error && result && (
            <div className="space-y-3">
              {result.validationErrors.length > 0 && (
                <div className="p-3 rounded-lg" style={{ background: 'var(--loss-dim)', border: '1px solid rgba(246,70,93,0.22)' }}>
                  {result.validationErrors.map((item) => (
                    <p key={item} className="text-xs" style={{ color: 'var(--loss)', fontFamily: 'Noto Sans KR' }}>{item}</p>
                  ))}
                </div>
              )}

              {result.recommendations.map((item, index) => {
                const fitPercent = Math.round(item.fitScore * 100);
                return (
                  <Link
                    key={`${item.stockCode}-${index}`}
                    href={marketDetailHref(item.stockCode)}
                    className="card-interactive p-4 block"
                    style={{ textDecoration: 'none' }}
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="badge-amber" style={{ fontFamily: 'JetBrains Mono', fontSize: 10 }}>
                            #{index + 1}
                          </span>
                          <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{item.stockCode}</span>
                        </div>
                        <h2 className="text-base md:text-lg font-black truncate" style={{ color: 'var(--text-primary)', fontFamily: 'Noto Sans KR' }}>
                          {item.nameKr}
                        </h2>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xl font-black leading-none" style={{ color: 'var(--amber)', fontFamily: 'JetBrains Mono' }}>{fitPercent}</p>
                        <p className="text-[10px]" style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>적합도</p>
                      </div>
                    </div>

                    <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--text-secondary)', fontFamily: 'Noto Sans KR' }}>
                      {item.narrative}
                    </p>

                    <div className="flex items-center justify-between gap-3 pt-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                      <div className="flex flex-wrap gap-1.5 min-w-0">
                        {item.improvementTags.slice(0, 4).map((tag) => (
                          <span
                            key={tag}
                            className="text-[10px] px-2 py-0.5 rounded-full"
                            style={{ background: 'var(--bg-surface)', color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-mono" style={{ color: 'var(--text-primary)' }}>{formatPrice(item.priceSnapshot)}</span>
                        <ArrowUpRight size={14} style={{ color: 'var(--text-muted)' }} />
                      </div>
                    </div>
                  </Link>
                );
              })}

              {result.recommendations.length === 0 && (
                <div className="text-center py-16">
                  <CheckCircle2 size={28} className="mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
                  <p className="text-sm" style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>추천 결과가 없습니다</p>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
