import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { buildOnionData, recordOnionGame, validateAttempt, validateTime } from '@/lib/onion';

export const dynamic = 'force-dynamic';

/** Every scored attempt, the fastest time, and the best-per-player standings; readable by everyone. */
export async function GET() {
  return NextResponse.json(await buildOnionData(), { headers: { 'Cache-Control': 'no-store' } });
}

/** Admin only: save an analysed attempt for a player, set or clear its time, delete one, wipe the round, or record it as an Olympics game. */
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user?.isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  const body = await request.json();
  const { action } = body;

  if (action === 'save') {
    const knownUsers = new Set((await db.getUsers()).map((u) => u.name));
    const validated = validateAttempt(body, knownUsers);
    if ('error' in validated) return NextResponse.json({ error: validated.error }, { status: 400 });
    await db.addOnionAttempt({ id: Math.random().toString(36).substring(7), scoredBy: user.name, ...validated });
    return NextResponse.json({ success: true, ...(await buildOnionData()) });
  }

  if (action === 'setTime') {
    if (typeof body.id !== 'string') return NextResponse.json({ error: 'id required' }, { status: 400 });
    const time = validateTime(body.timeSeconds);
    if (typeof time === 'object' && time !== null) return NextResponse.json({ error: time.error }, { status: 400 });
    if (!(await db.setOnionAttemptTime(body.id, time))) return NextResponse.json({ error: 'That attempt no longer exists' }, { status: 404 });
    return NextResponse.json({ success: true, ...(await buildOnionData()) });
  }

  if (action === 'delete') {
    if (typeof body.id !== 'string') return NextResponse.json({ error: 'id required' }, { status: 400 });
    await db.removeOnionAttempt(body.id);
    return NextResponse.json({ success: true, ...(await buildOnionData()) });
  }

  if (action === 'clear') {
    await db.clearOnionAttempts();
    return NextResponse.json({ success: true, ...(await buildOnionData()) });
  }

  if (action === 'record') {
    const result = await recordOnionGame();
    if ('error' in result) return NextResponse.json({ error: result.error }, { status: 409 });
    return NextResponse.json({ success: true, game: result.game, ...(await buildOnionData()) });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
