'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { displayName } from '@/lib/displayName';

const itinerary = [
  {
    day: 'Thursday',
    date: '9/10/2026',
    items: [
      { time: '6:00 PM', description: 'Dinner in Seattle' }
    ]
  },
  {
    day: 'Friday',
    date: '9/11/2026',
    items: [
      { time: '8:00 AM', description: 'Meet at Mark\'s apartment' },
      { time: '12:00 PM', description: 'Arrive at Snow Peak Campground' }
    ]
  },
  {
    day: 'Saturday',
    date: '9/12/2026',
    items: [
      { time: 'TBD', description: '' }
    ]
  },
  {
    day: 'Sunday',
    date: '9/13/2026',
    items: [
      { time: '9:00 AM', description: 'Leave Snow Peak Campground' },
      { time: '1:00 PM', description: 'Arrive at Seattle-Tacoma Airport' }
    ]
  }
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
          Welcome, <span style={{ color: 'var(--foreground)' }} className="font-medium">{displayName(user)}</span>.
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
      <div className="max-w-2xl mx-auto">
        <h2 className="text-3xl font-normal mb-8 text-center" style={{ fontFamily: 'EB Garamond, Georgia, serif', color: 'var(--foreground)' }}>
          Itinerary
        </h2>

        <div className="space-y-8">
          {itinerary.map((day, idx) => (
            <div key={idx}>
              <div className="mb-4">
                <h3 className="text-xl font-medium" style={{ fontFamily: 'EB Garamond, Georgia, serif', color: 'var(--foreground)' }}>
                  {day.day}
                </h3>
                <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
                  {day.date}
                </p>
              </div>

              <ul className="space-y-3 ml-4">
                {day.items.map((item, itemIdx) => (
                  <li key={itemIdx} className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0" style={{ background: 'var(--accent)' }} />
                    <div>
                      <span className="font-medium" style={{ color: 'var(--foreground)' }}>
                        {item.time}
                      </span>
                      {item.description && (
                        <span style={{ color: 'var(--muted)' }}> {item.description}</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
