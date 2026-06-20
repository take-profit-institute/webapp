'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Eye, EyeOff } from 'lucide-react';
import { adminLogin } from '@/apis/admin';
import { useAdminStore } from '@/store/useAdminStore';
import { ApiError } from '@/apis/client';

export default function LoginPage() {
  const router = useRouter();
  const { isLoggedIn, setSession } = useAdminStore();
  const [email, setEmail] = useState('admin@candle.app');
  const [password, setPassword] = useState('admin1234');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoggedIn) router.replace('/users');
  }, [isLoggedIn, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await adminLogin(email, password);
      if (result.user.role !== 'ADMIN') {
        setError('관리자 권한이 없는 계정입니다.');
        return;
      }
      setSession({ accessToken: result.tokens.accessToken, refreshToken: result.tokens.refreshToken }, result.user);
      router.replace('/users');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '로그인에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg-void)' }}>
      <div className="w-full max-w-sm animate-fade-up">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
            style={{ background: 'var(--amber-glow)', border: '1px solid rgba(245,166,35,0.3)' }}>
            <Shield size={26} style={{ color: 'var(--amber)' }} />
          </div>
          <h1 className="text-2xl font-black tracking-wider mb-1" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--amber)' }}>CANDLE</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>관리자 콘솔</p>
        </div>

        <div className="card p-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs mb-1.5" style={{ color: 'var(--text-secondary)', fontFamily: 'Noto Sans KR' }}>이메일</label>
              <input
                type="email"
                className="input-dark"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@candle.app"
                required
              />
            </div>
            <div>
              <label className="block text-xs mb-1.5" style={{ color: 'var(--text-secondary)', fontFamily: 'Noto Sans KR' }}>비밀번호</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  className="input-dark"
                  style={{ paddingRight: 40 }}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="비밀번호"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-xs text-center" style={{ color: 'var(--loss)', fontFamily: 'Noto Sans KR' }}>{error}</p>
            )}

            <button type="submit" className="btn-amber w-full py-3 mt-1" disabled={loading}>
              {loading ? '로그인 중...' : '로그인'}
            </button>
          </form>

          <p className="text-xs text-center mt-4" style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>
            테스트: admin@candle.app / admin1234
          </p>
        </div>
      </div>
    </div>
  );
}
