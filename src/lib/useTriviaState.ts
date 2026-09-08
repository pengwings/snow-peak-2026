'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { TriviaClientState } from './trivia';

export type { TriviaClientState };

/**
 * Polls the trivia state endpoint and keeps a locally ticking countdown in
 * between polls, re-synced from the server on every response.
 *
 * The server stamps `timeLeftMs` before the response travels back, so by the
 * time it arrives the value is slightly stale (more so for the answer POST,
 * which writes to the database first). Each response is therefore an upper
 * bound on the real deadline; keeping the earliest deadline seen for the
 * current question means the clock never jumps back up.
 */
export function useTriviaState(intervalMs = 1000, spectator = false) {
  const [state, setState] = useState<TriviaClientState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [timeLeftMs, setTimeLeftMs] = useState(0);
  // Client-clock timestamp when the current question's clock hits zero.
  const deadlineRef = useRef<{ questionId: string | null; at: number }>({ questionId: null, at: 0 });

  const apply = useCallback((next: TriviaClientState) => {
    const questionId = next.phase === 'question' ? next.question?.id ?? null : null;
    const now = Date.now();
    const candidate = now + next.timeLeftMs;
    const prev = deadlineRef.current;
    const at = questionId && prev.questionId === questionId ? Math.min(prev.at, candidate) : candidate;
    deadlineRef.current = { questionId, at };
    setTimeLeftMs(questionId ? Math.max(0, at - now) : 0);
    setState(next);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/trivia/state${spectator ? '?spectator=1' : ''}`, { cache: 'no-store' });
      if (!res.ok) {
        setError(res.status === 401 ? 'unauthorized' : 'Could not load the game.');
        return;
      }
      apply(await res.json());
      setError(null);
    } catch {
      setError('Connection lost. Retrying…');
    }
  }, [apply, spectator]);

  useEffect(() => {
    let cancelled = false;
    const run = () => { if (!cancelled) refresh(); };
    const first = setTimeout(run, 0);
    const poll = setInterval(run, intervalMs);
    return () => {
      cancelled = true;
      clearTimeout(first);
      clearInterval(poll);
    };
  }, [refresh, intervalMs]);

  useEffect(() => {
    if (state?.phase !== 'question') return;
    const tick = setInterval(() => {
      setTimeLeftMs(Math.max(0, deadlineRef.current.at - Date.now()));
    }, 100);
    return () => clearInterval(tick);
  }, [state?.phase, state?.question?.id]);

  return { state, error, timeLeftMs, refresh, apply };
}
