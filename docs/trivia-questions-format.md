# Trivia question import format

The **Trivia → Questions** page imports questions from a JSON file, or from JSON pasted into the box. The machine-readable schema is in [`trivia-questions.schema.json`](./trivia-questions.schema.json); **Export JSON** on the same page writes the current questions back out in this format.

## Shape

The root is an object with a `questions` list (a bare list is also accepted).

| Field     | Required | Meaning |
|-----------|----------|---------|
| `text`    | yes      | The question as shown on the projector and phones. |
| `options` | no       | A list of 2–20 answer choices, **or** the string `"players"` to use every guest's name (for "who said this?" questions). Defaults to `"players"` when omitted. |
| `answer`  | usually  | The correct choice, given as the option text (case-insensitive) or its 0-based index. When `options` is `"players"`, it defaults to `about`. |
| `about`   | no       | The guest the question is about, shown on the reveal. **Required** when `options` is `"players"`. Must match a guest's name (case and accents are ignored). |

Questions are imported in the order they appear. Choose **Append** to add them after the existing questions or **Replace all** to start over. Nothing is imported if any question fails validation; the page lists every problem by question number.

## Example

```json
{
  "questions": [
    {
      "text": "Who said: \"I once got lost in Tokyo for six hours\"?",
      "options": "players",
      "about": "Alice"
    },
    {
      "text": "What is climbing chalk mostly made of?",
      "options": ["Calcium", "Magnesium carbonate", "Talc", "Flour"],
      "answer": "Magnesium carbonate",
      "about": "Alice"
    },
    {
      "text": "Which of these is a real chess opening?",
      "options": ["The Bongcloud", "The Sandcastle", "The Lighthouse", "The Teapot"],
      "answer": 0,
      "about": "Bob"
    }
  ]
}
```

## Generating questions with an LLM

On the **Trivia → Submissions** page, click **Export facts**. That downloads `trivia-question-prompt.txt`: a complete prompt with the instructions below followed by every guest's facts and the list of guest names. (**Copy to clipboard instead** puts the same text on the clipboard.) Paste the whole file into an LLM as-is.

The prompt template lives in `src/lib/triviaPrompt.ts`; edit it there if you want different rules. For reference, the instructions it contains:

```text
You are writing questions for a small-group trivia game. Below are the guests, and for each guest a few facts about themselves and a few facts about one of their hobbies.

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
- Output nothing but the JSON. No code fences, no commentary.

Guests and facts:

Guests (use these names exactly): Alice, Bob, Brian

## Alice
About Alice:
- I once got lost in Tokyo for six hours
- …
About Alice's hobby, Climbing:
- Chalk is magnesium carbonate
- …
```

Save the model's reply as a `.json` file, or paste it straight into the import box on the Questions page. Review the list afterwards: every question can still be edited, reordered, or deleted before the game starts.
