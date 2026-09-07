import { NextResponse } from 'next/server';
import { db, TriviaQuestion } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { normalizeName } from '@/lib/nameMatch';

const MIN_OPTIONS = 2;
const MAX_OPTIONS = 20;

function parseQuestion(body: Record<string, unknown>): { question: Omit<TriviaQuestion, 'id' | 'position'> } | { error: string } {
  const text = typeof body.text === 'string' ? body.text.trim() : '';
  if (!text) return { error: 'Question text is required.' };

  const options = Array.isArray(body.options)
    ? body.options.map((o: unknown) => (typeof o === 'string' ? o.trim() : '')).filter(Boolean)
    : [];
  if (options.length < MIN_OPTIONS || options.length > MAX_OPTIONS) {
    return { error: `Give ${MIN_OPTIONS} to ${MAX_OPTIONS} answer options.` };
  }

  const correctIndex = body.correctIndex;
  if (typeof correctIndex !== 'number' || !Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex >= options.length) {
    return { error: 'Pick which option is correct.' };
  }

  const about = typeof body.about === 'string' && body.about.trim() ? body.about.trim() : null;
  return { question: { text, options, correctIndex, about } };
}


type ImportedQuestion = Omit<TriviaQuestion, 'id' | 'position'>;

/** Resolves a typed name to the canonical guest name, ignoring case/accents. */
function matchName(input: unknown, names: string[]): string | null {
  if (typeof input !== 'string' || !input.trim()) return null;
  const target = normalizeName(input);
  return names.find((n) => normalizeName(n) === target) ?? null;
}

/**
 * Parses a JSON document in the format described in
 * docs/trivia-questions-format.md. Returns every problem found so the whole
 * file can be fixed in one go; nothing is imported unless it is all valid.
 */
function parseImport(content: string, names: string[]): { questions: ImportedQuestion[] } | { errors: string[] } {
  let doc: unknown;
  try {
    doc = JSON.parse(content);
  } catch (e) {
    return { errors: [`Not valid JSON: ${(e as Error).message}`] };
  }

  const list = Array.isArray(doc)
    ? doc
    : doc && typeof doc === 'object' && Array.isArray((doc as { questions?: unknown }).questions)
      ? (doc as { questions: unknown[] }).questions
      : null;
  if (!list) return { errors: ['Expected a list of questions, or an object with a "questions" list.'] };
  if (list.length === 0) return { errors: ['The file has no questions.'] };

  const errors: string[] = [];
  const questions: ImportedQuestion[] = [];

  list.forEach((raw, i) => {
    const n = i + 1;
    if (!raw || typeof raw !== 'object') {
      errors.push(`Question ${n}: not an object.`);
      return;
    }
    const item = raw as Record<string, unknown>;
    const text = typeof item.text === 'string' ? item.text.trim() : typeof item.question === 'string' ? item.question.trim() : '';
    if (!text) {
      errors.push(`Question ${n}: missing "text".`);
      return;
    }

    let about: string | null = null;
    if (item.about !== undefined && item.about !== null && item.about !== '') {
      about = matchName(item.about, names);
      if (!about) {
        errors.push(`Question ${n}: "about" is "${String(item.about)}", which is not a guest. Guests: ${names.join(', ')}.`);
        return;
      }
    }

    // Options: an explicit list, or "players" (default) for every guest's name.
    let options: string[];
    const usesPlayers = item.options === undefined || item.options === 'players';
    if (usesPlayers) {
      options = [...names];
    } else if (Array.isArray(item.options)) {
      options = item.options.map((o) => (typeof o === 'string' ? o.trim() : String(o ?? '').trim())).filter(Boolean);
      if (options.length < MIN_OPTIONS || options.length > MAX_OPTIONS) {
        errors.push(`Question ${n}: needs ${MIN_OPTIONS}–${MAX_OPTIONS} options, has ${options.length}.`);
        return;
      }
    } else {
      errors.push(`Question ${n}: "options" must be a list or the word "players".`);
      return;
    }

    // Answer: option text, 0-based index, or (for player questions) the "about" guest.
    const rawAnswer = item.answer ?? item.correctIndex;
    let correctIndex = -1;
    if (rawAnswer === undefined || rawAnswer === null || rawAnswer === '') {
      if (usesPlayers && about) correctIndex = options.indexOf(about);
      else {
        errors.push(`Question ${n}: missing "answer".`);
        return;
      }
    } else if (typeof rawAnswer === 'number') {
      correctIndex = Number.isInteger(rawAnswer) ? rawAnswer : -1;
    } else if (typeof rawAnswer === 'string') {
      const target = normalizeName(rawAnswer);
      correctIndex = options.findIndex((o) => normalizeName(o) === target);
      // A numeric string like "2" is treated as an index if it isn't an option.
      if (correctIndex < 0 && /^\d+$/.test(rawAnswer.trim())) correctIndex = parseInt(rawAnswer, 10);
    }
    if (correctIndex < 0 || correctIndex >= options.length) {
      errors.push(`Question ${n}: answer "${String(rawAnswer)}" doesn't match any option.`);
      return;
    }

    questions.push({ text, options, correctIndex, about });
  });

  return errors.length ? { errors } : { questions };
}

