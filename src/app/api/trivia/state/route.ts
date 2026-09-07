import { NextResponse } from 'next/server';
import { getSessionUser, isViewOnly } from '@/lib/auth';
import { buildClientState } from '@/lib/trivia';

export const dynamic = 'force-dynamic';

/**
 * Polled by every player, the projector, and the host (`?spectator=1` for the
 * last two). View-only visitors always get the spectator view: they can watch
 * but never join the player list or answer.
 */
export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    if (!(await isViewOnly())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const state = await buildClientState(null, false);
    return NextResponse.json(state, { headers: { 'Cache-Control': 'no-store' } });
  }

  const spectator = new URL(request.url).searchParams.get('spectator') === '1';
  const state = await buildClientState(user.name, !spectator);
  return NextResponse.json(state, { headers: { 'Cache-Control': 'no-store' } });
}
