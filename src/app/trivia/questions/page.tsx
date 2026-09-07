'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Upload } from 'lucide-react';
import type { TriviaQuestion, User } from '@/lib/db';
import { displayName } from '@/lib/displayName';
import { Panel, SectionTitle, letter, CORRECT, WRONG } from '@/components/trivia/TriviaShared';

type Draft = { text: string; options: string[]; correctIndex: number; about: string };
const emptyDraft = (): Draft => ({ text: '', options: ['', '', '', ''], correctIndex: 0, about: '' });

function SmallButton({ label, onClick, disabled, danger }: { label: string; onClick: () => void; disabled?: boolean; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="px-2.5 py-1 text-[11px] tracking-widest uppercase disabled:opacity-30"
      style={{ border: `1px solid ${danger ? WRONG : 'var(--border)'}`, color: danger ? WRONG : 'var(--foreground)', background: 'var(--background)' }}
    >
      {label}
    </button>
  );
}

const IMPORT_EXAMPLE = `{
  "questions": [
    { "text": "Who said: \\"I once got lost in Tokyo for six hours\\"?", "options": "players", "about": "Alice" },
    {
      "text": "What is climbing chalk mostly made of?",
      "options": ["Calcium", "Magnesium carbonate", "Talc", "Flour"],
      "answer": "Magnesium carbonate",
      "about": "Alice"
    }
  ]
}
"options": "players" means every guest's name, with "about" as the answer.`;

