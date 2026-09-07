'use client';

import { letter } from './TriviaShared';

const EXAMPLE = {
  hobby: 'Gunpla',
  selfFacts: [
    'I had a childhood pet that was a bunny named Max that my dad caught on the side of the road. I named him Max because I had a good friend named Max at school but now I think that was weird.',
    'I have been pulled over by the police 3 times but only got two tickets.',
    'I have never been to China.',
  ],
  hobbyFacts: [
    'Gunpla are sold in scales of 1/144, 1/100, 1/60, and 1/48',
    'The first gunpla was made in 1980',
    'Gunpla kits are made in Shizuoka',
  ],
};

/** Two of the facts above, as the questions Brian would write from them. */
const EXAMPLE_QUESTIONS: { from: string; text: string; options: string[] | 'players'; answer?: number }[] = [
  {
    from: EXAMPLE.selfFacts[2],
    text: 'Who said: "I have never been to China"?',
    options: 'players',
  },
  {
    from: EXAMPLE.hobbyFacts[1],
    text: 'What year was the first Gunpla kit released?',
    options: ['1974', '1980', '1985', '1991'],
    answer: 1,
  },
];

const label = (text: string) => (
  <p className="text-xs tracking-widest uppercase mb-2" style={{ color: 'var(--muted)' }}>{text}</p>
);

/**
 * A collapsed sample submission, plus how two of those facts become
 * questions, so guests know they only need to supply plain facts.
 */
export default function ExampleFacts({ className = '' }: { className?: string }) {
  return (
    <details className={`group ${className}`}>
      <summary
        className="cursor-pointer select-none text-xs tracking-widest uppercase list-none flex items-center gap-2"
        style={{ color: 'var(--muted)' }}
      >
        <span className="inline-block transition-transform group-open:rotate-90" aria-hidden>▸</span>
        See an example
      </summary>
      <div className="mt-3 p-4" style={{ background: 'var(--background)', border: '1px solid var(--border)' }}>
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            {label('Facts not many people know about me')}
            <ol className="list-decimal pl-5 space-y-1 text-sm" style={{ color: 'var(--foreground)' }}>
              {EXAMPLE.selfFacts.map((f, i) => <li key={i}>{f}</li>)}
            </ol>
          </div>
          <div>
            {label(`Facts about a hobby I'm into: ${EXAMPLE.hobby}`)}
            <ol className="list-decimal pl-5 space-y-1 text-sm" style={{ color: 'var(--foreground)' }}>
              {EXAMPLE.hobbyFacts.map((f, i) => <li key={i}>{f}</li>)}
            </ol>
          </div>
        </div>

        <div className="my-5 h-px" style={{ background: 'var(--border)' }} />

        {label('What Brian turns them into')}
        <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>
          You never write the questions or the wrong answers. That&apos;s Brian&apos;s job. Two of the facts above would become:
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          {EXAMPLE_QUESTIONS.map((q) => (
            <div key={q.text} className="p-3" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
              <p className="text-xs mb-2 italic" style={{ color: 'var(--muted)' }}>From: “{q.from}”</p>
              <p className="text-base mb-3" style={{ fontFamily: 'EB Garamond, Georgia, serif', color: 'var(--foreground)' }}>{q.text}</p>
              {q.options === 'players' ? (
                <p className="text-xs" style={{ color: 'var(--muted)' }}>Choices: everyone on the trip. Guess who said it.</p>
              ) : (
                <ul className="space-y-1">
                  {q.options.map((o, i) => {
                    const correct = i === q.answer;
                    return (
                      <li key={o} className="flex items-center gap-2 text-sm" style={{ color: 'var(--foreground)' }}>
                        <span
                          className="w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-semibold shrink-0"
                          style={{ background: correct ? '#2d6a4f' : 'var(--border)', color: correct ? '#f5f0e8' : 'var(--foreground)' }}
                        >
                          {letter(i)}
                        </span>
                        {o}
                        {correct && <span className="text-xs" style={{ color: '#2d6a4f' }}>✓ from your fact</span>}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          ))}
        </div>
      </div>
    </details>
  );
}
