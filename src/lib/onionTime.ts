/** Pure helpers for dice times; safe to import from client components. */

/** Share of the overall score that comes from speed; the rest is evenness. */
export const SPEED_WEIGHT = 0.5;

/** "1:05.3" → 65.3, "90" → 90, "1:05" → 65; null when blank, undefined when unparsable. */
export function parseTimeInput(raw: string): number | null | undefined {
  const text = raw.trim();
  if (!text) return null;
  const m = /^(?:(\d+):)?(\d+(?:\.\d+)?)$/.exec(text);
  if (!m) return undefined;
  const minutes = m[1] ? Number(m[1]) : 0;
  const seconds = Number(m[2]);
  if (m[1] && seconds >= 60) return undefined;
  const total = minutes * 60 + seconds;
  return total > 0 ? total : undefined;
}

/** 65.3 → "1:05.3", 90 → "1:30", 12.4 → "12.4s". */
export function formatTime(seconds: number): string {
  const rounded = Math.round(seconds * 10) / 10;
  if (rounded < 60) return `${rounded}s`;
  const m = Math.floor(rounded / 60);
  const s = rounded - m * 60;
  const whole = Math.floor(s);
  const tenths = Math.round((s - whole) * 10);
  return `${m}:${String(whole).padStart(2, '0')}${tenths ? `.${tenths}` : ''}`;
}
