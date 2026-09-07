/**
 * Builds the LLM prompt that turns the guests' submissions into trivia
 * questions in the import format (docs/trivia-questions-format.md).
 * Used by "Export facts" on the Submissions page.
 */

export type PromptSubmission = {
  name: string;
  hobby: string;
  selfFacts: string[];
  hobbyFacts: string[];
};

export const TRIVIA_PROMPT_INSTRUCTIONS = `You are writing questions for a small-group trivia game. Below are the guests, and for each guest a few facts about themselves and a few facts about one of their hobbies.

Write multiple-choice questions and output them ONLY as JSON in exactly this shape:

{
  "questions": [
    {
      "text": "<question text>",
      "options": "players",
      "about": "<guest name>"
    },
    {
      "text": "<question text>",
      "options": ["<choice>", "<choice>", "<choice>", "<choice>"],
      "answer": "<the correct choice, copied exactly from options>",
      "about": "<guest name>"
    }
  ]
}

Rules:
- For each guest, turn 2 of their personal facts into questions of the form "Who said: '<fact>'?" using "options": "players". Quote the fact verbatim in the question text. The guest who submitted it goes in "about".
- For each guest, turn 2 of their hobby facts into four-option questions. Make the three wrong choices plausible and the same length and style as the right one. Never reuse a wrong choice from another question. The guest whose hobby it is goes in "about".
- "about" and "answer" must match a guest name or option exactly as written.
- Shuffle the order so consecutive questions are about different guests.
- Use everyday language; each question text should fit on one projector line (under 100 characters).
- Output nothing but the JSON. No code fences, no commentary.`;

/** Renders the submissions as readable text for the prompt. */
export function formatFactsForPrompt(guests: string[], submissions: PromptSubmission[]): string {
  const lines: string[] = [`Guests (use these names exactly): ${guests.join(', ')}`, ''];
  for (const s of submissions) {
    lines.push(`## ${s.name}`);
    lines.push(`About ${s.name}:`);
    for (const f of s.selfFacts) lines.push(`- ${f}`);
    lines.push(`About ${s.name}'s hobby, ${s.hobby}:`);
    for (const f of s.hobbyFacts) lines.push(`- ${f}`);
    lines.push('');
  }
  return lines.join('\n').trimEnd();
}

export function buildTriviaPrompt(guests: string[], submissions: PromptSubmission[]): string {
  return `${TRIVIA_PROMPT_INSTRUCTIONS}\n\nGuests and facts:\n\n${formatFactsForPrompt(guests, submissions)}\n`;
}
