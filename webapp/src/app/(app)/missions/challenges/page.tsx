import Link from 'next/link';
import { ArrowLeft, Construction } from 'lucide-react';

export default function ChallengesComingSoonPage() {
  return (
    <div className="p-3 md:p-6 max-w-[1400px]">
      <Link
        href="/missions"
        className="inline-flex items-center gap-1 text-sm mb-6"
        style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}
      >
        <ArrowLeft size={16} /> 미션
      </Link>

      <div className="card p-10 flex flex-col items-center text-center gap-3">
        <Construction size={40} style={{ color: 'var(--amber)' }} />
        <h1 className="text-lg font-semibold">챌린지 준비 중</h1>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          챌린지 기능은 준비 중입니다. 곧 만나보실 수 있어요.
        </p>
      </div>
    </div>
  );
}
