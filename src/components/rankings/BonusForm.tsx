'use client';

import { useState } from 'react';
import { displayName } from '@/lib/displayName';
import { WRONG } from '@/components/trivia/TriviaShared';

export type BonusDraft = { username: string; points: string; reason: string };

const EMPTY: BonusDraft = { username: '', points: '', reason: '' };

/**
 * Admin form for handing out points outside of any game: pick a player, a
 * number of points (negative to dock some), and say why.
 */
export default function BonusForm({
  users,
  saving,
  error,
  onSubmit,
}: {
  users: string[];
  saving: boolean;
  error: string | null;
  onSubmit: (draft: BonusDraft) => Promise<boolean>;
}) {
  const [draft, setDraft] = useState<BonusDraft>(EMPTY);
  const points = parseInt(draft.points, 10);
  const valid = draft.username !== '' && Number.isInteger(points) && points !== 0;

  const inputStyle = { border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)' } as const;
  const labelClass = 'block text-xs font-medium uppercase tracking-wider mb-1';

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!valid) return;
        // Keep the player selected so several awards in a row go quickly.
        if (await onSubmit(draft)) setDraft((d) => ({ ...d, points: '', reason: '' }));
      }}
      className="space-y-4"
    >
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_6rem] gap-4">
        <div>
          <label className={labelClass} style={{ color: 'var(--muted)' }}>Player</label>
          <select
            required
            value={draft.username}
            onChange={(e) => setDraft((d) => ({ ...d, username: e.target.value }))}
            className="w-full px-3 py-2 text-sm focus:outline-none"
            style={inputStyle}
          >
            <option value="">Choose someone…</option>
            {users.map((u) => (
              <option key={u} value={u}>{displayName(u)}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass} style={{ color: 'var(--muted)' }}>Points</label>
          <input
            type="text"
            inputMode="numeric"
            required
            value={draft.points}
            onChange={(e) => setDraft((d) => ({ ...d, points: e.target.value.replace(/[^0-9-]/g, '') }))}
            placeholder="e.g. 5"
            className="w-full px-3 py-2 text-sm text-center tabular-nums focus:outline-none"
            style={inputStyle}
          />
        </div>
      </div>
      <div>
        <label className={labelClass} style={{ color: 'var(--muted)' }}>Reason</label>
        <input
          type="text"
          value={draft.reason}
          onChange={(e) => setDraft((d) => ({ ...d, reason: e.target.value }))}
          placeholder="e.g. Won the marshmallow bet, cooked breakfast for everyone"
          className="w-full px-3 py-2 text-sm focus:outline-none"
          style={inputStyle}
        />
      </div>
      <p className="text-xs" style={{ color: 'var(--muted)' }}>
        Use a negative number to take points away.
      </p>

      {error && <p className="text-sm" style={{ color: WRONG }}>{error}</p>}

      <button
        type="submit"
        disabled={saving || !valid}
        className="px-5 py-2 text-sm tracking-widest uppercase disabled:opacity-50"
        style={{ background: 'var(--accent)', color: '#f5f0e8', border: '1px solid var(--accent)' }}
      >
        {saving ? 'Saving…' : valid && points < 0 ? `Dock ${Math.abs(points)} pts` : valid ? `Give ${points} pts` : 'Give points'}
      </button>
    </form>
  );
}
