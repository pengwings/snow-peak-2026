import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { buildClientState, submitAnswer } from '@/lib/trivia';

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { questionId, choice } = await request.json();
  if (typeof questionId !== 'string' || typeof choice !== 'number') {
    return NextResponse.json({ error: 'questionId and choice are required' }, { status: 400 });
  }

  const error = await submitAnswer(user.name, questionId, choice);
  const state = await buildClientState(user.name);
  if (error) return NextResponse.json({ error, state }, { status: 409 });
  return NextResponse.json({ success: true, state });
}
