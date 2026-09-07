'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Pencil, Trash2 } from 'lucide-react';
import { displayName } from '@/lib/displayName';
import { useSession } from '@/lib/useSession';
import { GRAND_PRIX_POINTS, PARTICIPATION_POINTS, ordinal } from '@/lib/rankingsConfig';
import type { GameWithPoints, RankingsData } from '@/lib/rankings';
import TabVisibilityToggle from '@/components/TabVisibilityToggle';
import GameForm, { GameDraft } from '@/components/rankings/GameForm';
import { Panel, SectionTitle, WRONG } from '@/components/trivia/TriviaShared';

const SERIF = { fontFamily: 'EB Garamond, Georgia, serif' } as const;
const GOLD = '#b8860b';

const medal = (position: number) => (position === 1 ? '🥇' : position === 2 ? '🥈' : position === 3 ? '🥉' : null);

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function RankingsPage() {
  const { user, isAdmin, ready } = useSession();
  const [data, setData] = useState<RankingsData | null>(null);
  const [users, setUsers] = useState<string[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [editing, setEditing] = useState<GameWithPoints | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);
  const formRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/rankings', { cache: 'no-store' });
      if (!res.ok) throw new Error();
      setData(await res.json());
      setLoadError(null);
    } catch {
      setLoadError('Could not load the rankings.');
    }
  }, []);

  useEffect(() => {
    load();
    fetch('/api/users')
      .then((r) => r.json())
      .then((list: { name: string }[]) => setUsers(list.map((u) => u.name).sort((a, b) => a.localeCompare(b))))
      .catch(() => {});
  }, [load]);

  const post = async (body: Record<string, unknown>) => {
    setSaving(true);
    setFormError(null);
    setNotice(null);
    const res = await fetch('/api/rankings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setFormError(json.error || 'That didn’t work.');
      return false;
    }
    setData(json);
    return true;
  };

  const submitGame = async (draft: GameDraft) => {
    const results = Object.entries(draft.places)
      .filter(([, place]) => place)
      .map(([username, place]) => ({ username, place: parseInt(place, 10) }));
    const ok = await post(
      editing
        ? { action: 'update', id: editing.id, name: draft.name, results }
        : { action: 'create', name: draft.name, results }
    );
    if (ok) {
      setNotice(editing ? `Updated ${draft.name}.` : `Recorded ${draft.name}.`);
      setEditing(null);
      setFormKey((k) => k + 1);
    }
  };

  const startEdit = (game: GameWithPoints) => {
    setEditing(game);
    setFormError(null);
    setNotice(null);
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const deleteGame = async (game: GameWithPoints) => {
    if (!window.confirm(`Delete ${game.name} and its results?`)) return;
    if (await post({ action: 'delete', id: game.id })) {
      setNotice(`Deleted ${game.name}.`);
      if (editing?.id === game.id) setEditing(null);
    }
  };

  const importTrivia = async () => {
    const name = window.prompt('Name for this game in the standings:', 'Trivia');
    if (name === null) return;
    if (await post({ action: 'importTrivia', name })) setNotice('Recorded the trivia results.');
  };

  const initialDraft = useMemo<GameDraft>(() => {
    if (!editing) return { name: '', places: {} };
    const places: Record<string, string> = {};
    for (const r of editing.results) places[r.username] = String(r.place);
    return { name: editing.name, places };
  }, [editing]);

  if (!ready || (!data && !loadError)) return <div className="p-8" style={{ color: 'var(--muted)' }}>Loading…</div>;

  const games = data?.games ?? [];
  const standings = data?.standings ?? [];
  const leader = standings[0];
  const anyPoints = standings.some((s) => s.total > 0);

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <div className="flex items-center gap-3 mb-2">
        <h1 className="text-4xl font-normal" style={SERIF}>Grand Prix Standings</h1>
        <TabVisibilityToggle />
      </div>
      <div className="w-8 h-px mb-4" style={{ background: 'var(--border)' }} />
      <p className="text-sm mb-8 max-w-2xl" style={{ color: 'var(--muted)' }}>
        Every game we play on the trip counts. Finish 1st for {GRAND_PRIX_POINTS[0]} points, 2nd for {GRAND_PRIX_POINTS[1]},
        3rd for {GRAND_PRIX_POINTS[2]}, then one fewer for each place down to {ordinal(GRAND_PRIX_POINTS.length)} ({GRAND_PRIX_POINTS[GRAND_PRIX_POINTS.length - 1]}).
        Anyone further back still picks up {PARTICIPATION_POINTS} for playing. Most points at the end of the trip wins.
      </p>

      {loadError && <p className="text-sm mb-6" style={{ color: WRONG }}>{loadError}</p>}

      {/* Leader callout */}
      {anyPoints && leader && (
        <div className="mb-8 p-5 flex items-center gap-4" style={{ background: 'var(--card)', border: `1px solid ${GOLD}` }}>
          <span className="text-4xl">🏆</span>
          <div>
            <p className="text-xs tracking-widest uppercase" style={{ color: 'var(--muted)' }}>
              {standings.filter((s) => s.position === 1).length > 1 ? 'Tied for the lead' : 'Leading the Grand Prix'}
            </p>
            <p className="text-2xl font-normal" style={SERIF}>
              {standings.filter((s) => s.position === 1).map((s) => displayName(s.name)).join(' & ')}
              <span className="text-base ml-3" style={{ color: 'var(--muted)' }}>{leader.total} pts after {games.length} game{games.length === 1 ? '' : 's'}</span>
            </p>
          </div>
        </div>
      )}

      {/* Standings table */}
      <div className="mb-10">
        <SectionTitle>Standings</SectionTitle>
        <div className="overflow-x-auto" style={{ border: '1px solid var(--border)', background: 'var(--card)' }}>
          <table className="w-full text-sm" style={{ minWidth: games.length > 0 ? 360 + games.length * 72 : undefined }}>
            <thead>
              <tr className="text-[11px] tracking-widest uppercase" style={{ color: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>
                <th className="text-left font-medium px-4 py-2.5 w-12">#</th>
                <th className="text-left font-medium px-2 py-2.5">Player</th>
                {games.map((g) => (
                  <th key={g.id} className="text-center font-medium px-2 py-2.5 whitespace-nowrap max-w-[7rem] truncate" title={g.name}>
                    {g.name}
                  </th>
                ))}
                <th className="text-right font-medium px-4 py-2.5 w-20 sticky right-0" style={{ background: 'var(--card)' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {standings.length === 0 && (
                <tr><td colSpan={3 + games.length} className="p-4 italic" style={{ color: 'var(--muted)' }}>No one on the guest list yet.</td></tr>
              )}
              {standings.map((row) => {
                const isMe = row.name === user;
                const m = row.total > 0 ? medal(row.position) : null;
                return (
                  <tr
                    key={row.name}
                    style={{ borderBottom: '1px solid var(--border)', background: isMe ? '#efe9dc' : 'transparent', opacity: !anyPoints || row.total > 0 ? 1 : 0.6 }}
                  >
                    <td className="px-4 py-2.5 tabular-nums" style={{ color: 'var(--muted)' }}>{row.position}.</td>
                    <td className="px-2 py-2.5 font-medium whitespace-nowrap">
                      {displayName(row.name)}
                      {m && <span className="ml-2">{m}</span>}
                      {isMe && <span className="ml-2 text-xs font-normal" style={{ color: 'var(--muted)' }}>you</span>}
                    </td>
                    {games.map((g) => {
                      const cell = row.perGame[g.id];
                      return (
                        <td key={g.id} className="px-2 py-2.5 text-center tabular-nums">
                          {cell ? (
                            <span title={`${ordinal(cell.place)} · ${cell.points} pts`}>
                              <span className="font-medium" style={{ color: cell.place === 1 ? GOLD : 'var(--foreground)' }}>{ordinal(cell.place)}</span>
                              <span className="text-xs ml-1" style={{ color: 'var(--muted)' }}>+{cell.points}</span>
                            </span>
                          ) : (
                            <span style={{ color: 'var(--border)' }}>–</span>
                          )}
                        </td>
                      );
                    })}
                    {/* Pinned so the total stays visible while game columns scroll on narrow screens */}
                    <td
                      className="px-4 py-2.5 text-right tabular-nums font-semibold text-base sticky right-0"
                      style={{ background: isMe ? '#efe9dc' : 'var(--card)', boxShadow: '-1px 0 0 var(--border)' }}
                    >
                      {row.total}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {games.length === 0 && (
          <p className="text-xs mt-2 italic" style={{ color: 'var(--muted)' }}>No games recorded yet. The trivia game and anything else we play will show up here.</p>
        )}
      </div>

      {/* Admin: record a game */}
      {isAdmin && (
        <div ref={formRef} className="mb-10 scroll-mt-20">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <SectionTitle>{editing ? `Edit ${editing.name}` : 'Record a game'}</SectionTitle>
            {!editing && (
              <button
                onClick={importTrivia}
                disabled={saving || !data?.triviaImportable}
                title={data?.triviaImportable ? 'Add the current trivia standings as a game' : 'Available once the trivia game shows its standings'}
                className="px-3 py-1.5 text-xs tracking-widest uppercase disabled:opacity-40 mb-4"
                style={{ border: '1px solid var(--border)', color: 'var(--foreground)', background: 'var(--card)' }}
              >
                Record trivia results
              </button>
            )}
          </div>
          <Panel>
            <GameForm
              key={editing ? editing.id : `new-${formKey}`}
              users={users}
              initial={initialDraft}
              saving={saving}
              error={formError}
              submitLabel={editing ? 'Save changes' : 'Record game'}
              onSubmit={submitGame}
              onCancel={editing ? () => { setEditing(null); setFormError(null); } : undefined}
            />
          </Panel>
          {notice && <p className="text-sm mt-3" style={{ color: '#2d6a4f' }}>{notice}</p>}
        </div>
      )}

      {/* Game-by-game results */}
      <div>
        <SectionTitle>Games</SectionTitle>
        {games.length === 0 ? (
          <Panel><p className="text-sm italic" style={{ color: 'var(--muted)' }}>Nothing played yet.</p></Panel>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {[...games].reverse().map((game, i) => (
              <div key={game.id} className="p-5" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <p className="text-xs tracking-widest uppercase" style={{ color: 'var(--muted)' }}>
                      Game {games.length - i} · {formatDate(game.playedAt)}
                      {game.source === 'trivia' && <> · <Link href="/trivia" className="underline">Trivia</Link></>}
                    </p>
                    <h3 className="text-xl font-normal" style={SERIF}>{game.name}</h3>
                  </div>
                  {isAdmin && (
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => startEdit(game)} title="Edit results" className="p-1.5" style={{ color: 'var(--muted)' }}>
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => deleteGame(game)} title="Delete game" className="p-1.5" style={{ color: WRONG }}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
                <ol className="text-sm">
                  {game.results.map((r) => (
                    <li key={r.username} className="flex items-center gap-3 py-1" style={{ borderTop: '1px solid var(--border)' }}>
                      <span className="w-9 tabular-nums" style={{ color: r.place === 1 ? GOLD : 'var(--muted)' }}>{ordinal(r.place)}</span>
                      <span className="flex-1 truncate" style={{ fontWeight: r.username === user ? 600 : 400 }}>{displayName(r.username)}</span>
                      <span className="tabular-nums text-xs" style={{ color: 'var(--muted)' }}>+{r.points}</span>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
