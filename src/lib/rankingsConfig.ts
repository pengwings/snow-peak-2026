/** Shared rankings settings (safe to import from client components). */

/**
 * Points awarded for each finishing place, Mario Kart 8 Grand Prix style:
 * 1st gets 15, 2nd 12, 3rd 10, then one fewer per place down to 12th (1).
 * Anyone who finishes below 12th still earns a point for playing.
 */
export const GRAND_PRIX_POINTS = [15, 12, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
export const PARTICIPATION_POINTS = 1;

/** Points for a 1-based finishing place; ties all receive the shared place's points. */
export function pointsForPlace(place: number): number {
  if (!Number.isInteger(place) || place < 1) return 0;
  return GRAND_PRIX_POINTS[place - 1] ?? PARTICIPATION_POINTS;
}

export function ordinal(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1: return `${n}st`;
    case 2: return `${n}nd`;
    case 3: return `${n}rd`;
    default: return `${n}th`;
  }
}
