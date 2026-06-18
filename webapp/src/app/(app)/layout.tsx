import Sidebar from '@/components/Sidebar';
import BottomNav from '@/components/BottomNav';
import ThemeToggle from '@/components/ThemeToggle';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen" style={{ background: 'var(--bg-base)' }}>
      <Sidebar />
      <main className="main-scroll-area flex-1 overflow-auto">
        {children}
      </main>
      <BottomNav />
      {/* Mobile-only theme toggle (sidebar is hidden on small screens) */}
      <ThemeToggle chip className="lg:hidden fixed top-3 right-3 z-50 w-9 h-9 justify-center" />
    </div>
  );
}
