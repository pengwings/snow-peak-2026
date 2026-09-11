import { db, Game, OnionAttempt } from './db';

export type OnionStanding = {
  name: string;
  /** Best attempt on record for this player. */
  best: OnionAttempt;
  attempts: number;
  /** 1-based; equal scores share a place. */
  place: number;
};

export type OnionData = {
  attempts: OnionAttempt[];
  standings: OnionStanding[];
};

/** Best score per player, ranked. Ties on score break on finer cut (lower CV), then stay tied. */
export function computeOnionStandings(attempts: OnionAttempt[]): OnionStanding[] {
  const byPlayer = new Map<string, { best: OnionAttempt; attempts: number }>();
  for (const a of attempts) {
    const cur = byPlayer.get(a.username);
    if (!cur) byPlayer.set(a.username, { best: a, attempts: 1 });
    else {
      cur.attempts++;
      if (a.score > cur.best.score || (a.score === cur.best.score && a.cv < cur.best.cv)) cur.best = a;
    }
  }
  const rows = [...byPlayer.entries()]
    .map(([name, v]) => ({ name, best: v.best, attempts: v.attempts, place: 0 }))
    .sort((a, b) => b.best.score - a.best.score || a.best.cv - b.best.cv || a.name.localeCompare(b.name));
  rows.forEach((row, i) => {
    const prev = rows[i - 1];
    row.place = prev && prev.best.score === row.best.score ? prev.place : i + 1;
  });
  return rows;
}

export async function buildOnionData(): Promise<OnionData> {
  const attempts = await db.getOnionAttempts();
  return { attempts, standings: computeOnionStandings(attempts) };
}

/** Validates a saved attempt: a known player plus the numbers the analyser produced. */
export function validateAttempt(
  input: { username?: unknown; score?: unknown; pieces?: unknown; cv?: unknown; inSpec?: unknown },
  knownUsers: Set<string>
): Omit<OnionAttempt, 'id' | 'scoredBy' | 'scoredAt'> | { error: string } {
  const username = typeof input.username === 'string' ? input.username : '';
  const score = Number(input.score);
  const pieces = Number(input.pieces);
  const cv = Number(input.cv);
  const inSpec = Number(input.inSpec);
  if (!knownUsers.has(username)) return { error: `Unknown player: ${username || '(blank)'}` };
  if (!Number.isInteger(score) || score < 0 || score > 100) return { error: 'Score must be a whole number from 0 to 100' };
  if (!Number.isInteger(pieces) || pieces < 1) return { error: 'Piece count must be at least 1' };
  if (!Number.isFinite(cv) || cv < 0) return { error: 'Invalid spread' };
  if (!Number.isFinite(inSpec) || inSpec < 0 || inSpec > 1) return { error: 'Invalid in-spec share' };
  return { username, score, pieces, cv, inSpec };
}

/**
 * Records the onion standings as an Olympics game. Shared places carry over.
 * Returns an error when nobody has been scored yet.
 */
export async function recordOnionGame(): Promise<{ game: Game } | { error: string }> {
  const [attempts, existing] = await Promise.all([db.getOnionAttempts(), db.getGames()]);
  const standings = computeOnionStandings(attempts);
  if (standings.length === 0) return { error: 'Nobody has been scored yet.' };
  const priorRounds = existing.filter((g) => g.source === 'onion').length;
  const name = priorRounds === 0 ? 'Onion Dice' : `Onion Dice ${priorRounds + 1}`;
  const game: Game = {
    id: Math.random().toString(36).substring(7),
    name,
    source: 'onion',
    playedAt: new Date().toISOString(),
    results: standings.map((row) => ({ username: row.name, place: row.place })),
  };
  await db.addGame(game);
  return { game };
}
