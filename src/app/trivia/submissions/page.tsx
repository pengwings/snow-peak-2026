'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { TriviaFacts } from '@/lib/db';
import { displayName } from '@/lib/displayName';
import { Download } from 'lucide-react';
import { SectionTitle, WRONG, CORRECT } from '@/components/trivia/TriviaShared';
import { buildTriviaPrompt } from '@/lib/triviaPrompt';
import { MAX_FACT_LENGTH } from '@/lib/triviaConfig';
import { GrowingTextarea } from '@/components/trivia/GrowingTextarea';

type FactKey = 'selfFacts' | 'hobbyFacts';
type Editing = { username: string; field: FactKey | 'hobby'; index: number; value: string } | null;

/** Admin page: everyone's submitted facts, each editable or deletable in place. */
export default function TriviaSubmissionsPage() {
  const router = useRouter();
  const [me, setMe] = useState<{ user: string | null; isAdmin: boolean } | null>(null);
  const [facts, setFacts] = useState<TriviaFacts[]>([]);
  const [missing, setMissing] = useState<string[]>([]);
  const [open, setOpen] = useState(true);
  const [editing, setEditing] = useState<Editing>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch('/api/me')
      .then((res) => res.json())
      .then((data) => {
        if (!data.user) router.push('/login');
        else setMe({ user: data.user, isAdmin: !!data.isAdmin });
      });
  }, [router]);

  useEffect(() => {
    if (!me?.isAdmin) return;
    fetch('/api/trivia/facts')
      .then((res) => res.json())
      .then((data) => {
        setFacts(data.all ?? []);
        setMissing(data.missing ?? []);
        setOpen(!!data.open);
      });
  }, [me]);

  const save = async (body: Record<string, unknown>) => {
    setMessage(null);
    const res = await fetch('/api/trivia/facts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessage(data.error || 'Could not save.');
      return false;
    }
    setFacts(data.all ?? []);
    return true;
  };

  const update = (f: TriviaFacts, patch: Partial<TriviaFacts>) =>
    save({ action: 'adminUpdate', username: f.username, hobby: f.hobby, selfFacts: f.selfFacts, hobbyFacts: f.hobbyFacts, ...patch });

  const commitEdit = async () => {
    if (!editing) return;
    const f = facts.find((x) => x.username === editing.username);
    if (!f) return;
    const value = editing.value.trim();
    if (editing.field === 'hobby') {
      if (value) await update(f, { hobby: value });
    } else {
      const list = [...f[editing.field]];
      if (value) list[editing.index] = value;
      else list.splice(editing.index, 1);
      await update(f, { [editing.field]: list });
    }
    setEditing(null);
  };

  const deleteFact = async (f: TriviaFacts, field: FactKey, index: number) => {
    if (!window.confirm(`Delete “${f[field][index]}”?`)) return;
    await update(f, { [field]: f[field].filter((_, i) => i !== index) });
  };

  const deleteSubmission = async (f: TriviaFacts) => {
    if (!window.confirm(`Delete everything ${displayName(f.username)} submitted? They can submit again while submissions are open.`)) return;
    const ok = await save({ action: 'adminDelete', username: f.username });
    if (ok) setMissing((m) => [...m, f.username].sort());
  };

  /** The full LLM prompt with every guest's facts embedded, ready to paste. */
  const buildPrompt = async () => {
    const res = await fetch('/api/users');
    const users: { name: string }[] = await res.json();
    return buildTriviaPrompt(
      users.map((u) => u.name),
      facts.map((f) => ({ name: f.username, hobby: f.hobby, selfFacts: f.selfFacts, hobbyFacts: f.hobbyFacts }))
    );
  };

  const exportFacts = async () => {
    const prompt = await buildPrompt();
    const blob = new Blob([prompt], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'trivia-question-prompt.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyPrompt = async () => {
    const prompt = await buildPrompt();
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setMessage('Could not access the clipboard.');
    }
  };

  if (!me) return <div className="p-8" style={{ color: 'var(--muted)' }}>Loading…</div>;

  if (!me.isAdmin) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-12">
        <h1 className="text-4xl font-normal mb-4" style={{ fontFamily: 'EB Garamond, Georgia, serif' }}>Submissions</h1>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>Turn on admin mode from the navbar to see submissions.</p>
      </div>
    );
  }

  const isEditing = (username: string, field: Editing extends null ? never : NonNullable<Editing>['field'], index: number) =>
    editing?.username === username && editing.field === field && editing.index === index;

  const editor = (
    <span className="flex-1 flex gap-2">
      <GrowingTextarea
        autoFocus
        className="flex-1 border-gray-400 rounded-md shadow-sm border px-2 py-1 text-sm text-gray-900"
        value={editing?.value ?? ''}
        maxLength={MAX_FACT_LENGTH}
        onChange={(e) => editing && setEditing({ ...editing, value: e.target.value })}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); commitEdit(); }
          if (e.key === 'Escape') setEditing(null);
        }}
      />
      <MiniButton label="Save" onClick={commitEdit} />
      <MiniButton label="Cancel" onClick={() => setEditing(null)} />
    </span>
  );

  const factRow = (f: TriviaFacts, field: FactKey, index: number) => {
    const fact = f[field][index];
    return (
      <li key={index} className="flex gap-3 items-center text-sm min-h-[28px]">
        <span className="w-4 text-xs tabular-nums" style={{ color: 'var(--muted)' }}>{index + 1}.</span>
        {isEditing(f.username, field, index) ? editor : (
          <>
            <span className="flex-1">{fact}</span>
            <MiniButton label="Edit" onClick={() => setEditing({ username: f.username, field, index, value: fact })} />
            <MiniButton label="Delete" onClick={() => deleteFact(f, field, index)} danger />
          </>
        )}
      </li>
    );
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <h1 className="text-4xl font-normal mb-2" style={{ fontFamily: 'EB Garamond, Georgia, serif' }}>Submissions</h1>
      <div className="w-8 h-px mb-6" style={{ background: 'var(--border)' }} />
      <div className="flex flex-wrap gap-2 mb-8">
        <NavLink href="/trivia/host">Host controls</NavLink>
        <NavLink href="/trivia/questions">Questions</NavLink>
        <NavLink href="/trivia">Player view</NavLink>
      </div>

      <div className="flex flex-wrap justify-between items-baseline gap-3 mb-2">
        <SectionTitle>{facts.length} submitted</SectionTitle>
        <span className="text-xs tracking-widest uppercase" style={{ color: open ? 'var(--muted)' : WRONG }}>
          Submissions {open ? 'open' : 'closed'}
        </span>
      </div>
      {missing.length > 0 && (
        <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>
          Still waiting on: {missing.map(displayName).join(', ')}
        </p>
      )}
      <div className="p-4 mb-8" style={{ border: '1px dashed var(--border)', background: 'var(--card)' }}>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={exportFacts}
            disabled={facts.length === 0}
            className="px-5 py-2 text-sm tracking-widest uppercase flex items-center gap-2 disabled:opacity-40"
            style={{ background: 'var(--accent)', color: '#f5f0e8' }}
          >
            <Download className="w-4 h-4" />
            Export facts
          </button>
          <button
            onClick={copyPrompt}
            disabled={facts.length === 0}
            className="px-4 py-2 text-xs tracking-widest uppercase disabled:opacity-40"
            style={{ color: 'var(--foreground)', border: '1px solid var(--border)', background: 'var(--background)' }}
          >
            {copied ? 'Copied ✓' : 'Copy to clipboard instead'}
          </button>
        </div>
        <p className="text-xs mt-3" style={{ color: 'var(--muted)' }}>
          Downloads a ready-to-paste LLM prompt with everyone&apos;s facts included. Paste it into an LLM, then import its JSON reply on the Questions page.
          Details in <code>docs/trivia-questions-format.md</code>.
        </p>
      </div>
      {message && <p className="text-sm mb-4" style={{ color: WRONG }}>{message}</p>}

      <div className="space-y-4">
        {facts.map((f) => (
          <div key={f.username} className="p-5" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
            <div className="flex justify-between items-baseline gap-3 mb-3">
              <p className="text-lg font-medium">{displayName(f.username)}</p>
              <MiniButton label="Delete submission" onClick={() => deleteSubmission(f)} danger />
            </div>

            <p className="text-[10px] tracking-widest uppercase mb-1" style={{ color: 'var(--muted)' }}>About them</p>
            <ul className="space-y-1 mb-4">
              {f.selfFacts.map((_, i) => factRow(f, 'selfFacts', i))}
              {f.selfFacts.length === 0 && <li className="text-xs italic" style={{ color: 'var(--muted)' }}>No facts left.</li>}
            </ul>

            <div className="flex items-center gap-2 mb-1 min-h-[28px]">
              <p className="text-[10px] tracking-widest uppercase" style={{ color: 'var(--muted)' }}>
                About {isEditing(f.username, 'hobby', 0) ? '' : f.hobby}
              </p>
              {isEditing(f.username, 'hobby', 0)
                ? editor
                : <MiniButton label="Rename" onClick={() => setEditing({ username: f.username, field: 'hobby', index: 0, value: f.hobby })} />}
            </div>
            <ul className="space-y-1">
              {f.hobbyFacts.map((_, i) => factRow(f, 'hobbyFacts', i))}
              {f.hobbyFacts.length === 0 && <li className="text-xs italic" style={{ color: 'var(--muted)' }}>No facts left.</li>}
            </ul>
          </div>
        ))}
        {facts.length === 0 && <p className="text-sm italic" style={{ color: 'var(--muted)' }}>Nobody has submitted facts yet.</p>}
      </div>
      {copied && <p className="fixed bottom-4 right-6 text-xs px-3 py-2" style={{ background: CORRECT, color: '#f5f0e8' }}>Copied to clipboard</p>}
    </div>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="px-3 py-1.5 text-xs tracking-widest uppercase" style={{ border: '1px solid var(--border)', color: 'var(--foreground)', background: 'var(--card)' }}>
      {children}
    </Link>
  );
}

function MiniButton({ label, onClick, danger }: { label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className="px-2 py-0.5 text-[10px] tracking-widest uppercase shrink-0"
      style={{ border: `1px solid ${danger ? WRONG : 'var(--border)'}`, color: danger ? WRONG : 'var(--foreground)', background: 'var(--background)' }}
    >
      {label}
    </button>
  );
}
