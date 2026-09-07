'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { TriviaQuestion } from '@/lib/db';
import { displayName } from '@/lib/displayName';
import { useTriviaState } from '@/lib/useTriviaState';
import { Countdown, Leaderboard, Panel, SectionTitle, letter, CORRECT, WRONG } from '@/components/trivia/TriviaShared';
import { apiFetch } from '@/lib/basePath';

type Action = 'start' | 'next' | 'reveal' | 'leaderboard' | 'end' | 'reset';

/** The host's phone: drives the game and shows the correct answer for the current question. */
export default function TriviaHostPage() {
  const router = useRouter();
  const [me, setMe] = useState<{ user: string | null; isAdmin: boolean } | null>(null);
  const { state, error, timeLeftMs, apply, refresh } = useTriviaState(1000, true);
  const [questions, setQuestions] = useState<TriviaQuestion[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    apiFetch('/api/me')
      .then((res) => res.json())
      .then((data) => {
        if (!data.user) router.push('/login');
        else setMe({ user: data.user, isAdmin: !!data.isAdmin });
      });
  }, [router]);

  const loadQuestions = useCallback(() => {
    apiFetch('/api/trivia/questions')
      .then((res) => (res.ok ? res.json() : []))
      .then(setQuestions);
  }, []);

  useEffect(() => {
    if (me?.isAdmin) loadQuestions();
  }, [me, loadQuestions]);

  const send = async (body: Record<string, unknown>) => {
    setBusy(true);
    setMessage(null);
    const res = await apiFetch('/api/trivia/game', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (data.state) apply(data.state);
    else refresh();
    if (!res.ok) setMessage(data.error || 'That didn’t work.');
    setBusy(false);
  };

  const act = (action: Action) => send({ action });

  if (!me || !state) return <div className="p-8" style={{ color: 'var(--muted)' }}>Loading…</div>;

  if (!me.isAdmin) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-12">
        <h1 className="text-4xl font-normal mb-4" style={{ fontFamily: 'EB Garamond, Georgia, serif' }}>Host controls</h1>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>Turn on admin mode from the navbar to host the game.</p>
      </div>
    );
  }

  const current = state.question ? questions.find((q) => q.id === state.question!.id) : undefined;
  const isLast = state.questionNumber >= state.questionCount;

  const button = (label: string, onClick: () => void, primary = false, danger = false) => (
    <button
      key={label}
      onClick={onClick}
      disabled={busy}
      className="px-5 py-3 text-sm tracking-widest uppercase disabled:opacity-50"
      style={
        primary
          ? { background: 'var(--accent)', color: '#f5f0e8', border: '1px solid var(--accent)' }
          : danger
            ? { color: WRONG, border: `1px solid ${WRONG}`, background: 'var(--card)' }
            : { color: 'var(--foreground)', border: '1px solid var(--border)', background: 'var(--card)' }
      }
    >
      {label}
    </button>
  );

  const confirmThen = (text: string, action: Action) => () => {
    if (window.confirm(text)) act(action);
  };

  const phaseLabel: Record<string, string> = {
    idle: 'Not started',
    lobby: 'Lobby',
    question: 'Question open',
    reveal: 'Answer revealed',
    leaderboard: 'Standings',
    finished: 'Finished',
  };

  let controls: React.ReactNode[] = [];
  if (state.phase === 'idle') {
    controls = [button(`Start game (${state.questionCount} questions)`, () => act('start'), true)];
  } else if (state.phase === 'lobby') {
    controls = [button('Start first question', () => act('next'), true)];
  } else if (state.phase === 'question') {
    controls = [button('Reveal now', () => act('reveal'), true)];
  } else if (state.phase === 'reveal') {
    controls = [
      button('Show standings', () => act('leaderboard'), true),
      button(isLast ? 'Finish game' : 'Next question', () => act('next')),
    ];
  } else if (state.phase === 'leaderboard') {
    controls = [button(isLast ? 'Finish game' : 'Next question', () => act('next'), true)];
  } else if (state.phase === 'finished') {
    controls = [button('Clear & start over', confirmThen('Clear all answers and return to the fact-collection screen?', 'reset'), false, true)];
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <h1 className="text-4xl font-normal mb-2" style={{ fontFamily: 'EB Garamond, Georgia, serif' }}>Host controls</h1>
      <div className="w-8 h-px mb-6" style={{ background: 'var(--border)' }} />
      <div className="flex flex-wrap gap-2 mb-8">
        <Link href="/trivia/submissions" className="px-3 py-1.5 text-xs tracking-widest uppercase" style={{ border: '1px solid var(--border)', color: 'var(--foreground)', background: 'var(--card)' }}>
          Submissions
        </Link>
        <Link href="/trivia/questions" className="px-3 py-1.5 text-xs tracking-widest uppercase" style={{ border: '1px solid var(--border)', color: 'var(--foreground)', background: 'var(--card)' }}>
          Questions
        </Link>
        <Link href="/trivia/board" target="_blank" className="px-3 py-1.5 text-xs tracking-widest uppercase" style={{ border: '1px solid var(--border)', color: 'var(--foreground)', background: 'var(--card)' }}>
          Open projector view ↗
        </Link>
        <Link href="/trivia" className="px-3 py-1.5 text-xs tracking-widest uppercase" style={{ border: '1px solid var(--border)', color: 'var(--foreground)', background: 'var(--card)' }}>
          Player view
        </Link>
      </div>

      {/* Status */}
      <Panel className="mb-6">
        <div className="flex justify-between items-baseline mb-1">
          <p className="text-xs tracking-widest uppercase" style={{ color: 'var(--muted)' }}>Status</p>
          {state.phase !== 'idle' && (
            <p className="text-xs tabular-nums" style={{ color: 'var(--muted)' }}>{state.players.length} players joined</p>
          )}
        </div>
        <p className="text-2xl font-normal mb-4" style={{ fontFamily: 'EB Garamond, Georgia, serif' }}>
          {phaseLabel[state.phase]}
          {state.question && state.phase !== 'idle' && (
            <span className="text-base ml-3" style={{ color: 'var(--muted)' }}>Q{state.questionNumber} of {state.questionCount}</span>
          )}
        </p>
        {state.phase === 'question' && (
          <>
            <div className="mb-3"><Countdown leftMs={timeLeftMs} totalSeconds={state.questionSeconds} /></div>
            <p className="text-sm mb-1" style={{ color: state.answeredCount >= state.players.length ? CORRECT : 'var(--foreground)' }}>
              {state.answeredCount} of {state.players.length} answered
              {state.answeredCount >= state.players.length && state.players.length > 0 ? ' · everyone’s in' : ''}
            </p>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>Reveals automatically when the clock runs out.</p>
          </>
        )}
        {state.phase === 'idle' && (
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            Starting clears any previous answers. Players open the Trivia tab and land in the lobby.
            {state.questionCount === 0 && <span style={{ color: WRONG }}> Add questions first.</span>}
          </p>
        )}
        <div className="flex flex-wrap gap-2 mt-5">{controls}</div>
        {message && <p className="text-sm mt-3" style={{ color: WRONG }}>{message}</p>}
      </Panel>

      {/* Current question with the answer, for the host's eyes */}
      {current && state.phase !== 'idle' && (
        <Panel className="mb-6">
          <p className="text-xs tracking-widest uppercase mb-2" style={{ color: 'var(--muted)' }}>Current question</p>
          <p className="text-lg mb-1">{current.text}</p>
          {current.about && <p className="text-xs mb-3" style={{ color: 'var(--muted)' }}>About {displayName(current.about)}</p>}
          <ul className="space-y-1 text-sm">
            {current.options.map((o, i) => (
              <li key={i} className="flex gap-2" style={{ color: i === current.correctIndex ? CORRECT : 'var(--foreground)' }}>
                <span className="font-semibold w-5">{letter(i)}</span>
                <span className="flex-1">{o}</span>
                {state.reveal && <span className="tabular-nums" style={{ color: 'var(--muted)' }}>{state.reveal.counts[i]}</span>}
                {i === current.correctIndex && <span>✓</span>}
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {state.leaderboard && (
        <div className="mb-6">
          <SectionTitle>Standings</SectionTitle>
          <Leaderboard rows={state.leaderboard} />
        </div>
      )}

      {/* Facts and danger zone */}
      <Panel>
        <p className="text-xs tracking-widest uppercase mb-2" style={{ color: 'var(--muted)' }}>Fact submissions</p>
        <p className="text-sm mb-3">
          {state.factsOpen ? 'Open: guests can still add and edit their facts.' : 'Closed: guests can see but not change their facts.'}
        </p>
        <div className="flex flex-wrap gap-2">
          {button(state.factsOpen ? 'Close submissions' : 'Reopen submissions', () => send({ action: 'setFactsOpen', open: !state.factsOpen }))}
          {state.phase !== 'idle' && state.phase !== 'finished' && (
            <>
              {button('End game now', confirmThen('End the game and show final standings?', 'end'), false, true)}
              {button('Abort & reset', confirmThen('Abort the game and clear all answers?', 'reset'), false, true)}
            </>
          )}
        </div>
      </Panel>
      {error && <p className="text-xs mt-4" style={{ color: WRONG }}>{error}</p>}
    </div>
  );
}
