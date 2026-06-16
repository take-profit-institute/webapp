'use client';

/** Centered loading indicator for client-fetched pages. */
export function Loader({ label = '불러오는 중...' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <div
        className="w-7 h-7 rounded-full animate-spin"
        style={{ border: '2px solid var(--border-normal)', borderTopColor: 'var(--amber)' }}
      />
      <p className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>{label}</p>
    </div>
  );
}

/** Error state with a retry button, shown when a BFF request fails. */
export function ErrorState({ error, onRetry }: { error: Error; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
      <div className="text-3xl">⚠️</div>
      <p className="text-sm font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'Noto Sans KR' }}>
        데이터를 불러오지 못했습니다
      </p>
      <p className="text-xs max-w-xs" style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>{error.message}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-outline text-xs px-4 py-2 mt-1">다시 시도</button>
      )}
    </div>
  );
}