/** Admin-only: questions include the correct answer, so never expose them to players. */
export async function GET() {
  const user = await getSessionUser();
  if (!user?.isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  return NextResponse.json(await db.getTriviaQuestions());
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user?.isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  const body = await request.json();
  const questions = await db.getTriviaQuestions();

  if (body.action === 'add') {
    const parsed = parseQuestion(body);
    if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const position = questions.length ? Math.max(...questions.map((q) => q.position)) + 1 : 0;
    await db.addTriviaQuestion({ id: Math.random().toString(36).substring(2, 9), position, ...parsed.question });
  } else if (body.action === 'edit') {
    const existing = questions.find((q) => q.id === body.questionId);
    if (!existing) return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    const parsed = parseQuestion(body);
    if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
    await db.updateTriviaQuestion({ ...existing, ...parsed.question });
  } else if (body.action === 'remove') {
    if (!questions.some((q) => q.id === body.questionId)) return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    await db.removeTriviaQuestion(body.questionId);
  } else if (body.action === 'import') {
    if (typeof body.content !== 'string' || !body.content.trim()) {
      return NextResponse.json({ error: 'Nothing to import.' }, { status: 400 });
    }
    const replace = body.mode === 'replace';
    if (replace && (await db.getTriviaGameState()).phase !== 'idle') {
      return NextResponse.json({ error: 'Cannot replace questions while a game is running.' }, { status: 409 });
    }
    const names = (await db.getUsers()).map((u) => u.name);
    const parsed = parseImport(body.content, names);
    if ('errors' in parsed) return NextResponse.json({ error: 'Fix these and try again.', errors: parsed.errors }, { status: 400 });

    if (replace) await db.removeAllTriviaQuestions();
    let position = replace || !questions.length ? 0 : Math.max(...questions.map((q) => q.position)) + 1;
    for (const q of parsed.questions) {
      await db.addTriviaQuestion({ id: Math.random().toString(36).substring(2, 9), position: position++, ...q });
    }
    return NextResponse.json({ success: true, imported: parsed.questions.length, questions: await db.getTriviaQuestions() });
  } else if (body.action === 'move') {
    // Swap positions with the neighbour in the requested direction.
    const index = questions.findIndex((q) => q.id === body.questionId);
    const target = index + (body.direction === 'up' ? -1 : 1);
    if (index < 0 || target < 0 || target >= questions.length) {
      return NextResponse.json({ error: 'Cannot move that question' }, { status: 400 });
    }
    // Re-number everything so positions stay dense and unique.
    const reordered = [...questions];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    await Promise.all(reordered.map((q, i) => db.updateTriviaQuestion({ ...q, position: i })));
  } else {
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  }

  return NextResponse.json({ success: true, questions: await db.getTriviaQuestions() });
}
