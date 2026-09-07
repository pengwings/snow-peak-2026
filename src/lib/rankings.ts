import { db, Game, GameResult } from './db';
import { computeLeaderboard, getLiveGameState } from './trivia';
import { pointsForPlace } from './rankingsConfig';

export type StandingsRow = {
  name: string;
  total: number;
  /** Games this player has a recorded place in. */
  played: number;
  /** Count of each finishing place, used for countback tiebreaks: finishes[0] = wins. */
  finishes: number[];
  /** Overall position; ties share a position. */
  position: number;
  /** Place and points in each game, keyed by game id. Missing = didn't play. */
  perGame: Record<string, { place: number; points: number }>;
};

export type GameWithPoints = Omit<Game, 'results'> & {
  results: (GameResult & { points: number })[];
};

export type RankingsData = {
  games: GameWithPoints[];
  standings: StandingsRow[];
  /** True while the trivia game is showing standings or finished, so its result can be recorded. */
  triviaImportable: boolean;
};

export function withPoints(game: Game): GameWithPoints {
  return {
    ...game,
    results: [...game.results]
      .sort((a, b) => a.place - b.place || a.username.localeCompare(b.username))
      .map((r) => ({ ...r, points: pointsForPlace(r.place) })),
  };
}

/** Countback: more wins first, then more seconds, and so on. Returns <0 when a should rank above b. */
function compareFinishes(a: number[], b: number[]): number {
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const diff = (b[i] ?? 0) - (a[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

/**
 * Season standings across every recorded game. Everyone in `players` is
 * listed even with no games yet, so the table shows the whole group.
 */
export function computeStandings(games: Game[], players: string[]): StandingsRow[] {
  const rows = new Map<string, StandingsRow>();
  const rowFor = (name: string) => {
    let row = rows.get(name);
    if (!row) {
      row = { name, total: 0, played: 0, finishes: [], position: 0, perGame: {} };
      rows.set(name, row);
    }
    return row;
  };
  for (const name of players) rowFor(name);

  for (const game of games) {
    for (const r of game.results) {
      const row = rowFor(r.username);
      const points = pointsForPlace(r.place);
      row.total += points;
      row.played += 1;
      row.finishes[r.place - 1] = (row.finishes[r.place - 1] ?? 0) + 1;
      row.perGame[game.id] = { place: r.place, points };
    }
  }

  const sorted = [...rows.values()]
    .map((row) => ({ ...row, finishes: Array.from(row.finishes, (n) => n ?? 0) }))
    .sort((a, b) => b.total - a.total || compareFinishes(a.finishes, b.finishes) || a.name.localeCompare(b.name));

  sorted.forEach((row, i) => {
    const prev = sorted[i - 1];
    const tied = prev && prev.total === row.total && compareFinishes(prev.finishes, row.finishes) === 0;
    row.position = tied ? prev.position : i + 1;
  });
  return sorted;
}

export async function isTriviaImportable(): Promise<boolean> {
  const state = await getLiveGameState();
  return state.phase === 'leaderboard' || state.phase === 'finished';
}

export async function buildRankingsData(): Promise<RankingsData> {
  const [games, users, triviaImportable] = await Promise.all([db.getGames(), db.getUsers(), isTriviaImportable()]);
  return {
    games: games.map(withPoints),
    standings: computeStandings(games, users.map((u) => u.name)),
    triviaImportable,
  };
}

/** Validates a submitted results list: known players, positive integer places, no duplicates. */
export function validateResults(input: unknown, knownUsers: Set<string>): { results: GameResult[] } | { error: string } {
  if (!Array.isArray(input)) return { error: 'results must be a list' };
  const results: GameResult[] = [];
  const seen = new Set<string>();
  for (const item of input) {
    const username = typeof item?.username === 'string' ? item.username : '';
    const place = Number(item?.place);
    if (!knownUsers.has(username)) return { error: `Unknown player: ${username || '(blank)'}` };
    if (!Number.isInteger(place) || place < 1) return { error: `${username} needs a finishing place of 1 or higher` };
    if (seen.has(username)) return { error: `${username} is listed twice` };
    seen.add(username);
    results.push({ username, place });
  }
  if (results.length === 0) return { error: 'Give at least one player a finishing place' };
  return { results };
}

/**
 * Records the current trivia standings as a game. Rank ties from the trivia
 * leaderboard carry over as shared places. Returns an error when there's no
 * finished game to record.
 */
export async function importTriviaGame(name: string): Promise<{ game: Game } | { error: string }> {
  if (!(await isTriviaImportable())) return { error: 'The trivia game has no standings to record yet.' };
  const [players, questions, answers] = await Promise.all([
    db.getTriviaPlayers(),
    db.getTriviaQuestions(),
    db.getTriviaAnswers(),
  ]);
  const leaderboard = computeLeaderboard(players, questions, answers);
  if (leaderboard.length === 0) return { error: 'Nobody played the trivia game.' };

  const game: Game = {
    id: Math.random().toString(36).substring(7),
    name,
    source: 'trivia',
    playedAt: new Date().toISOString(),
    results: leaderboard.map((row) => ({ username: row.name, place: row.rank })),
  };
  await db.addGame(game);
  return { game };
}
