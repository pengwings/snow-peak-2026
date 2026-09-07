import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { buildRankingsData, importTriviaGame, validateResults } from '@/lib/rankings';

export const dynamic = 'force-dynamic';

/** Standings and every recorded game; readable by everyone, including view-only visitors. */
export async function GET() {
  return NextResponse.json(await buildRankingsData(), { headers: { 'Cache-Control': 'no-store' } });
}

/** Admin only: record, edit, or delete a game, or import the finished trivia game. */
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user?.isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  const body = await request.json();
  const { action } = body;

  if (action === 'importTrivia') {
    const name = typeof body.name === 'string' && body.name.trim() ? body.name.trim() : 'Trivia';
    const result = await importTriviaGame(name);
    if ('error' in result) return NextResponse.json({ error: result.error }, { status: 409 });
    return NextResponse.json({ success: true, game: result.game, ...(await buildRankingsData()) });
  }

  if (action === 'create' || action === 'update') {
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name) return NextResponse.json({ error: 'Give the game a name' }, { status: 400 });
    const knownUsers = new Set((await db.getUsers()).map((u) => u.name));
    const validated = validateResults(body.results, knownUsers);
    if ('error' in validated) return NextResponse.json({ error: validated.error }, { status: 400 });

    if (action === 'create') {
      await db.addGame({ id: Math.random().toString(36).substring(7), name, source: 'manual', results: validated.results });
    } else {
      const games = await db.getGames();
      if (!games.some((g) => g.id === body.id)) return NextResponse.json({ error: 'Game not found' }, { status: 404 });
      await db.updateGame(body.id, name, validated.results);
    }
    return NextResponse.json({ success: true, ...(await buildRankingsData()) });
  }

  if (action === 'delete') {
    if (typeof body.id !== 'string') return NextResponse.json({ error: 'id required' }, { status: 400 });
    await db.removeGame(body.id);
    return NextResponse.json({ success: true, ...(await buildRankingsData()) });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
