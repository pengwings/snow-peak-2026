'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { TriviaClientState } from './trivia';

export type { TriviaClientState };

/**
 * Polls the trivia state endpoint and keeps a locally ticking countdown in
 * between polls, re-synced from the server on every response.
 */
export function useTriviaState(intervalMs = 1500, spectator = false) {
  const [state, setState] = useState<TriviaClientState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [timeLeftMs, setTimeLeftMs] = useState(0);
  // When the last server time-left was received, so the local clock can extrapolate.
  const syncRef = useRef<{ at: number; leftMs: number }>({ at: 0, leftMs: 0 });

  const apply = useCallback((next: TriviaClientState) => {
    syncRef.current = { at: Date.now(), leftMs: next.timeLeftMs };
    setTimeLeftMs(next.timeLeftMs);
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
      const { at, leftMs } = syncRef.current;
      setTimeLeftMs(Math.max(0, leftMs - (Date.now() - at)));
    }, 100);
    return () => clearInterval(tick);
  }, [state?.phase, state?.question?.id]);

  return { state, error, timeLeftMs, refresh, apply };
}
