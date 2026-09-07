'use client';

import Image from 'next/image';
import Link from 'next/link';
import { displayName } from '@/lib/displayName';
import { useSession } from '@/lib/useSession';
import Itinerary from '@/components/Itinerary';

export default function Home() {
  const { user, isAdmin, ready } = useSession();

  if (!ready) return <div className="min-h-screen p-8 flex justify-center" style={{ color: 'var(--muted)' }}>Loading…</div>;

  return (
    <div className="max-w-4xl mx-auto px-6 py-14">
      {/* Hero */}
      <div className="mb-14 text-center">
        <p className="text-xs tracking-[0.2em] uppercase mb-3" style={{ color: 'var(--muted)' }}>
          September 10, 2026 - September 13, 2026
        </p>
        <h1 className="text-5xl md:text-6xl font-normal mb-4" style={{ fontFamily: 'EB Garamond, Georgia, serif', color: 'var(--foreground)' }}>
          Snow Peak Campground Trip
        </h1>
        <div className="w-12 h-px mx-auto mb-4" style={{ background: 'var(--border)' }} />
        <p style={{ color: 'var(--muted)' }} className="text-sm mb-8">
          {user ? (
            <>Welcome, <span style={{ color: 'var(--foreground)' }} className="font-medium">{displayName(user)}</span>.</>
          ) : (
            <>
              You&apos;re browsing in view-only mode.{' '}
              <Link href="/login" className="underline" style={{ color: 'var(--accent)' }}>Sign in</Link> to make changes.
            </>
          )}
        </p>

        {/* Campground Image */}
        <div className="relative w-full max-w-3xl mx-auto mb-8 rounded overflow-hidden" style={{ border: '1px solid var(--border)' }}>
          <Image
            src="/assets/snowpeakcampground.avif"
            alt="Snow Peak Campground"
            width={1200}
            height={800}
            className="w-full h-auto"
            priority
          />
        </div>
      </div>

      {/* Itinerary */}
      <div>
        <h2 className="text-3xl font-normal mb-8 text-center" style={{ fontFamily: 'EB Garamond, Georgia, serif', color: 'var(--foreground)' }}>
          Itinerary
        </h2>

        <Itinerary isAdmin={isAdmin} />
      </div>
    </div>
  );
}
