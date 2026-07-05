'use client';
import { useCallback, useEffect, useState } from 'react';
import { Play, RefreshCw } from 'lucide-react';
import { getBatchExecutions, getBatchJobs, triggerBatchJob } from '@/apis/admin';
import { ApiError } from '@/apis/client';
import type { BatchExecution, BatchJob } from '@candle/shared';

const statusColor: Record<BatchExecution['status'], string> = {
  starting: 'var(--amber)',
  started: 'var(--amber)',
  stopping: 'var(--text-muted)',
  stopped: 'var(--text-muted)',
  failed: 'var(--loss)',
  completed: 'var(--gain)',
  abandoned: 'var(--loss)',
  unknown: 'var(--text-muted)',
};

export default function BatchPage() {
  const [jobs, setJobs] = useState<BatchJob[]>([]);
  const [selected, setSelected] = useState<string>('');
  const [businessDate, setBusinessDate] = useState(new Date().toISOString().slice(0, 10));
  const [runId, setRunId] = useState('');
  const [executions, setExecutions] = useState<BatchExecution[]>([]);
  const [loading, setLoading] = useState(true);
  const [mutating, setMutating] = useState(false);
  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null);

  const loadExecutions = useCallback(async (jobName = selected) => {
    if (!jobName) return;
    try {
      setExecutions(await getBatchExecutions(jobName, { limit: 20 }));
    } catch (e) {
      showToast(false, e instanceof ApiError ? e.message : '실행 이력 조회 실패');
    }
  }, [selected]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await getBatchJobs();
      setJobs(list);
      const first = selected || list[0]?.name || '';
      setSelected(first);
      if (first) await loadExecutions(first);
    } catch (e) {
      showToast(false, e instanceof ApiError ? e.message : '배치 목록 조회 실패');
    } finally {
      setLoading(false);
    }
  }, [loadExecutions, selected]);

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function showToast(ok: boolean, text: string) {
    setToast({ ok, text });
    setTimeout(() => setToast(null), 3000);
  }

  async function onSelect(jobName: string) {
    setSelected(jobName);
    await loadExecutions(jobName);
  }

  async function trigger() {
    if (!selected) return;
    setMutating(true);
    try {
      const parameters: Record<string, string> = {};
      if (businessDate) parameters.businessDate = businessDate;
      if (runId) parameters.runId = runId;
      const execution = await triggerBatchJob(selected, { parameters });
      setExecutions((prev) => [execution, ...prev.filter((e) => e.executionId !== execution.executionId)]);
      showToast(true, `실행 요청 완료: #${execution.executionId}`);
    } catch (e) {
      showToast(false, e instanceof ApiError ? e.message : '배치 실행 요청 실패');
    } finally {
      setMutating(false);
    }
  }

  const current = jobs.find((job) => job.name === selected);

  return (
    <div className="p-6 max-w-6xl">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black mb-1" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--text-primary)' }}>배치 실행</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>batch-service 수동 트리거</p>
        </div>
        <button onClick={() => load()} className="btn-outline flex items-center gap-2 text-xs" style={{ padding: '8px 12px' }}>
          <RefreshCw size={14} /> 새로고침
        </button>
      </div>

      {toast && (
        <div className="mb-4 px-4 py-2 rounded-lg text-sm" style={{ background: toast.ok ? 'var(--gain-dim)' : 'var(--loss-dim)', color: toast.ok ? 'var(--gain)' : 'var(--loss)', fontFamily: 'Noto Sans KR' }}>
          {toast.text}
        </div>
      )}

      <div className="grid grid-cols-[320px_1fr] gap-4">
        <div className="space-y-3">
          <div className="card p-4">
            <p className="text-sm font-bold mb-3" style={{ color: 'var(--text-primary)', fontFamily: 'Noto Sans KR' }}>잡 선택</p>
            {loading ? <p className="text-xs" style={{ color: 'var(--text-muted)' }}>불러오는 중...</p> : jobs.map((job) => (
              <button key={job.name} onClick={() => onSelect(job.name)} className="w-full text-left p-3 rounded-lg mb-2"
                style={{ background: selected === job.name ? 'var(--amber-glow)' : 'var(--bg-surface)', border: `1px solid ${selected === job.name ? 'rgba(245,166,35,0.3)' : 'var(--border-subtle)'}` }}>
                <p className="text-xs font-bold" style={{ color: selected === job.name ? 'var(--amber)' : 'var(--text-primary)', fontFamily: 'JetBrains Mono' }}>{job.name}</p>
                <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>{job.description}</p>
              </button>
            ))}
          </div>

          <div className="card p-4">
            <p className="text-sm font-bold mb-3" style={{ color: 'var(--text-primary)', fontFamily: 'Noto Sans KR' }}>실행 파라미터</p>
            <label className="block text-[11px] mb-1" style={{ color: 'var(--text-muted)' }}>businessDate</label>
            <input className="input-dark text-xs mb-3" type="date" value={businessDate} onChange={(e) => setBusinessDate(e.target.value)} />
            <label className="block text-[11px] mb-1" style={{ color: 'var(--text-muted)' }}>runId 선택</label>
            <input className="input-dark text-xs mb-4" value={runId} onChange={(e) => setRunId(e.target.value)} placeholder="비우면 서버 기본값" />
            <button onClick={trigger} disabled={!current?.triggerable || mutating} className="btn-amber w-full flex items-center justify-center gap-2 text-sm">
              <Play size={14} /> {mutating ? '요청 중...' : '수동 실행'}
            </button>
          </div>
        </div>

        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                {['실행 ID', '상태', '파라미터', '시작', '종료'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold" style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {executions.length === 0 ? (
                <tr><td colSpan={5} className="p-10 text-center text-xs" style={{ color: 'var(--text-muted)' }}>실행 이력이 없습니다.</td></tr>
              ) : executions.map((e) => (
                <tr key={e.executionId} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--text-primary)' }}>#{e.executionId}</td>
                  <td className="px-4 py-3 text-xs font-bold" style={{ color: statusColor[e.status] }}>{e.status}</td>
                  <td className="px-4 py-3 text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>{JSON.stringify(e.parameters)}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>{e.startTime?.replace('T', ' ').slice(0, 19) ?? '-'}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>{e.endTime?.replace('T', ' ').slice(0, 19) ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
