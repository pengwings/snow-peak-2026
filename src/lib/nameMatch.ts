/**
 * Fuzzy name matching for login: case-insensitive, ignores accents and
 * extra whitespace, and tolerates small typos (e.g. "Brain" for "Brian").
 */

/** Lowercase, trim, collapse inner whitespace, and strip diacritics. */
export function normalizeName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

/**
 * Damerau–Levenshtein distance (optimal string alignment), so a swapped
 * pair of letters counts as one edit rather than two.
 */
function editDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const d: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(
        d[i - 1][j] + 1, // deletion
        d[i][j - 1] + 1, // insertion
        d[i - 1][j - 1] + cost // substitution
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1); // transposition
      }
    }
  }
  return d[m][n];
}

/** How many typos we tolerate. */
const MAX_TYPOS = 1;

/**
 * Finds the user the typed name most likely refers to.
 *
 * Returns the canonical name from `names` (so callers store the real name,
 * not the typo), or null when there is no close enough match or when two
 * different users are equally close (ambiguous — safer to reject).
 */
export function findMatchingName(input: string, names: string[]): string | null {
  const target = normalizeName(input);
  if (!target) return null;

  // Pass 1: exact match after normalization (case/accents/whitespace).
  for (const name of names) {
    if (normalizeName(name) === target) return name;
  }

  // Pass 2: closest name within the typo tolerance, if unambiguous.
  let best: string | null = null;
  let bestDistance = Infinity;
  let tied = false;

  for (const name of names) {
    const distance = editDistance(target, normalizeName(name));
    if (distance > MAX_TYPOS) continue;
    if (distance < bestDistance) {
      best = name;
      bestDistance = distance;
      tied = false;
    } else if (distance === bestDistance) {
      tied = true;
    }
  }

  return tied ? null : best;
}
