import { db, TriviaAnswer, TriviaGameState, TriviaQuestion } from './db';
import { QUESTION_SECONDS } from './triviaConfig';

export { QUESTION_SECONDS };
/** Answers arriving this long after the clock hits zero are still accepted (network slack). */
const GRACE_MS = 1500;

export type LeaderboardRow = {
  name: string;
  score: number;
  /** Total time spent on correct answers; lower breaks ties. */
  totalMs: number;
  rank: number;
};

export type RevealInfo = {
  correctIndex: number;
  about: string | null;
  /** Answer count per option index. */
  counts: number[];
  /** Names of who picked each option. */
  names: string[][];
};

export type TriviaClientState = {
  phase: TriviaGameState['phase'];
  factsOpen: boolean;
  questionNumber: number;
  questionCount: number;
  question: { id: string; text: string; options: string[] } | null;
  questionSeconds: number;
  /** Milliseconds left on the clock; 0 once time is up. */
  timeLeftMs: number;
  answeredCount: number;
  players: string[];
  myAnswer: { choice: number; elapsedMs: number } | null;
  reveal: RevealInfo | null;
  leaderboard: LeaderboardRow[] | null;
};

function elapsedSince(startedAt: string | null): number {
  if (!startedAt) return 0;
  return Date.now() - new Date(startedAt).getTime();
}

export function timeLeftMs(state: TriviaGameState): number {
  if (state.phase !== 'question') return 0;
  return Math.max(0, QUESTION_SECONDS * 1000 - elapsedSince(state.startedAt));
}

/**
 * Loads the game state, and if the current question's clock has run out,
 * moves it to the reveal on the spot. Any client's poll can advance it, so
 * the game never stalls on a locked host phone.
 */
export async function getLiveGameState(): Promise<TriviaGameState> {
  const state = await db.getTriviaGameState();
  if (state.phase === 'question' && elapsedSince(state.startedAt) > QUESTION_SECONDS * 1000 + GRACE_MS) {
    const revealed: TriviaGameState = { ...state, phase: 'reveal' };
    await db.setTriviaGameState(revealed);
    return revealed;
  }
  return state;
}

export function computeLeaderboard(
  players: string[],
  questions: TriviaQuestion[],
  answers: TriviaAnswer[]
): LeaderboardRow[] {
  const correctByQuestion = new Map(questions.map((q) => [q.id, q.correctIndex]));
  const totals = new Map<string, { score: number; totalMs: number }>();
  for (const name of players) totals.set(name, { score: 0, totalMs: 0 });

  for (const a of answers) {
    const correct = correctByQuestion.get(a.questionId);
    if (correct === undefined) continue; // question was deleted
    const row = totals.get(a.username) ?? { score: 0, totalMs: 0 };
    if (a.choice === correct) {
      row.score += 1;
      row.totalMs += a.elapsedMs;
    }
    totals.set(a.username, row);
  }

  const rows = [...totals.entries()]
    .map(([name, t]) => ({ name, ...t, rank: 0 }))
    .sort((a, b) => b.score - a.score || a.totalMs - b.totalMs || a.name.localeCompare(b.name));

  // Shared rank only when score AND tiebreak time match exactly.
  rows.forEach((row, i) => {
    const prev = rows[i - 1];
    row.rank = prev && prev.score === row.score && prev.totalMs === row.totalMs ? prev.rank : i + 1;
  });
  return rows;
}

function buildReveal(question: TriviaQuestion, answers: TriviaAnswer[]): RevealInfo {
  const counts = question.options.map(() => 0);
  const names: string[][] = question.options.map(() => []);
  for (const a of answers) {
    if (a.questionId !== question.id) continue;
    if (a.choice < 0 || a.choice >= question.options.length) continue;
    counts[a.choice] += 1;
    names[a.choice].push(a.username);
  }
  return { correctIndex: question.correctIndex, about: question.about, counts, names };
}

/**
 * Everything a player, the projector, or the host needs to render the current moment.
 * `join` registers the viewer as a player; the host and projector pass false so
 * they don't show up on the leaderboard or in the "answered" count.
 */
