'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { displayName } from '@/lib/displayName';
import TabVisibilityToggle from '@/components/TabVisibilityToggle';
import FactsForm from '@/components/trivia/FactsForm';
import { useTriviaState } from '@/lib/useTriviaState';
import {
  Countdown, Leaderboard, Panel, RevealBars, SectionTitle, letter, CORRECT, WRONG,
} from '@/components/trivia/TriviaShared';

export default function TriviaPage() {
  const router = useRouter();
  const [user, setUser] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const { state, error, timeLeftMs, apply } = useTriviaState(1500);
  const [submitting, setSubmitting] = useState<number | null>(null);
  const [answerError, setAnswerError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/me')
      .then((res) => res.json())
      .then((data) => {
        if (!data.user) router.push('/login');
        else {
          setUser(data.user);
          setIsAdmin(!!data.isAdmin);
        }
      });
  }, [router]);

  useEffect(() => {
    if (error === 'unauthorized') router.push('/login');
  }, [error, router]);

  const answer = async (choice: number) => {
    if (!state?.question || state.myAnswer || submitting !== null) return;
    setSubmitting(choice);
    setAnswerError(null);
    const res = await fetch('/api/trivia/answer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questionId: state.question.id, choice }),
    });
    const data = await res.json().catch(() => ({}));
    if (data.state) apply(data.state);
    if (!res.ok) setAnswerError(data.error || 'Could not submit your answer.');
    setSubmitting(null);
  };

  if (!user || !state) return <div className="p-8" style={{ color: 'var(--muted)' }}>Loading…</div>;

  const header = (
    <>
      <div className="flex items-center gap-3 mb-2">
        <h1 className="text-4xl font-normal" style={{ fontFamily: 'EB Garamond, Georgia, serif' }}>Trivia Game</h1>
        <TabVisibilityToggle />
      </div>
      <div className="w-8 h-px mb-6" style={{ background: 'var(--border)' }} />
      {isAdmin && (
        <div className="flex flex-wrap gap-2 mb-8">
          {[
            { href: '/trivia/host', label: 'Host controls' },
            { href: '/trivia/submissions', label: 'Submissions' },
            { href: '/trivia/questions', label: 'Questions' },
            { href: '/trivia/board', label: 'Projector view' },
          ].map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="px-3 py-1.5 text-xs tracking-widest uppercase"
              style={{ border: '1px solid var(--border)', color: 'var(--foreground)', background: 'var(--card)' }}
            >
              {l.label}
            </Link>
          ))}
        </div>
      )}
      {error && <p className="text-xs mb-4" style={{ color: WRONG }}>{error}</p>}
    </>
  );

  // Before the game: collect facts.
  if (state.phase === 'idle') {
    return (
      <div className="max-w-3xl mx-auto px-6 py-12">
        {header}
        <FactsForm />
      </div>
    );
  }

  const progress = state.questionCount
    ? <p className="text-xs tracking-widest uppercase mb-3" style={{ color: 'var(--muted)' }}>Question {state.questionNumber} of {state.questionCount}</p>
    : null;

  let body: React.ReactNode = null;

  if (state.phase === 'lobby') {
    body = (
      <Panel className="text-center">
        <SectionTitle>Get ready!</SectionTitle>
        <p className="text-sm mb-6" style={{ color: 'var(--muted)' }}>
          The host will start the first question shortly. Keep this screen open and watch the projector.
        </p>
        <p className="text-xs tracking-widest uppercase mb-2" style={{ color: 'var(--muted)' }}>
          {state.players.length} joined
        </p>
        <p className="text-sm" style={{ color: 'var(--foreground)' }}>{state.players.map(displayName).join(' · ')}</p>
      </Panel>
    );
  } else if (state.phase === 'question' && state.question) {
    const timeUp = timeLeftMs <= 0;
    const locked = !!state.myAnswer || timeUp;
    body = (
      <Panel>
        {progress}
        <div className="mb-5"><Countdown leftMs={timeLeftMs} totalSeconds={state.questionSeconds} /></div>
        <h2 className="text-2xl font-normal mb-6" style={{ fontFamily: 'EB Garamond, Georgia, serif' }}>{state.question.text}</h2>
        <div className="space-y-2">
          {state.question.options.map((option, i) => {
            const chosen = state.myAnswer?.choice === i || submitting === i;
            return (
              <button
                key={i}
                onClick={() => answer(i)}
                disabled={locked || submitting !== null}
                className="w-full text-left flex items-center gap-3 px-4 py-3 text-base transition-opacity disabled:cursor-default"
                style={{
                  background: chosen ? 'var(--accent)' : 'var(--background)',
                  color: chosen ? '#f5f0e8' : 'var(--foreground)',
                  border: `1px solid ${chosen ? 'var(--accent)' : 'var(--border)'}`,
                  opacity: locked && !chosen ? 0.45 : 1,
                }}
              >
                <span
                  className="w-7 h-7 flex items-center justify-center rounded-full text-xs font-semibold shrink-0"
                  style={{ background: chosen ? '#f5f0e8' : 'var(--border)', color: chosen ? 'var(--accent)' : 'var(--foreground)' }}
                >
                  {letter(i)}
                </span>
                {option}
              </button>
            );
          })}
        </div>
        <p className="mt-5 text-sm text-center" style={{ color: state.myAnswer ? CORRECT : 'var(--muted)' }}>
          {answerError
            ? <span style={{ color: WRONG }}>{answerError}</span>
            : state.myAnswer
              ? `Locked in ✓ · ${state.answeredCount} of ${state.players.length} answered`
              : timeUp
                ? "Time's up!"
                : 'Tap an answer. First tap counts.'}
        </p>
      </Panel>
    );
  } else if (state.phase === 'reveal' && state.question && state.reveal) {
    const mine = state.myAnswer;
    const correct = mine?.choice === state.reveal.correctIndex;
    body = (
      <Panel>
        {progress}
        <h2 className="text-2xl font-normal mb-2" style={{ fontFamily: 'EB Garamond, Georgia, serif' }}>{state.question.text}</h2>
        {state.reveal.about && (
          <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>About {displayName(state.reveal.about)}</p>
        )}
        <p className="text-lg font-medium mb-5" style={{ color: correct ? CORRECT : WRONG }}>
          {mine ? (correct ? `Correct! +1 (${(mine.elapsedMs / 1000).toFixed(1)}s)` : 'Not this time.') : 'You didn’t answer.'}
        </p>
        <RevealBars options={state.question.options} reveal={state.reveal} myChoice={mine?.choice ?? null} showNames={false} />
      </Panel>
    );
  } else if ((state.phase === 'leaderboard' || state.phase === 'finished') && state.leaderboard) {
    const myRow = state.leaderboard.find((r) => r.name === user);
    body = (
      <Panel>
        <SectionTitle>{state.phase === 'finished' ? 'Final standings' : 'Standings'}</SectionTitle>
        {myRow && (
          <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>
            You&apos;re in {myRow.rank}{myRow.rank === 1 ? 'st' : myRow.rank === 2 ? 'nd' : myRow.rank === 3 ? 'rd' : 'th'} place with {myRow.score} point{myRow.score === 1 ? '' : 's'}.
          </p>
        )}
        <Leaderboard rows={state.leaderboard} me={user} />
        {state.phase === 'finished' && (
          <p className="mt-6 text-sm text-center" style={{ color: 'var(--muted)' }}>Thanks for playing!</p>
        )}
      </Panel>
    );
  } else {
    body = (
      <Panel>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>Waiting for the host…</p>
      </Panel>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      {header}
      {body}
    </div>
  );
}
