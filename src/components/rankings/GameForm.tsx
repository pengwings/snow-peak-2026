'use client';

import { useState } from 'react';
import { displayName } from '@/lib/displayName';
import { ordinal, pointsForPlace } from '@/lib/rankingsConfig';
import { WRONG } from '@/components/trivia/TriviaShared';

export type GameDraft = { name: string; places: Record<string, string> };

/**
 * Admin form for recording a game: a name plus each player's finishing place.
 * Leave a player blank if they sat the game out. Ties are fine: give two
 * players the same place and both earn that place's points.
 */
export default function GameForm({
  users,
  initial,
  saving,
  error,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  users: string[];
  initial: GameDraft;
  saving: boolean;
  error: string | null;
  submitLabel: string;
  onSubmit: (draft: GameDraft) => void;
  onCancel?: () => void;
}) {
  // The parent remounts this form (via `key`) when switching games, so the
  // initial draft only needs reading once.
  const [draft, setDraft] = useState<GameDraft>(initial);

  const setPlace = (name: string, value: string) =>
    setDraft((d) => ({ ...d, places: { ...d.places, [name]: value.replace(/[^0-9]/g, '') } }));

  const entered = users.filter((u) => draft.places[u]);
  // Sorted preview so the host can sanity-check the podium before saving.
  const preview = [...entered]
    .map((u) => ({ name: u, place: parseInt(draft.places[u], 10) }))
    .filter((r) => r.place >= 1)
    .sort((a, b) => a.place - b.place || a.name.localeCompare(b.name));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(draft);
      }}
      className="space-y-4"
    >
      <div>
        <label className="block text-xs font-medium uppercase tracking-wider mb-1" style={{ color: 'var(--muted)' }}>Game</label>
        <input
          type="text"
          required
          value={draft.name}
          onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
          placeholder="e.g. Cornhole, Mario Kart, Spikeball"
          className="w-full px-3 py-2 text-sm focus:outline-none"
          style={{ border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)' }}
        />
      </div>

      <div>
        <div className="flex items-baseline justify-between mb-2">
          <label className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Finishing places</label>
          <button
            type="button"
            onClick={() => setDraft((d) => ({ ...d, places: {} }))}
            className="text-[11px] tracking-widest uppercase"
            style={{ color: 'var(--muted)' }}
          >
            Clear
          </button>
        </div>
        <p className="text-xs mb-3" style={{ color: 'var(--muted)' }}>
          Leave blank for anyone who didn&apos;t play. Give tied players the same place.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
          {users.map((u) => {
            const place = parseInt(draft.places[u] ?? '', 10);
            const points = place >= 1 ? pointsForPlace(place) : null;
            return (
              <label key={u} className="flex items-center gap-3 py-1" style={{ borderBottom: '1px solid var(--border)' }}>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={draft.places[u] ?? ''}
                  onChange={(e) => setPlace(u, e.target.value)}
                  placeholder="–"
                  className="w-12 px-2 py-1 text-sm text-center tabular-nums focus:outline-none"
                  style={{ border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)' }}
                  aria-label={`${displayName(u)} finishing place`}
                />
                <span className="flex-1 text-sm truncate">{displayName(u)}</span>
                <span className="text-xs tabular-nums w-14 text-right" style={{ color: 'var(--muted)' }}>
                  {points !== null ? `${points} pts` : ''}
                </span>
              </label>
            );
          })}
        </div>
      </div>

      {preview.length > 0 && (
        <div className="text-xs" style={{ color: 'var(--muted)' }}>
          {preview.map((r) => `${ordinal(r.place)} ${displayName(r.name)}`).join(' · ')}
        </div>
      )}

      {error && <p className="text-sm" style={{ color: WRONG }}>{error}</p>}

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2 text-sm tracking-widest uppercase disabled:opacity-50"
          style={{ background: 'var(--accent)', color: '#f5f0e8', border: '1px solid var(--accent)' }}
        >
          {saving ? 'Saving…' : submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="px-5 py-2 text-sm tracking-widest uppercase disabled:opacity-50"
            style={{ color: 'var(--foreground)', border: '1px solid var(--border)', background: 'var(--card)' }}
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
