'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { displayName } from '@/lib/displayName';
import { useTriviaState } from '@/lib/useTriviaState';
import { Countdown, Leaderboard, RevealBars, letter, CORRECT } from '@/components/trivia/TriviaShared';

/**
 * Projector view: big type, no buttons. Log in on the projector laptop and
 * leave this page open; it follows the host's controls on its own.
 */
export default function TriviaBoardPage() {
  const router = useRouter();
  const { state, error, timeLeftMs } = useTriviaState(1000, true);

  useEffect(() => {
    if (error === 'unauthorized') router.push('/login');
  }, [error, router]);

  const brand = (
    <p className="text-sm tracking-[0.3em] uppercase mb-6" style={{ color: 'var(--muted)' }}>
      Snow Peak 2026 · Trivia Game
    </p>
  );

  if (!state) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ color: 'var(--muted)' }}>
        {error ?? 'Loading…'}
      </div>
    );
  }

  let content: React.ReactNode;

  if (state.phase === 'idle') {
    content = (
      <div className="text-center">
        {brand}
        <h1 className="text-7xl font-normal mb-6" style={{ fontFamily: 'EB Garamond, Georgia, serif' }}>Trivia Game</h1>
        <p className="text-2xl" style={{ color: 'var(--muted)' }}>Waiting for the host to start the game.</p>
      </div>
    );
  } else if (state.phase === 'lobby') {
    content = (
      <div className="text-center">
        {brand}
        <h1 className="text-7xl font-normal mb-4" style={{ fontFamily: 'EB Garamond, Georgia, serif' }}>Get ready!</h1>
        <p className="text-2xl mb-10" style={{ color: 'var(--muted)' }}>
          Open the Trivia tab on your phone. {state.questionCount} questions, {state.questionSeconds} seconds each.
        </p>
        <p className="text-sm tracking-widest uppercase mb-4" style={{ color: 'var(--muted)' }}>{state.players.length} joined</p>
        <div className="flex flex-wrap justify-center gap-3 max-w-4xl mx-auto">
          {state.players.map((p) => (
            <span key={p} className="px-5 py-2 text-2xl" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
              {displayName(p)}
            </span>
          ))}
        </div>
      </div>
    );
  } else if (state.phase === 'question' && state.question) {
    const timeUp = timeLeftMs <= 0;
    const many = state.question.options.length > 6;
    content = (
      <div className="w-full max-w-6xl">
        <div className="flex justify-between items-baseline mb-6">
          <p className="text-lg tracking-widest uppercase" style={{ color: 'var(--muted)' }}>
            Question {state.questionNumber} of {state.questionCount}
          </p>
          <p className="text-lg tabular-nums" style={{ color: 'var(--muted)' }}>
            {state.answeredCount} of {state.players.length} answered
          </p>
        </div>
        <div className="mb-8"><Countdown leftMs={timeLeftMs} totalSeconds={state.questionSeconds} big /></div>
        <h1 className="text-5xl leading-tight font-normal mb-10" style={{ fontFamily: 'EB Garamond, Georgia, serif' }}>{state.question.text}</h1>
        <div className={`grid gap-4 ${many ? 'grid-cols-3' : 'grid-cols-2'}`}>
          {state.question.options.map((option, i) => (
            <div
              key={i}
              className={`flex items-center gap-4 ${many ? 'px-5 py-3 text-2xl' : 'px-6 py-5 text-3xl'}`}
              style={{ background: 'var(--card)', border: '1px solid var(--border)', opacity: timeUp ? 0.6 : 1 }}
            >
              <span
                className={`${many ? 'w-10 h-10 text-lg' : 'w-12 h-12 text-xl'} flex items-center justify-center rounded-full font-semibold shrink-0`}
                style={{ background: 'var(--accent)', color: '#f5f0e8' }}
              >
                {letter(i)}
              </span>
              {option}
            </div>
          ))}
        </div>
        {timeUp && (
          <p className="mt-8 text-3xl text-center" style={{ fontFamily: 'EB Garamond, Georgia, serif', color: 'var(--muted)' }}>Time&apos;s up!</p>
        )}
      </div>
    );
  } else if (state.phase === 'reveal' && state.question && state.reveal) {
    content = (
      <div className="w-full max-w-5xl">
        <p className="text-lg tracking-widest uppercase mb-4" style={{ color: 'var(--muted)' }}>
          Question {state.questionNumber} of {state.questionCount}
        </p>
        <h1 className="text-4xl leading-tight font-normal mb-2" style={{ fontFamily: 'EB Garamond, Georgia, serif' }}>{state.question.text}</h1>
        {state.reveal.about && (
          <p className="text-2xl mb-6" style={{ color: CORRECT }}>About {displayName(state.reveal.about)}</p>
        )}
        <div className={state.reveal.about ? '' : 'mt-6'}>
          <RevealBars options={state.question.options} reveal={state.reveal} showNames big />
        </div>
      </div>
    );
  } else if ((state.phase === 'leaderboard' || state.phase === 'finished') && state.leaderboard) {
    const winner = state.leaderboard[0];
    content = (
      <div className="w-full max-w-3xl">
        <div className="text-center mb-8">
          {brand}
          <h1 className="text-6xl font-normal" style={{ fontFamily: 'EB Garamond, Georgia, serif' }}>
            {state.phase === 'finished' ? 'Final standings' : `Standings after question ${state.questionNumber}`}
          </h1>
          {state.phase === 'finished' && winner && winner.score > 0 && (
            <p className="text-3xl mt-4" style={{ color: CORRECT }}>🏆 {displayName(winner.name)} wins!</p>
          )}
        </div>
        <Leaderboard rows={state.leaderboard} big />
      </div>
    );
  } else {
    content = <p className="text-2xl" style={{ color: 'var(--muted)' }}>Waiting for the host…</p>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-12 py-10" style={{ background: 'var(--background)' }}>
      {content}
      {error && (
        <p className="fixed bottom-4 right-6 text-sm" style={{ color: '#a33' }}>{error}</p>
      )}
    </div>
  );
}