export async function buildClientState(viewer: string | null, join = true): Promise<TriviaClientState> {
  const [state, factsOpen, questions] = await Promise.all([
    getLiveGameState(),
    db.getTriviaFactsOpen(),
    db.getTriviaQuestions(),
  ]);

  const inGame = state.phase !== 'idle';
  // Anyone polling from the player view while a game is on is a player.
  if (inGame && viewer && join) await db.addTriviaPlayer(viewer);

  const [answers, players] = inGame
    ? await Promise.all([db.getTriviaAnswers(), db.getTriviaPlayers()])
    : [[], []];

  const index = state.questionId ? questions.findIndex((q) => q.id === state.questionId) : -1;
  const question = index >= 0 ? questions[index] : null;
  const showAnswers = state.phase === 'reveal' || state.phase === 'leaderboard' || state.phase === 'finished';
  const mine = question && viewer ? answers.find((a) => a.questionId === question.id && a.username === viewer) : null;

  return {
    phase: state.phase,
    factsOpen,
    questionNumber: index + 1,
    questionCount: questions.length,
    question: question ? { id: question.id, text: question.text, options: question.options } : null,
    questionSeconds: QUESTION_SECONDS,
    timeLeftMs: timeLeftMs(state),
    answeredCount: question ? answers.filter((a) => a.questionId === question.id).length : 0,
    players,
    myAnswer: mine ? { choice: mine.choice, elapsedMs: mine.elapsedMs } : null,
    reveal: question && showAnswers ? buildReveal(question, answers) : null,
    leaderboard: showAnswers ? computeLeaderboard(players, questions, answers) : null,
  };
}

export type HostAction = 'start' | 'next' | 'reveal' | 'leaderboard' | 'end' | 'reset';

/** Applies a host action; returns an error message when the action doesn't fit the phase. */
export async function applyHostAction(action: HostAction): Promise<string | null> {
  const state = await getLiveGameState();
  const questions = await db.getTriviaQuestions();

  switch (action) {
    case 'start': {
      if (questions.length === 0) return 'Add at least one question before starting.';
      await db.clearTriviaAnswers();
      await db.clearTriviaPlayers();
      await db.setTriviaGameState({ phase: 'lobby', questionId: null, startedAt: null });
      return null;
    }
    case 'next': {
      if (!['lobby', 'reveal', 'leaderboard'].includes(state.phase)) return 'Not ready for the next question yet.';
      const currentIndex = state.questionId ? questions.findIndex((q) => q.id === state.questionId) : -1;
      const nextQuestion = questions[currentIndex + 1];
      if (!nextQuestion) {
        await db.setTriviaGameState({ ...state, phase: 'finished' });
        return null;
      }
      await db.setTriviaGameState({ phase: 'question', questionId: nextQuestion.id, startedAt: new Date().toISOString() });
      return null;
    }
    case 'reveal': {
      if (state.phase !== 'question') return 'There is no question to reveal.';
      await db.setTriviaGameState({ ...state, phase: 'reveal' });
      return null;
    }
    case 'leaderboard': {
      if (state.phase !== 'reveal') return 'Reveal the answer first.';
      await db.setTriviaGameState({ ...state, phase: 'leaderboard' });
      return null;
    }
    case 'end': {
      if (state.phase === 'idle') return 'No game is running.';
      await db.setTriviaGameState({ ...state, phase: 'finished' });
      return null;
    }
    case 'reset': {
      await db.clearTriviaAnswers();
      await db.clearTriviaPlayers();
      await db.setTriviaGameState({ phase: 'idle', questionId: null, startedAt: null });
      return null;
    }
    default:
      return 'Unknown action.';
  }
}

/** Records a player's answer, replacing any earlier pick; returns an error message if it can't be accepted. */
export async function submitAnswer(username: string, questionId: string, choice: number): Promise<string | null> {
  const state = await getLiveGameState();
  if (state.phase !== 'question' || state.questionId !== questionId) return 'That question is no longer open.';

  const elapsed = elapsedSince(state.startedAt);
  if (elapsed > QUESTION_SECONDS * 1000 + GRACE_MS) return "Time's up!";

  const questions = await db.getTriviaQuestions();
  const question = questions.find((q) => q.id === questionId);
  if (!question) return 'Question not found.';
  if (!Number.isInteger(choice) || choice < 0 || choice >= question.options.length) return 'Invalid choice.';

  await db.addTriviaPlayer(username);
  await db.addTriviaAnswer({ questionId, username, choice, elapsedMs: Math.min(elapsed, QUESTION_SECONDS * 1000) });
  return null;
}
