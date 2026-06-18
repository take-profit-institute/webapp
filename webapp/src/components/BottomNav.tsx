'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, TrendingUp, Briefcase, Trophy, User } from 'lucide-react';

const navItems = [
  { icon: LayoutDashboard, label: '홈', href: '/dashboard' },
  { icon: TrendingUp, label: '시장', href: '/market' },
  { icon: Briefcase, label: '포트폴리오', href: '/portfolio' },
  { icon: Trophy, label: '랭킹', href: '/ranking' },
  { icon: User, label: '나', href: '/mypage' },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 lg:hidden z-50"
      style={{
        background: 'var(--bg-surface)',
        borderTop: '1px solid var(--border-subtle)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <div className="flex items-center justify-around px-1" style={{ height: 60 }}>
        {navItems.map(({ icon: Icon, label, href }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className="relative flex flex-col items-center justify-center gap-0.5 flex-1 py-3 rounded-xl transition-opacity active:opacity-60"
              style={{ color: active ? 'var(--amber)' : 'var(--text-muted)' }}
            >
              {active && (
                <span
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full"
                  style={{ background: 'var(--amber)' }}
                />
              )}
              <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
              <span className="text-xs font-medium" style={{ fontFamily: 'Noto Sans KR' }}>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
