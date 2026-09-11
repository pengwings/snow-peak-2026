'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Pencil, Trash2 } from 'lucide-react';
import { displayName } from '@/lib/displayName';
import { useSession } from '@/lib/useSession';
import { OLYMPICS_POINTS, PARTICIPATION_POINTS, ordinal } from '@/lib/rankingsConfig';
import type { GameWithPoints, RankingsData } from '@/lib/rankings';
import type { BonusAward } from '@/lib/db';
import TabVisibilityToggle from '@/components/TabVisibilityToggle';
import GameForm, { GameDraft } from '@/components/rankings/GameForm';
import BonusForm, { BonusDraft } from '@/components/rankings/BonusForm';
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
  const [bonusError, setBonusError] = useState<string | null>(null);
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

  const post = async (body: Record<string, unknown>, setError = setFormError) => {
    setSaving(true);
    setFormError(null);
    setBonusError(null);
    setNotice(null);
    const res = await fetch('/api/rankings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setError(json.error || 'That didn’t work.');
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
    if (await post({ action: 'importTrivia' })) setNotice('Recorded the trivia results.');
  };

  const awardBonus = async (draft: BonusDraft) => {
    const points = parseInt(draft.points, 10);
    const ok = await post({ action: 'awardBonus', username: draft.username, points, reason: draft.reason }, setBonusError);
    if (ok) setNotice(points < 0 ? `Took ${-points} points from ${displayName(draft.username)}.` : `Gave ${displayName(draft.username)} ${points} points.`);
    return ok;
  };

  const deleteBonus = async (award: BonusAward) => {
    const what = `${award.points > 0 ? '+' : ''}${award.points} for ${displayName(award.username)}`;
    if (!window.confirm(`Remove the ${what}${award.reason ? ` (${award.reason})` : ''}?`)) return;
    if (await post({ action: 'deleteBonus', id: award.id }, setBonusError)) setNotice(`Removed ${what}.`);
  };

  const initialDraft = useMemo<GameDraft>(() => {
    if (!editing) return { name: '', places: {} };
    const places: Record<string, string> = {};
    for (const r of editing.results) places[r.username] = String(r.place);
    return { name: editing.name, places };
  }, [editing]);

  if (!ready || (!data && !loadError)) return <div className="p-8" style={{ color: 'var(--muted)' }}>Loading…</div>;

  const games = data?.games ?? [];
  const bonuses = data?.bonuses ?? [];
  const standings = data?.standings ?? [];
  const anyBonus = bonuses.length > 0;
  const leader = standings[0];
  const anyPoints = standings.some((s) => s.total > 0);

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <div className="flex items-center gap-3 mb-2">
        <h1 className="text-4xl font-normal" style={SERIF}>Snow Peak Olympics Standings</h1>
        <TabVisibilityToggle />
      </div>
      <div className="w-8 h-px mb-4" style={{ background: 'var(--border)' }} />
      <p className="text-sm mb-8 max-w-2xl" style={{ color: 'var(--muted)' }}>
        Every game we play on the trip counts. Finish 1st for {OLYMPICS_POINTS[0]} points, 2nd for {OLYMPICS_POINTS[1]},
        3rd for {OLYMPICS_POINTS[2]}, then one fewer for each place down to {ordinal(OLYMPICS_POINTS.length)} ({OLYMPICS_POINTS[OLYMPICS_POINTS.length - 1]}).
        Anyone further back still picks up {PARTICIPATION_POINTS} for playing. Bonus points may be handed out at the
        organisers&apos; whim. Most points at the end of the trip wins.
      </p>

      {loadError && <p className="text-sm mb-6" style={{ color: WRONG }}>{loadError}</p>}

      {/* Leader callout */}
      {anyPoints && leader && (
        <div className="mb-8 p-5 flex items-center gap-4" style={{ background: 'var(--card)', border: `1px solid ${GOLD}` }}>
          <span className="text-4xl">🏆</span>
          <div>
            <p className="text-xs tracking-widest uppercase" style={{ color: 'var(--muted)' }}>
              {standings.filter((s) => s.position === 1).length > 1 ? 'Tied for the lead' : 'Leading the Snow Peak Olympics'}
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
          <table className="w-full text-sm" style={{ minWidth: games.length > 0 ? 360 + (games.length + (anyBonus ? 1 : 0)) * 72 : undefined }}>
            <thead>
              <tr className="text-[11px] tracking-widest uppercase" style={{ color: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>
                <th className="text-left font-medium px-4 py-2.5 w-12">#</th>
                <th className="text-left font-medium px-2 py-2.5">Player</th>
                {games.map((g) => (
                  <th key={g.id} className="text-center font-medium px-2 py-2.5 whitespace-nowrap max-w-[7rem] truncate" title={g.name}>
                    {g.name}
                  </th>
                ))}
                {anyBonus && <th className="text-center font-medium px-2 py-2.5 whitespace-nowrap">Bonus</th>}
                <th className="text-right font-medium px-4 py-2.5 w-20 sticky right-0" style={{ background: 'var(--card)' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {standings.length === 0 && (
                <tr><td colSpan={3 + games.length + (anyBonus ? 1 : 0)} className="p-4 italic" style={{ color: 'var(--muted)' }}>No one on the guest list yet.</td></tr>
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
                    {anyBonus && (
                      <td className="px-2 py-2.5 text-center tabular-nums">
                        {row.bonus !== 0 ? (
                          <span className="text-xs font-medium" style={{ color: row.bonus > 0 ? '#2d6a4f' : WRONG }}>
                            {row.bonus > 0 ? '+' : ''}{row.bonus}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--border)' }}>–</span>
                        )}
                      </td>
                    )}
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

      {/* Admin: hand out points outside of any game */}
      {isAdmin && (
        <div className="mb-10">
          <SectionTitle>Give bonus points</SectionTitle>
          <Panel>
            <BonusForm users={users} saving={saving} error={bonusError} onSubmit={awardBonus} />
          </Panel>
        </div>
      )}

      {/* Bonus point history, shown to everyone once anything has been awarded */}
      {anyBonus && (
        <div className="mb-10">
          <SectionTitle>Bonus points</SectionTitle>
          <Panel className="!p-0">
            <ul className="text-sm">
              {[...bonuses].reverse().map((award) => (
                <li key={award.id} className="flex items-center gap-3 px-5 py-2.5" style={{ borderBottom: '1px solid var(--border)' }}>
                  <span className="w-12 tabular-nums font-medium shrink-0" style={{ color: award.points > 0 ? '#2d6a4f' : WRONG }}>
                    {award.points > 0 ? '+' : ''}{award.points}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span style={{ fontWeight: award.username === user ? 600 : 400 }}>{displayName(award.username)}</span>
                    {award.reason && <span className="ml-2" style={{ color: 'var(--muted)' }}>{award.reason}</span>}
                  </span>
                  <span className="text-xs whitespace-nowrap shrink-0" style={{ color: 'var(--muted)' }}>{formatDate(award.awardedAt)}</span>
                  {isAdmin && (
                    <button onClick={() => deleteBonus(award)} title="Remove these points" className="p-1.5 shrink-0" style={{ color: WRONG }}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </Panel>
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
                      {game.source === 'onion' && <> · <Link href="/onion" className="underline">Onion Dice</Link></>}
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