/** Admin page: write, import, and order the questions. */
export default function TriviaQuestionsPage() {
  const router = useRouter();
  const [me, setMe] = useState<{ user: string | null; isAdmin: boolean } | null>(null);
  const [questions, setQuestions] = useState<TriviaQuestion[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);
  const [importText, setImportText] = useState('');
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importNotice, setImportNotice] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importFileName, setImportFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/me')
      .then((res) => res.json())
      .then((data) => {
        if (!data.user) router.push('/login');
        else setMe({ user: data.user, isAdmin: !!data.isAdmin });
      });
  }, [router]);

  const loadAll = useCallback(() => {
    fetch('/api/trivia/questions').then((res) => (res.ok ? res.json() : [])).then(setQuestions);
    fetch('/api/users').then((res) => res.json()).then(setUsers);
  }, []);

  useEffect(() => {
    if (me?.isAdmin) loadAll();
  }, [me, loadAll]);

  const post = async (body: Record<string, unknown>) => {
    const res = await fetch('/api/trivia/questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (data.questions) setQuestions(data.questions);
    return { ok: res.ok, error: data.error as string | undefined };
  };

  const scrollToForm = () => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const startNew = () => {
    setEditingId(null);
    setDraft(emptyDraft());
    setFormError(null);
  };

  const startEdit = (q: TriviaQuestion) => {
    setEditingId(q.id);
    setDraft({ text: q.text, options: [...q.options], correctIndex: q.correctIndex, about: q.about ?? '' });
    setFormError(null);
    scrollToForm();
  };

  const readImportFile = (file: File | undefined) => {
    if (!file) return;
    file.text().then((text) => {
      setImportText(text);
      setImportFileName(file.name);
      setImportErrors([]);
      setImportNotice(null);
    });
  };

  const runImport = async () => {
    if (!importText.trim()) return;
    if (importMode === 'replace' && questions.length > 0 && !window.confirm(`Replace all ${questions.length} existing questions?`)) return;
    setImporting(true);
    setImportErrors([]);
    setImportNotice(null);
    const res = await fetch('/api/trivia/questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'import', content: importText, mode: importMode }),
    });
    const data = await res.json().catch(() => ({}));
    setImporting(false);
    if (data.questions) setQuestions(data.questions);
    if (!res.ok) {
      setImportErrors(data.errors ?? [data.error || 'Import failed.']);
      return;
    }
    setImportNotice(`Imported ${data.imported} question${data.imported === 1 ? '' : 's'}.`);
    setImportText('');
    setImportFileName(null);
  };

  /** Downloads the current questions in the import format, so they can be edited or re-imported. */
  const exportJson = () => {
    const payload = {
      questions: questions.map((q) => ({
        text: q.text,
        options: q.options,
        answer: q.options[q.correctIndex],
        ...(q.about ? { about: q.about } : {}),
      })),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'trivia-questions.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    // Drop blank options but keep the correct one pointing at the same text.
    const correctText = draft.options[draft.correctIndex]?.trim();
    const options = draft.options.map((o) => o.trim()).filter(Boolean);
    const correctIndex = options.indexOf(correctText);
    const result = await post({
      action: editingId ? 'edit' : 'add',
      questionId: editingId,
      text: draft.text,
      options,
      correctIndex,
      about: draft.about || null,
    });
    setSaving(false);
    if (!result.ok) {
      setFormError(result.error || 'Could not save.');
      return;
    }
    startNew();
  };

  const remove = async (q: TriviaQuestion) => {
    if (!window.confirm(`Delete “${q.text}”?`)) return;
    await post({ action: 'remove', questionId: q.id });
    if (editingId === q.id) startNew();
  };

  const move = (q: TriviaQuestion, direction: 'up' | 'down') => post({ action: 'move', questionId: q.id, direction });

  const setOption = (i: number, value: string) => {
    const options = [...draft.options];
    options[i] = value;
    setDraft({ ...draft, options });
  };
  const removeOption = (i: number) => {
    const options = draft.options.filter((_, j) => j !== i);
    const correctIndex = draft.correctIndex === i ? 0 : draft.correctIndex > i ? draft.correctIndex - 1 : draft.correctIndex;
    setDraft({ ...draft, options, correctIndex });
  };

  if (!me) return <div className="p-8" style={{ color: 'var(--muted)' }}>Loading…</div>;

  if (!me.isAdmin) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-12">
        <h1 className="text-4xl font-normal mb-4" style={{ fontFamily: 'EB Garamond, Georgia, serif' }}>Questions</h1>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>Turn on admin mode from the navbar to edit questions.</p>
      </div>
    );
  }


  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <h1 className="text-4xl font-normal mb-2" style={{ fontFamily: 'EB Garamond, Georgia, serif' }}>Questions</h1>
      <div className="w-8 h-px mb-6" style={{ background: 'var(--border)' }} />
      <div className="flex flex-wrap gap-2 mb-8">
        <Link href="/trivia/host" className="px-3 py-1.5 text-xs tracking-widest uppercase" style={{ border: '1px solid var(--border)', color: 'var(--foreground)', background: 'var(--card)' }}>
          Host controls
        </Link>
        <Link href="/trivia/submissions" className="px-3 py-1.5 text-xs tracking-widest uppercase" style={{ border: '1px solid var(--border)', color: 'var(--foreground)', background: 'var(--card)' }}>
          Submissions
        </Link>
        <Link href="/trivia" className="px-3 py-1.5 text-xs tracking-widest uppercase" style={{ border: '1px solid var(--border)', color: 'var(--foreground)', background: 'var(--card)' }}>
          Player view
        </Link>
      </div>

      <div className="space-y-8">
          <div ref={formRef}>
            <Panel>
              <div className="flex justify-between items-baseline mb-4">
                <SectionTitle>{editingId ? 'Edit question' : 'New question'}</SectionTitle>
                {editingId && <SmallButton label='New instead' onClick={startNew} />}
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <textarea
                  required
                  rows={2}
                  className="w-full border-gray-400 rounded-md shadow-sm border px-3 py-2 resize-none text-gray-900 placeholder-gray-500"
                  placeholder="Question text"
                  value={draft.text}
                  onChange={(e) => setDraft({ ...draft, text: e.target.value })}
                />
                <div>
                  <p className="text-xs tracking-widest uppercase mb-2" style={{ color: 'var(--muted)' }}>Options · tick the correct one</p>
                  <div className="space-y-2">
                    {draft.options.map((option, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="correct"
                          checked={draft.correctIndex === i}
                          onChange={() => setDraft({ ...draft, correctIndex: i })}
                          title="Correct answer"
                        />
                        <span className="w-5 text-xs font-semibold" style={{ color: 'var(--muted)' }}>{letter(i)}</span>
                        <input
                          type="text"
                          className="flex-1 border-gray-400 rounded-md shadow-sm border px-3 py-1.5 text-sm text-gray-900 placeholder-gray-500"
                          placeholder={`Option ${letter(i)}`}
                          value={option}
                          onChange={(e) => setOption(i, e.target.value)}
                        />
                        <SmallButton label='×' onClick={() => removeOption(i)} disabled={draft.options.length <= 2} />
                      </div>
                    ))}
                  </div>
                  <div className="mt-2">
                    <SmallButton label='+ Add option' onClick={() => setDraft({ ...draft, options: [...draft.options, ''] })} disabled={draft.options.length >= 20} />
                  </div>
                </div>
                <div>
                  <label className="text-xs tracking-widest uppercase block mb-1" style={{ color: 'var(--muted)' }}>About (optional, shown on the reveal)</label>
                  <select
                    className="w-full border-gray-400 rounded-md shadow-sm border px-3 py-2 text-sm text-gray-900"
                    value={draft.about}
                    onChange={(e) => setDraft({ ...draft, about: e.target.value })}
                  >
                    <option value="">Nobody in particular</option>
                    {users.map((u) => <option key={u.name} value={u.name}>{displayName(u.name)}</option>)}
                  </select>
                </div>
                {formError && <p className="text-sm" style={{ color: WRONG }}>{formError}</p>}
                <div className="flex gap-3">
                  <button type="submit" disabled={saving} className="px-6 py-2 text-sm tracking-widest uppercase disabled:opacity-50" style={{ background: 'var(--accent)', color: '#f5f0e8' }}>
                    {saving ? 'Saving…' : editingId ? 'Save changes' : 'Add question'}
                  </button>
                  {editingId && (
                    <button type="button" onClick={startNew} className="px-6 py-2 text-sm tracking-widest uppercase" style={{ color: 'var(--muted)', border: '1px solid var(--border)' }}>
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </Panel>
          </div>

          <Panel>
            <SectionTitle>Import questions</SectionTitle>
            <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>
              Upload or paste a JSON file. The format, with an LLM prompt that produces it from the submissions, is in{' '}
              <code>docs/trivia-questions-format.md</code>.
            </p>
            <details className="mb-4 text-xs" style={{ color: 'var(--muted)' }}>
              <summary className="cursor-pointer tracking-widest uppercase">Format at a glance</summary>
              <pre className="mt-2 p-3 overflow-x-auto text-[11px] leading-relaxed" style={{ background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--foreground)' }}>{IMPORT_EXAMPLE}</pre>
            </details>
            <div className="space-y-3">
              <div
                className="flex flex-wrap items-center gap-3 p-4"
                style={{ border: '1px dashed var(--border)', background: 'var(--background)' }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,.txt,application/json"
                  className="hidden"
                  onChange={(e) => readImportFile(e.target.files?.[0])}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-5 py-2 text-sm tracking-widest uppercase flex items-center gap-2"
                  style={{ background: 'var(--accent)', color: '#f5f0e8' }}
                >
                  <Upload className="w-4 h-4" />
                  Choose a file
                </button>
                <span className="text-sm" style={{ color: importFileName ? 'var(--foreground)' : 'var(--muted)' }}>
                  {importFileName ? importFileName : 'Select a .json file from your computer'}
                </span>
              </div>
              <p className="text-xs tracking-widest uppercase" style={{ color: 'var(--muted)' }}>Or paste JSON</p>
              <textarea
                rows={6}
                className="w-full border-gray-400 rounded-md shadow-sm border px-3 py-2 font-mono text-xs text-gray-900 placeholder-gray-500"
                placeholder='{ "questions": [ … ] }'
                value={importText}
                onChange={(e) => {
                  setImportText(e.target.value);
                  setImportFileName(null);
                }}
              />
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <label className="flex items-center gap-1.5">
                  <input type="radio" name="importMode" checked={importMode === 'append'} onChange={() => setImportMode('append')} />
                  Append to the end
                </label>
                <label className="flex items-center gap-1.5">
                  <input type="radio" name="importMode" checked={importMode === 'replace'} onChange={() => setImportMode('replace')} />
                  Replace all
                </label>
              </div>
              {importErrors.length > 0 && (
                <ul className="text-sm space-y-1" style={{ color: WRONG }}>
                  {importErrors.map((err, i) => <li key={i}>{err}</li>)}
                </ul>
              )}
              {importNotice && <p className="text-sm" style={{ color: CORRECT }}>{importNotice}</p>}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={runImport}
                  disabled={importing || !importText.trim()}
                  className="px-6 py-2 text-sm tracking-widest uppercase disabled:opacity-50"
                  style={{ background: 'var(--accent)', color: '#f5f0e8' }}
                >
                  {importing ? 'Importing…' : 'Import'}
                </button>
                <button
                  type="button"
                  onClick={exportJson}
                  disabled={questions.length === 0}
                  className="px-6 py-2 text-sm tracking-widest uppercase disabled:opacity-50"
                  style={{ color: 'var(--foreground)', border: '1px solid var(--border)' }}
                >
                  Export JSON
                </button>
              </div>
            </div>
          </Panel>

          <div>
            <SectionTitle>Question order ({questions.length})</SectionTitle>
            {questions.length === 0 ? (
              <p className="text-sm italic" style={{ color: 'var(--muted)' }}>No questions yet. Write one above, or start from a fact on the Submissions page.</p>
            ) : (
              <div className="space-y-3">
                {questions.map((q, i) => (
                  <div key={q.id} className="p-4" style={{ background: 'var(--card)', border: `1px solid ${editingId === q.id ? 'var(--accent)' : 'var(--border)'}` }}>
                    <div className="flex gap-3">
                      <span className="text-xs tabular-nums pt-1 w-6" style={{ color: 'var(--muted)' }}>{i + 1}.</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium mb-1">{q.text}</p>
                        <p className="text-xs" style={{ color: 'var(--muted)' }}>
                          {q.options.map((o, j) => (
                            <span key={j} className="mr-3" style={{ color: j === q.correctIndex ? CORRECT : undefined }}>
                              {letter(j)}. {o}{j === q.correctIndex ? ' ✓' : ''}
                            </span>
                          ))}
                        </p>
                        {q.about && <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>About {displayName(q.about)}</p>}
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3 pl-9">
                      <SmallButton label='Edit' onClick={() => startEdit(q)} />
                      <SmallButton label='↑' onClick={() => move(q, 'up')} disabled={i === 0} />
                      <SmallButton label='↓' onClick={() => move(q, 'down')} disabled={i === questions.length - 1} />
                      <SmallButton label='Delete' onClick={() => remove(q)} danger />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
      </div>
    </div>
  );
}
