'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, TrendingUp, Briefcase, Wallet, Trophy, Target, BookOpen, User, LogOut, ChevronLeft, ChevronRight
} from 'lucide-react';
import { logout } from '@/apis';
import { useUIStore, useAuthStore } from '@/store/useStore';
import ThemeToggle from './ThemeToggle';

const navItems = [
  { icon: LayoutDashboard, label: '대시보드', href: '/dashboard' },
  { icon: TrendingUp, label: '시장', href: '/market' },
  { icon: Briefcase, label: '포트폴리오', href: '/portfolio' },
  { icon: Wallet, label: '잔고', href: '/wallet' },
  { icon: Trophy, label: '랭킹', href: '/ranking' },
  { icon: Target, label: '미션', href: '/missions' },
  { icon: BookOpen, label: '학습', href: '/learn' },
  { icon: User, label: '마이페이지', href: '/mypage' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const { username, avatar, cash, rank } = useAuthStore();

  const handleLogout = async () => {
    const { refreshToken, clearSession } = useAuthStore.getState();
    try {
      await logout(refreshToken ?? undefined); // AUTH-010
    } finally {
      clearSession();
      router.push('/login');
    }
  };

  return (
    <aside
      className="hidden lg:flex flex-col transition-all duration-300 relative shrink-0"
      style={{
        width: sidebarCollapsed ? 64 : 220,
        background: 'var(--bg-surface)',
        borderRight: '1px solid var(--border-subtle)',
        minHeight: '100vh',
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg" style={{ background: 'var(--amber-glow)', border: '1px solid rgba(245,166,35,0.3)' }}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <rect x="7" y="1" width="4" height="2" rx="1" fill="var(--amber)" />
            <rect x="6" y="3" width="6" height="10" rx="2" fill="var(--amber)" opacity="0.9" />
            <rect x="5" y="13" width="8" height="4" rx="2" fill="var(--amber)" opacity="0.6" />
          </svg>
        </div>
        {!sidebarCollapsed && (
          <span className="font-display text-lg font-bold tracking-wider" style={{ color: 'var(--amber)', fontFamily: 'Syne, sans-serif' }}>
            CANDLE
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-2 flex flex-col gap-1">
        {navItems.map(({ icon: Icon, label, href }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 group relative"
              style={{
                background: active ? 'var(--amber-glow)' : 'transparent',
                color: active ? 'var(--amber)' : 'var(--text-secondary)',
                border: active ? '1px solid rgba(245,166,35,0.2)' : '1px solid transparent',
              }}
              title={sidebarCollapsed ? label : undefined}
            >
              <Icon size={18} className="shrink-0" />
              {!sidebarCollapsed && (
                <span className="text-sm font-medium" style={{ fontFamily: 'Noto Sans KR, sans-serif' }}>{label}</span>
              )}
              {active && !sidebarCollapsed && (
                <div className="absolute right-2 w-1.5 h-1.5 rounded-full" style={{ background: 'var(--amber)' }} />
              )}
            </Link>
          );
        })}
      </nav>

      {/* User info */}
      {!sidebarCollapsed && (
        <div className="mx-2 mb-2 p-3 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">{avatar}</span>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)', fontFamily: 'Noto Sans KR' }}>{username}</p>
              <p className="text-xs" style={{ color: 'var(--amber)' }}>랭킹 #{rank}</p>
            </div>
          </div>
          <Link href="/wallet" className="block" style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 8 }}>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>가용 현금</p>
            <p className="text-sm font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>
              {cash.toLocaleString()}원
            </p>
          </Link>
        </div>
      )}

      <div className="px-2 pb-3 flex flex-col gap-1">
        <ThemeToggle showLabel={!sidebarCollapsed} className="px-3 py-2 w-full" />
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 rounded-lg transition-colors w-full"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--loss)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
        >
          <LogOut size={16} />
          {!sidebarCollapsed && <span className="text-sm" style={{ fontFamily: 'Noto Sans KR' }}>로그아웃</span>}
        </button>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-6 w-6 h-6 rounded-full flex items-center justify-center transition-all z-10"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-normal)', color: 'var(--text-secondary)' }}
      >
        {sidebarCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>
    </aside>
  );
}
