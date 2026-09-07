import type { FoodIdea } from './db';

/** Votes needed for a food idea to count as agreed upon (mirrors activities). */
export const FOOD_AGREED_THRESHOLD = 3;

/** Agreed upon by vote, or promoted straight to the menu by an admin. */
export function isFoodApproved(idea: Pick<FoodIdea, 'promoted' | 'votes'>) {
  return idea.promoted || idea.votes.length >= FOOD_AGREED_THRESHOLD;
}
