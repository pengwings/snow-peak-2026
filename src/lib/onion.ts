import { db, Game, OnionAttempt } from './db';

import { SPEED_WEIGHT } from './onionTime';

export { SPEED_WEIGHT, formatTime, parseTimeInput } from './onionTime';

export type OnionStanding = {
  name: string;
  /** Best attempt on record for this player (highest overall, or highest evenness if never timed). */
  best: OnionAttempt;
  attempts: number;
  /** 0–100: 100 for the fastest timed attempt in the round, scaling down as time grows. Null when untimed. */
  speed: number | null;
  /** Blend of evenness and speed, 0–100. Null when the best attempt has no time. */
  overall: number | null;
  /** 1-based; equal scores share a place. Timed players always rank above untimed ones. */
  place: number;
};

export type OnionData = {
  attempts: OnionAttempt[];
  standings: OnionStanding[];
  /** Fastest time recorded in the round, in seconds, or null if nobody has been timed. */
  fastestSeconds: number | null;
};

export function fastestTime(attempts: OnionAttempt[]): number | null {
  let fastest: number | null = null;
  for (const a of attempts) {
    if (a.timeSeconds != null && a.timeSeconds > 0 && (fastest === null || a.timeSeconds < fastest)) fastest = a.timeSeconds;
  }
  return fastest;
}

/** 0–100 speed score relative to the fastest time in the round; null for untimed attempts. */
export function speedScore(a: OnionAttempt, fastest: number | null): number | null {
  if (a.timeSeconds == null || a.timeSeconds <= 0 || fastest === null) return null;
  return Math.round((100 * fastest) / a.timeSeconds);
}

/** Weighted blend of evenness and speed, rounded to a whole number; null for untimed attempts. */
export function overallScore(a: OnionAttempt, fastest: number | null): number | null {
  const speed = speedScore(a, fastest);
  if (speed === null) return null;
  return Math.round((1 - SPEED_WEIGHT) * a.score + SPEED_WEIGHT * speed);
}

/**
 * Best attempt per player, ranked. Timed attempts rank by overall score (evenness blended with
 * speed); ties break on evenness, then time. Players whose attempts were never timed keep their
 * evenness score but rank below everyone with a time, ordered by evenness then finer cut.
 */
export function computeOnionStandings(attempts: OnionAttempt[]): OnionStanding[] {
  const fastest = fastestTime(attempts);
  const isBetter = (a: OnionAttempt, b: OnionAttempt) => compareAttempts(a, b, fastest) < 0;

  const byPlayer = new Map<string, { best: OnionAttempt; attempts: number }>();
  for (const a of attempts) {
    const cur = byPlayer.get(a.username);
    if (!cur) byPlayer.set(a.username, { best: a, attempts: 1 });
    else {
      cur.attempts++;
      if (isBetter(a, cur.best)) cur.best = a;
    }
  }

  const rows: OnionStanding[] = [...byPlayer.entries()]
    .map(([name, v]) => ({
      name,
      best: v.best,
      attempts: v.attempts,
      speed: speedScore(v.best, fastest),
      overall: overallScore(v.best, fastest),
      place: 0,
    }))
    .sort((a, b) => compareAttempts(a.best, b.best, fastest) || a.name.localeCompare(b.name));

  rows.forEach((row, i) => {
    const prev = rows[i - 1];
    const tied = prev && (row.overall !== null ? prev.overall === row.overall : prev.overall === null && prev.best.score === row.best.score);
    row.place = tied ? prev.place : i + 1;
  });
  return rows;
}

/** Negative when `a` beats `b`. Timed attempts always beat untimed ones. */
function compareAttempts(a: OnionAttempt, b: OnionAttempt, fastest: number | null): number {
  const oa = overallScore(a, fastest);
  const ob = overallScore(b, fastest);
  if (oa !== null && ob !== null) {
    return ob - oa || b.score - a.score || (a.timeSeconds as number) - (b.timeSeconds as number) || a.cv - b.cv;
  }
  if (oa !== null) return -1;
  if (ob !== null) return 1;
  return b.score - a.score || a.cv - b.cv;
}

export async function buildOnionData(): Promise<OnionData> {
  const attempts = await db.getOnionAttempts();
  return { attempts, standings: computeOnionStandings(attempts), fastestSeconds: fastestTime(attempts) };
}

/** Validates a saved attempt: a known player, the numbers the analyser produced, and an optional time. */
export function validateAttempt(
  input: { username?: unknown; score?: unknown; pieces?: unknown; cv?: unknown; inSpec?: unknown; timeSeconds?: unknown },
  knownUsers: Set<string>
): Omit<OnionAttempt, 'id' | 'scoredBy' | 'scoredAt'> | { error: string } {
  const username = typeof input.username === 'string' ? input.username : '';
  const score = Number(input.score);
  const pieces = Number(input.pieces);
  const cv = Number(input.cv);
  const inSpec = Number(input.inSpec);
  const time = validateTime(input.timeSeconds);
  if (!knownUsers.has(username)) return { error: `Unknown player: ${username || '(blank)'}` };
  if (!Number.isInteger(score) || score < 0 || score > 100) return { error: 'Score must be a whole number from 0 to 100' };
  if (!Number.isInteger(pieces) || pieces < 1) return { error: 'Piece count must be at least 1' };
  if (!Number.isFinite(cv) || cv < 0) return { error: 'Invalid spread' };
  if (!Number.isFinite(inSpec) || inSpec < 0 || inSpec > 1) return { error: 'Invalid in-spec share' };
  if (typeof time === 'object' && time !== null) return time;
  return { username, score, pieces, cv, inSpec, timeSeconds: time };
}

/** A time in seconds (rounded to the millisecond), null when absent, or an error. Used both on save and when adding a time later. */
export function validateTime(raw: unknown): number | null | { error: string } {
  if (raw == null || raw === '') return null;
  const seconds = Number(raw);
  if (!Number.isFinite(seconds) || seconds <= 0 || seconds > 24 * 3600) return { error: 'Time must be a positive number of seconds' };
  return Math.round(seconds * 1000) / 1000;
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
