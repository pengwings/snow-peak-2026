/** Shared trivia settings (safe to import from client components). */
export const MIN_FACTS = 3;
export const MAX_FACTS = 5;
/** Max characters per fact. */
export const MAX_FACT_LENGTH = 500;
/** How long players have to answer each question. */
export const QUESTION_SECONDS = 30;

/**
 * All-or-nothing: the picked set must equal the correct set. For single-answer
 * questions both sides have one element, so this is the usual equality check.
 */
export function isCorrectAnswer(correctIndexes: number[], choices: number[]): boolean {
  if (choices.length !== correctIndexes.length) return false;
  const correct = new Set(correctIndexes);
  return choices.every((c) => correct.has(c));
}
