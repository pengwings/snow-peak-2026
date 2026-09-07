import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { applyHostAction, buildClientState, HostAction } from '@/lib/trivia';

const HOST_ACTIONS: HostAction[] = ['start', 'next', 'reveal', 'leaderboard', 'end', 'reset'];

/** Host controls: game phase transitions and opening/closing fact submissions. */
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user?.isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  const body = await request.json();

  if (body.action === 'setFactsOpen') {
    if (typeof body.open !== 'boolean') return NextResponse.json({ error: 'open must be a boolean' }, { status: 400 });
    await db.setTriviaFactsOpen(body.open);
    return NextResponse.json({ success: true, state: await buildClientState(user.name, false) });
  }

  if (!HOST_ACTIONS.includes(body.action)) {
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  }

  const error = await applyHostAction(body.action);
  const state = await buildClientState(user.name, false);
  if (error) return NextResponse.json({ error, state }, { status: 409 });
  return NextResponse.json({ success: true, state });
}
