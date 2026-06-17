'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, TrendingUp, Briefcase, Wallet, Trophy, User } from 'lucide-react';

const navItems = [
  { icon: LayoutDashboard, label: '홈', href: '/dashboard' },
  { icon: TrendingUp, label: '시장', href: '/market' },
  { icon: Briefcase, label: '자산', href: '/portfolio' },
  { icon: Wallet, label: '잔고', href: '/wallet' },
  { icon: Trophy, label: '랭킹', href: '/ranking' },
  { icon: User, label: '나', href: '/mypage' },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 md:hidden z-50 flex items-center justify-around px-2 pb-safe"
      style={{
        background: 'var(--bg-surface)',
        borderTop: '1px solid var(--border-subtle)',
        height: 60,
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {navItems.map(({ icon: Icon, label, href }) => {
        const active = pathname === href || pathname.startsWith(href + '/');
        return (
          <Link
            key={href}
            href={href}
            className="flex flex-col items-center justify-center gap-0.5 flex-1 py-1 rounded-xl transition-all"
            style={{ color: active ? 'var(--amber)' : 'var(--text-muted)' }}
          >
            <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
            <span className="text-[10px] font-medium" style={{ fontFamily: 'Noto Sans KR' }}>{label}</span>
            {active && (
              <span className="absolute top-0 w-6 h-0.5 rounded-full" style={{ background: 'var(--amber)' }} />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
