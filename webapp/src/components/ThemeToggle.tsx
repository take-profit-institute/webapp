'use client';
import { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import { useUIStore } from '@/store/useStore';

interface ThemeToggleProps {
  /** Show the "라이트/다크 모드" label next to the icon (used in the expanded sidebar). */
  showLabel?: boolean;
  /** Render with a card-like background + border (used for the floating mobile button). */
  chip?: boolean;
  className?: string;
}

export default function ThemeToggle({ showLabel = false, chip = false, className = '' }: ThemeToggleProps) {
  const { theme, setTheme, toggleTheme } = useUIStore();
  const [mounted, setMounted] = useState(false);

  // On mount, sync the store with whatever the no-FOUC inline script applied from localStorage.
  useEffect(() => {
    const current = document.documentElement.getAttribute('data-theme');
    if (current === 'light' || current === 'dark') {
      setTheme(current);
    }
    setMounted(true);
  }, [setTheme]);

  const isLight = theme === 'light';
  const label = isLight ? '다크 모드' : '라이트 모드';

  return (
    <button
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      className={`flex items-center gap-3 rounded-lg transition-colors ${className}`}
      style={{
        color: 'var(--text-secondary)',
        ...(chip
          ? { background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }
          : {}),
      }}
      onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--amber)')}
      onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
    >
      {/* Avoid hydration mismatch: keep markup stable until mounted, then reflect real theme */}
      {mounted && isLight ? <Moon size={16} /> : <Sun size={16} />}
      {showLabel && (
        <span className="text-sm" style={{ fontFamily: 'Noto Sans KR' }}>
          {mounted ? label : '테마'}
        </span>
      )}
    </button>
  );
}
