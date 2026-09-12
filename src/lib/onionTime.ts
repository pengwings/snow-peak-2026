/** Pure helpers for dice times; safe to import from client components. */

/** Share of the overall score that comes from speed; the rest is evenness. */
export const SPEED_WEIGHT = 0.5;

/** "1:05.312" → 65.312, "90.5" → 90.5, "1:05" → 65; null when blank, undefined when unparsable. Kept to the millisecond. */
export function parseTimeInput(raw: string): number | null | undefined {
  const text = raw.trim();
  if (!text) return null;
  const m = /^(?:(\d+):)?(\d+(?:[.,]\d+)?)$/.exec(text);
  if (!m) return undefined;
  const minutes = m[1] ? Number(m[1]) : 0;
  const seconds = Number(m[2].replace(',', '.'));
  if (m[1] && seconds >= 60) return undefined;
  const total = Math.round((minutes * 60 + seconds) * 1000) / 1000;
  return total > 0 ? total : undefined;
}

/** Milliseconds always shown, so times line up: 65.312 → "1:05.312", 90 → "1:30.000", 12.4 → "12.400s". */
export function formatTime(seconds: number): string {
  const ms = Math.round(seconds * 1000);
  const m = Math.floor(ms / 60000);
  const s = ((ms % 60000) / 1000).toFixed(3);
  if (m === 0) return `${s}s`;
  return `${m}:${s.padStart(6, '0')}`;
}

/** Seconds → what the time field expects ("1:05.312" or "42.7"), with no trailing zeros. */
export function formatTimeInput(seconds: number): string {
  const ms = Math.round(seconds * 1000);
  const m = Math.floor(ms / 60000);
  const s = ((ms % 60000) / 1000).toFixed(3).replace(/\.?0+$/, '');
  if (m === 0) return s;
  return `${m}:${Number(s) < 10 ? '0' : ''}${s}`;
}
