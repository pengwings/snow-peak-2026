'use client';

import { displayName } from '@/lib/displayName';
import type { LeaderboardRow, RevealInfo } from '@/lib/trivia';

export const CORRECT = '#2d6a4f';
export const CORRECT_BG = '#edf7f0';
export const WRONG = '#a33';
export const WRONG_BG = '#f7ecea';

export const letter = (i: number) => String.fromCharCode(65 + i);

/** Shrinking bar plus seconds; turns red in the last five seconds. */
export function Countdown({ leftMs, totalSeconds, big = false }: { leftMs: number; totalSeconds: number; big?: boolean }) {
  const seconds = Math.ceil(leftMs / 1000);
  const fraction = Math.max(0, Math.min(1, leftMs / (totalSeconds * 1000)));
  const urgent = seconds <= 5;
  return (
    <div className="w-full">
      <div className="flex justify-between items-baseline mb-1">
        <span className={`${big ? 'text-base' : 'text-xs'} tracking-widest uppercase`} style={{ color: 'var(--muted)' }}>Time left</span>
        <span
          className={big ? 'text-6xl font-normal tabular-nums' : 'text-2xl font-normal tabular-nums'}
          style={{ fontFamily: 'EB Garamond, Georgia, serif', color: urgent ? WRONG : 'var(--foreground)' }}
        >
          {seconds}
        </span>
      </div>
      <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
        <div
          className="h-full rounded-full"
          style={{ width: `${fraction * 100}%`, background: urgent ? WRONG : 'var(--accent)', transition: 'width 100ms linear' }}
        />
      </div>
    </div>
  );
}

/** Reveal-phase bars: one per option, correct one highlighted, names underneath. */
export function RevealBars({
  options,
  reveal,
  myChoice,
  showNames,
  big = false,
}: {
  options: string[];
  reveal: RevealInfo;
  myChoice?: number | null;
  showNames: boolean;
  big?: boolean;
}) {
  const max = Math.max(1, ...reveal.counts);
  return (
    <div className="space-y-3">
      {options.map((option, i) => {
        const isCorrect = i === reveal.correctIndex;
        const isMine = myChoice === i;
        return (
          <div
            key={i}
            className={big ? 'p-4' : 'p-3'}
            style={{
              background: isCorrect ? CORRECT_BG : isMine ? WRONG_BG : 'var(--card)',
              border: `2px solid ${isCorrect ? CORRECT : isMine ? WRONG : 'var(--border)'}`,
            }}
          >
            <div className="flex items-center gap-3">
              <span
                className={`${big ? 'w-10 h-10 text-lg' : 'w-7 h-7 text-xs'} flex items-center justify-center rounded-full font-semibold shrink-0`}
                style={{ background: isCorrect ? CORRECT : 'var(--border)', color: isCorrect ? '#f5f0e8' : 'var(--foreground)' }}
              >
                {letter(i)}
              </span>
              <span className={`flex-1 ${big ? 'text-2xl' : 'text-base'}`} style={{ color: 'var(--foreground)' }}>
                {option}
                {isCorrect && <span className="ml-2 text-sm font-medium" style={{ color: CORRECT }}>✓ correct</span>}
                {isMine && !isCorrect && <span className="ml-2 text-sm font-medium" style={{ color: WRONG }}>your pick</span>}
              </span>
              <span className={`${big ? 'text-2xl' : 'text-sm'} tabular-nums font-medium`} style={{ color: 'var(--muted)' }}>
                {reveal.counts[i]}
              </span>
            </div>
            <div className="mt-2 h-2 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
              <div
                className="h-full rounded-full"
                style={{ width: `${(reveal.counts[i] / max) * 100}%`, background: isCorrect ? CORRECT : 'var(--muted)', transition: 'width 400ms ease' }}
              />
            </div>
            {showNames && reveal.names[i].length > 0 && (
              <p className={`mt-2 ${big ? 'text-base' : 'text-xs'}`} style={{ color: 'var(--muted)' }}>
                {reveal.names[i].map(displayName).join(', ')}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function formatSeconds(ms: number) {
  return `${(ms / 1000).toFixed(1)}s`;
}

export function Leaderboard({
  rows,
  me,
  big = false,
  limit,
}: {
  rows: LeaderboardRow[];
  me?: string | null;
  big?: boolean;
  limit?: number;
}) {
  const shown = limit ? rows.slice(0, limit) : rows;
  const medal = (rank: number) => (rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null);
  return (
    <div style={{ border: '1px solid var(--border)', background: 'var(--card)' }}>
      {shown.length === 0 && (
        <p className="p-4 text-sm italic" style={{ color: 'var(--muted)' }}>No players yet.</p>
      )}
      {shown.map((row, i) => {
        const isMe = me === row.name;
        return (
          <div
            key={row.name}
            className={`flex items-center gap-3 ${big ? 'px-6 py-3 text-2xl' : 'px-4 py-2.5 text-sm'}`}
            style={{
              borderTop: i === 0 ? 'none' : '1px solid var(--border)',
              background: isMe ? '#efe9dc' : 'transparent',
            }}
          >
            <span className={`${big ? 'w-12' : 'w-8'} tabular-nums`} style={{ color: 'var(--muted)' }}>
              {row.rank}.
            </span>
            <span className="flex-1 font-medium" style={{ color: 'var(--foreground)' }}>
              {displayName(row.name)}
              {medal(row.rank) && row.score > 0 && <span className="ml-2">{medal(row.rank)}</span>}
              {isMe && <span className="ml-2 text-xs font-normal" style={{ color: 'var(--muted)' }}>you</span>}
            </span>
            <span className={`${big ? 'text-base w-20' : 'text-xs w-16'} text-right tabular-nums`} style={{ color: 'var(--muted)' }} title="Total time on correct answers (tiebreak)">
              {formatSeconds(row.totalMs)}
            </span>
            <span className={`${big ? 'w-16' : 'w-10'} text-right tabular-nums font-semibold`} style={{ color: 'var(--foreground)' }}>
              {row.score}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function Panel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`p-6 ${className}`} style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
      {children}
    </div>
  );
}

export function SectionTitle({ children, color }: { children: React.ReactNode; color?: string }) {
  return (
    <h2 className="text-2xl font-normal mb-4" style={{ fontFamily: 'EB Garamond, Georgia, serif', color: color ?? 'var(--foreground)' }}>
      {children}
    </h2>
  );
}
