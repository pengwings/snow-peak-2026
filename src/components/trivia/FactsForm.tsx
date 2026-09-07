'use client';

import { useEffect, useState } from 'react';
import type { TriviaFacts } from '@/lib/db';
import { MIN_FACTS, MAX_FACTS } from '@/lib/triviaConfig';
import { Panel, SectionTitle } from './TriviaShared';

const emptyList = () => Array.from({ length: MAX_FACTS }, () => '');
const padList = (facts: string[]) => [...facts, ...emptyList()].slice(0, MAX_FACTS);

/**
 * Where each guest submits their facts before the game. Shows the saved
 * submission with an Edit button once one exists; read-only after the host
 * closes submissions.
 */
export default function FactsForm() {
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(true);
  const [mine, setMine] = useState<TriviaFacts | null>(null);
  const [editing, setEditing] = useState(false);
  const [hobby, setHobby] = useState('');
  const [selfFacts, setSelfFacts] = useState<string[]>(emptyList());
  const [hobbyFacts, setHobbyFacts] = useState<string[]>(emptyList());
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    fetch('/api/trivia/facts')
      .then((res) => res.json())
      .then((data) => {
        setOpen(!!data.open);
        setMine(data.mine ?? null);
        setLoaded(true);
      });
  }, []);

  const startEditing = () => {
    setHobby(mine?.hobby ?? '');
    setSelfFacts(padList(mine?.selfFacts ?? []));
    setHobbyFacts(padList(mine?.hobbyFacts ?? []));
    setError(null);
    setEditing(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await fetch('/api/trivia/facts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hobby, selfFacts, hobbyFacts }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setError(data.error || 'Could not save.');
      return;
    }
    setMine(data.mine);
    setEditing(false);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2500);
  };

  const updateAt = (setter: (v: string[]) => void, list: string[], i: number, value: string) => {
    const next = [...list];
    next[i] = value;
    setter(next);
  };

  if (!loaded) return <p className="text-sm" style={{ color: 'var(--muted)' }}>Loading…</p>;

  const filledCount = (list: string[]) => list.filter((f) => f.trim()).length;

  const factList = (label: string, list: string[], setter: (v: string[]) => void, placeholder: string) => (
    <div>
      <div className="flex justify-between items-baseline mb-2">
        <label className="text-xs tracking-widest uppercase" style={{ color: 'var(--muted)' }}>{label}</label>
        <span className="text-xs tabular-nums" style={{ color: filledCount(list) >= MIN_FACTS ? '#2d6a4f' : 'var(--muted)' }}>
          {filledCount(list)} / {MIN_FACTS}–{MAX_FACTS}
        </span>
      </div>
      <div className="space-y-2">
        {list.map((value, i) => (
          <input
            key={i}
            type="text"
            className="w-full border-gray-400 rounded-md shadow-sm border px-3 py-2 text-gray-900 placeholder-gray-500"
            placeholder={i < MIN_FACTS ? placeholder : 'Optional'}
            value={value}
            maxLength={200}
            onChange={(e) => updateAt(setter, list, i, e.target.value)}
          />
        ))}
      </div>
    </div>
  );

  if (editing && open) {
    return (
      <Panel>
        <SectionTitle>{mine ? 'Edit your facts' : 'Your facts'}</SectionTitle>
        <p className="text-sm mb-6" style={{ color: 'var(--muted)' }}>
          These become trivia questions, so pick things the group might not know. Aim for a mix of easy and surprising.
        </p>
        <form onSubmit={handleSubmit} className="space-y-6">
          {factList('About you', selfFacts, setSelfFacts, 'e.g. I once got lost in Tokyo for six hours')}
          <div>
            <label className="text-xs tracking-widest uppercase block mb-2" style={{ color: 'var(--muted)' }}>A hobby or interest of yours</label>
            <input
              type="text"
              required
              className="w-full border-gray-400 rounded-md shadow-sm border px-3 py-2 text-gray-900 placeholder-gray-500"
              placeholder="e.g. Rock climbing, sourdough, Formula 1"
              value={hobby}
              maxLength={100}
              onChange={(e) => setHobby(e.target.value)}
            />
          </div>
          {factList('Facts about that hobby', hobbyFacts, setHobbyFacts, 'e.g. The first bouldering gym opened in 1987')}
          {error && <p className="text-sm" style={{ color: '#a33' }}>{error}</p>}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 text-sm tracking-widest uppercase disabled:opacity-50"
              style={{ background: 'var(--accent)', color: '#f5f0e8' }}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            {mine && (
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="px-6 py-2 text-sm tracking-widest uppercase"
                style={{ color: 'var(--muted)', border: '1px solid var(--border)' }}
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </Panel>
    );
  }

  if (!mine) {
    return (
      <Panel>
        <SectionTitle>A trivia game is coming</SectionTitle>
        {open ? (
          <>
            <p className="text-sm mb-6" style={{ color: 'var(--muted)' }}>
              Submit {MIN_FACTS} to {MAX_FACTS} facts about yourself and {MIN_FACTS} to {MAX_FACTS} about one of your hobbies.
              They&apos;ll be turned into questions for the whole group.
            </p>
            <button
              onClick={startEditing}
              className="px-6 py-2 text-sm tracking-widest uppercase"
              style={{ background: 'var(--accent)', color: '#f5f0e8' }}
            >
              Submit your facts
            </button>
          </>
        ) : (
          <p className="text-sm italic" style={{ color: 'var(--muted)' }}>
            Submissions are closed. See you at the game!
          </p>
        )}
      </Panel>
    );
  }

  return (
    <Panel>
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <SectionTitle color="#2d6a4f">Facts submitted ✓</SectionTitle>
          <p className="text-sm -mt-2" style={{ color: 'var(--muted)' }}>
            {savedFlash ? 'Saved.' : open ? 'You can edit these until the host closes submissions.' : 'Submissions are closed.'}
          </p>
        </div>
        {open && (
          <button
            onClick={startEditing}
            className="px-4 py-1.5 text-xs tracking-widest uppercase shrink-0"
            style={{ color: 'var(--foreground)', border: '1px solid var(--border)', background: 'var(--background)' }}
          >
            Edit
          </button>
        )}
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <p className="text-xs tracking-widest uppercase mb-2" style={{ color: 'var(--muted)' }}>About you</p>
          <ol className="list-decimal pl-5 space-y-1 text-sm" style={{ color: 'var(--foreground)' }}>
            {mine.selfFacts.map((f, i) => <li key={i}>{f}</li>)}
          </ol>
        </div>
        <div>
          <p className="text-xs tracking-widest uppercase mb-2" style={{ color: 'var(--muted)' }}>About {mine.hobby}</p>
          <ol className="list-decimal pl-5 space-y-1 text-sm" style={{ color: 'var(--foreground)' }}>
            {mine.hobbyFacts.map((f, i) => <li key={i}>{f}</li>)}
          </ol>
        </div>
      </div>
    </Panel>
  );
}
