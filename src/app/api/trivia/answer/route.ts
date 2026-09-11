import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { buildClientState, submitAnswer } from '@/lib/trivia';

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // `choices` is the full current selection; `choice` (a single number) is still accepted.
  const { questionId, choice, choices } = await request.json();
  const selection: unknown = Array.isArray(choices) ? choices : typeof choice === 'number' ? [choice] : null;
  if (typeof questionId !== 'string' || !Array.isArray(selection) || !selection.every((c) => typeof c === 'number')) {
    return NextResponse.json({ error: 'questionId and choices are required' }, { status: 400 });
  }

  const error = await submitAnswer(user.name, questionId, selection as number[]);
  const state = await buildClientState(user.name);
  if (error) return NextResponse.json({ error, state }, { status: 409 });
  return NextResponse.json({ success: true, state });
}
