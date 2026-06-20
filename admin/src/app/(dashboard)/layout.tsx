'use client';
import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Users, BookOpen, Target, LogOut, Shield } from 'lucide-react';
import { useAdminStore } from '@/store/useAdminStore';
import { setTokenGetter } from '@/apis/client';

const navItems = [
  { icon: Users, label: '사용자 관리', href: '/users' },
  { icon: BookOpen, label: '학습 콘텐츠', href: '/learn' },
  { icon: Target, label: '미션 관리', href: '/missions' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isLoggedIn, user, accessToken, clearSession } = useAdminStore();

  useEffect(() => {
    if (!isLoggedIn) router.replace('/login');
  }, [isLoggedIn, router]);

  useEffect(() => {
    setTokenGetter(() => useAdminStore.getState().accessToken);
  }, []);

  if (!isLoggedIn) return null;

  const handleLogout = () => {
    clearSession();
    router.push('/login');
  };

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--bg-base)' }}>
      {/* Sidebar */}
      <aside className="w-56 flex flex-col shrink-0" style={{ background: 'var(--bg-surface)', borderRight: '1px solid var(--border-subtle)', minHeight: '100vh' }}>
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-4 py-5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--amber-glow)', border: '1px solid rgba(245,166,35,0.3)' }}>
            <Shield size={16} style={{ color: 'var(--amber)' }} />
          </div>
          <div>
            <p className="text-sm font-black tracking-wider" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--amber)' }}>CANDLE</p>
            <p className="text-[10px]" style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>관리자 콘솔</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-2 flex flex-col gap-1">
          {navItems.map(({ icon: Icon, label, href }) => {
            const active = pathname === href || pathname.startsWith(href + '/');
            return (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150"
                style={{
                  background: active ? 'var(--amber-glow)' : 'transparent',
                  color: active ? 'var(--amber)' : 'var(--text-secondary)',
                  border: active ? '1px solid rgba(245,166,35,0.2)' : '1px solid transparent',
                }}
              >
                <Icon size={16} className="shrink-0" />
                <span className="text-sm font-medium" style={{ fontFamily: 'Noto Sans KR' }}>{label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User info */}
        <div className="mx-2 mb-2 p-3 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">{user?.avatar ?? '🛡️'}</span>
            <div className="min-w-0">
              <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)', fontFamily: 'Noto Sans KR' }}>{user?.username}</p>
              <p className="text-[10px]" style={{ color: 'var(--amber)' }}>ADMIN</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-1 py-1 rounded-lg transition-colors text-xs"
            style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--loss)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
          >
            <LogOut size={13} /> 로그아웃
          </button>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
