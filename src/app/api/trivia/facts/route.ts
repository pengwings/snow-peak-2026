import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { MIN_FACTS, MAX_FACTS } from '@/lib/triviaConfig';

function trimFacts(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((f) => (typeof f === 'string' ? f.trim() : '')).filter(Boolean);
}

function cleanFacts(value: unknown): string[] | null {
  const facts = trimFacts(value);
  if (facts.length < MIN_FACTS || facts.length > MAX_FACTS) return null;
  return facts;
}

/** Own submission for everyone; every submission (plus who hasn't) for admins. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [mine, open] = await Promise.all([db.getTriviaFacts(user.name), db.getTriviaFactsOpen()]);
  if (!user.isAdmin) return NextResponse.json({ mine, open });

  const [all, users] = await Promise.all([db.getAllTriviaFacts(), db.getUsers()]);
  const submitted = new Set(all.map((f) => f.username));
  const missing = users.map((u) => u.name).filter((name) => !submitted.has(name));
  return NextResponse.json({ mine, open, all, missing });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();

  // Admin edits bypass the open/closed gate and the minimum count, so a
  // submission can be trimmed or removed outright.
  if (body.action === 'adminUpdate' || body.action === 'adminDelete') {
    if (!user.isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    const username = typeof body.username === 'string' ? body.username : '';
    const existing = username ? await db.getTriviaFacts(username) : null;
    if (!existing) return NextResponse.json({ error: 'Submission not found' }, { status: 404 });

    if (body.action === 'adminDelete') {
      await db.deleteTriviaFacts(username);
    } else {
      const selfFacts = trimFacts(body.selfFacts).slice(0, MAX_FACTS);
      const hobbyFacts = trimFacts(body.hobbyFacts).slice(0, MAX_FACTS);
      const hobby = typeof body.hobby === 'string' ? body.hobby.trim() : existing.hobby;
      await db.saveTriviaFacts({ username, hobby, selfFacts, hobbyFacts, updatedAt: null });
    }
    return NextResponse.json({ success: true, all: await db.getAllTriviaFacts() });
  }

  if (!(await db.getTriviaFactsOpen())) {
    return NextResponse.json({ error: 'Fact submissions are closed.' }, { status: 409 });
  }
  const hobby = typeof body.hobby === 'string' ? body.hobby.trim() : '';
  const selfFacts = cleanFacts(body.selfFacts);
  const hobbyFacts = cleanFacts(body.hobbyFacts);

  if (!hobby) return NextResponse.json({ error: 'Tell us the hobby or interest.' }, { status: 400 });
  if (!selfFacts) return NextResponse.json({ error: `Give ${MIN_FACTS} to ${MAX_FACTS} facts about yourself.` }, { status: 400 });
  if (!hobbyFacts) return NextResponse.json({ error: `Give ${MIN_FACTS} to ${MAX_FACTS} facts about your hobby.` }, { status: 400 });

  await db.saveTriviaFacts({ username: user.name, hobby, selfFacts, hobbyFacts, updatedAt: null });
  return NextResponse.json({ success: true, mine: await db.getTriviaFacts(user.name) });
}
