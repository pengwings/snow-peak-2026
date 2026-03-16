'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { displayName } from '@/lib/displayName';

const sections = [
  { href: '/cabins', emoji: '🏠', label: 'Cabins', desc: 'View cabin assignments and choose where you\'ll be sleeping.' },
  { href: '/cars', emoji: '🚗', label: 'Rental Cars', desc: 'Check who is driving, who is riding, and claim your seat.' },
  { href: '/flights', emoji: '✈️', label: 'Flights', desc: 'Log arrival and departure times to coordinate pickups.' },
  { href: '/supplies', emoji: '🛒', label: 'Supplies', desc: 'See what we need, claim items to buy, and enter costs to split.' },
  { href: '/activities', emoji: '🏔️', label: 'Activities', desc: 'Propose ideas and vote on what we should do.' },
  { href: '/todos', emoji: '✅', label: 'Todos', desc: 'Create and manage a shared trip checklist.' },
];

export default function Home() {
  const [user, setUser] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/me')
      .then((res) => res.json())
      .then((data) => {
        if (!data.user) {
          router.push('/login');
        } else {
          setUser(data.user);
        }
      });
  }, [router]);

  if (!user) return <div className="min-h-screen p-8 flex justify-center" style={{ color: 'var(--muted)' }}>Loading…</div>;

  return (
    <div className="max-w-5xl mx-auto px-6 py-14">
      {/* Hero */}
      <div className="mb-14 text-center">
        <p className="text-xs tracking-[0.2em] uppercase mb-3" style={{ color: 'var(--muted)' }}>
          September 10, 2026 - September 13, 2026
        </p>
        <h1 className="text-5xl md:text-6xl font-normal mb-4" style={{ fontFamily: 'EB Garamond, Georgia, serif', color: 'var(--foreground)' }}>
          Snow Peak Campground Trip
        </h1>
        <div className="w-12 h-px mx-auto mb-4" style={{ background: 'var(--border)' }} />
        <p style={{ color: 'var(--muted)' }} className="text-sm">
          Welcome, <span style={{ color: 'var(--foreground)' }} className="font-medium">{displayName(user)}</span>.
        </p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px" style={{ background: 'var(--border)' }}>
        {sections.map(({ href, emoji, label, desc }) => (
          <Link key={href} href={href} className="block group">
            <div
              className="h-full p-8 transition-colors"
              style={{ background: 'var(--card)' }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = '#ede7dc';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'var(--card)';
              }}
            >
              <div className="text-2xl mb-4">{emoji}</div>
              <h2 className="text-lg font-medium mb-2" style={{ color: 'var(--foreground)', fontFamily: 'EB Garamond, Georgia, serif' }}>
                {label}
              </h2>
              <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--muted)' }}>{desc}</p>
              <span className="text-xs tracking-widest uppercase" style={{ color: 'var(--accent)' }}>
                View →
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
