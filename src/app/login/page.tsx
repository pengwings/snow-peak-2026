'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Login() {
  const [name, setName] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });

    router.push('/');
    router.refresh();
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background)' }}>
      <div className="w-full max-w-sm px-8 py-12 text-center" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
        <p className="text-xs tracking-[0.2em] uppercase mb-6" style={{ color: 'var(--muted)' }}>
          Snow Peak 2026
        </p>
        <h1 className="text-3xl font-normal mb-1" style={{ fontFamily: 'EB Garamond, Georgia, serif' }}>
          Welcome
        </h1>
        <div className="w-8 h-px mx-auto my-4" style={{ background: 'var(--border)' }} />
        <p className="text-sm mb-8" style={{ color: 'var(--muted)' }}>Enter your name to continue</p>

        <form onSubmit={handleLogin} className="space-y-4">
          <input
            id="name"
            name="name"
            type="text"
            required
            className="w-full px-4 py-2.5 text-sm text-center focus:outline-none"
            style={{
              background: 'var(--background)',
              border: '1px solid var(--border)',
              color: 'var(--foreground)',
            }}
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button
            type="submit"
            className="w-full py-2.5 text-sm tracking-widest uppercase transition-colors"
            style={{
              background: 'var(--accent)',
              color: '#f5f0e8',
              border: '1px solid var(--accent)',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = '#2e2820';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'var(--accent)';
            }}
          >
            Enter
          </button>
        </form>
      </div>
    </div>
  );
}
