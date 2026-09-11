'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Camera, RotateCcw, Trash2 } from 'lucide-react';
import { displayName } from '@/lib/displayName';
import { useSession } from '@/lib/useSession';
import type { OnionData } from '@/lib/onion';
import type { OnionAttempt } from '@/lib/db';
import {
  Analysis, AnalysisOptions, DEFAULT_OPTIONS, IN_SPEC_TOLERANCE, MIN_PIECES, analyzeImage, drawOverlay, scoreLabel,
} from '@/lib/onionAnalysis';
import TabVisibilityToggle from '@/components/TabVisibilityToggle';
import { CORRECT, Panel, SectionTitle, WRONG } from '@/components/trivia/TriviaShared';

const SERIF = { fontFamily: 'EB Garamond, Georgia, serif' } as const;
const GOLD = '#b8860b';
const AMBER = '#b8860b';
/** Photos are shrunk to this on their long side before analysis: plenty of detail, fast enough for a phone. */
const MAX_SIDE = 900;

const medal = (place: number) => (place === 1 ? '🥇' : place === 2 ? '🥈' : place === 3 ? '🥉' : null);
const pct = (v: number) => `${Math.round(v * 100)}%`;
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

/** Shrinks a chosen photo onto an offscreen canvas and returns its pixels. */
async function loadImageData(file: File): Promise<ImageData> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Could not read that image.'));
      el.src = url;
    });
    const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('Canvas is not available in this browser.');
    ctx.drawImage(img, 0, 0, w, h);
    return ctx.getImageData(0, 0, w, h);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function OnionPage() {
  const { user, isAdmin, ready } = useSession();
  const [data, setData] = useState<OnionData | null>(null);
  const [users, setUsers] = useState<string[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Photo analysis (entirely in the browser; nothing is uploaded)
  const [image, setImage] = useState<ImageData | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [options, setOptions] = useState<AnalysisOptions>(DEFAULT_OPTIONS);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Admin: saving the result for a player
  const [player, setPlayer] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/onion', { cache: 'no-store' });
      if (!res.ok) throw new Error();
      setData(await res.json());
      setLoadError(null);
    } catch {
      setLoadError('Could not load the onion scores.');
    }
  }, []);

  useEffect(() => {
    load();
    fetch('/api/users')
      .then((r) => r.json())
      .then((list: { name: string }[]) => setUsers(list.map((u) => u.name).sort((a, b) => a.localeCompare(b))))
      .catch(() => {});
  }, [load]);

  // Re-run the analysis whenever the photo or a slider changes. The work is
  // deferred a tick so the "Analysing…" state paints before the CPU is busy.
  useEffect(() => {
    if (!image) { setAnalysis(null); return; }
    setAnalyzing(true);
    const handle = window.setTimeout(() => {
      try {
        const result = analyzeImage(image, options);
        setAnalysis(result);
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (canvas && ctx) {
          canvas.width = image.width;
          canvas.height = image.height;
          drawOverlay(ctx, image, result);
        }
        setPhotoError(null);
      } catch {
        setPhotoError('Something went wrong analysing that photo.');
      } finally {
        setAnalyzing(false);
      }
    }, 30);
    return () => window.clearTimeout(handle);
  }, [image, options]);

  const choosePhoto = async (file: File | undefined) => {
    if (!file) return;
    setPhotoError(null);
    setNotice(null);
    setFileName(file.name);
    try {
      setImage(await loadImageData(file));
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : 'Could not read that image.');
    }
  };

  const reset = () => {
    setImage(null);
    setFileName('');
    setOptions(DEFAULT_OPTIONS);
    setPhotoError(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const post = async (body: Record<string, unknown>) => {
    setSaving(true);
    setSaveError(null);
    setNotice(null);
    const res = await fetch('/api/onion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setSaveError(json.error || 'That didn’t work.');
      return false;
    }
    setData(json);
    return true;
  };

  const saveAttempt = async () => {
    if (!analysis || analysis.score === null) return;
    if (!player) { setSaveError('Pick whose onion this is.'); return; }
    const ok = await post({
      action: 'save',
      username: player,
      score: analysis.score,
      pieces: analysis.pieces.length,
      cv: Number(analysis.cv.toFixed(4)),
      inSpec: Number(analysis.inSpec.toFixed(4)),
    });
    if (ok) setNotice(`Saved ${analysis.score} for ${displayName(player)}.`);
  };

  const deleteAttempt = async (a: OnionAttempt) => {
    if (!window.confirm(`Remove ${displayName(a.username)}’s ${a.score}?`)) return;
    if (await post({ action: 'delete', id: a.id })) setNotice(`Removed ${displayName(a.username)}’s ${a.score}.`);
  };

  const clearRound = async () => {
    if (!window.confirm('Delete every onion score? This cannot be undone.')) return;
    if (await post({ action: 'clear' })) setNotice('Cleared the round.');
  };

  const recordGame = async () => {
    if (!window.confirm('Record the current standings as an Olympics game?')) return;
    if (await post({ action: 'record' })) setNotice('Recorded the onion dice results in the Olympics standings.');
  };

  const sizeSummary = useMemo(() => {
    if (!analysis || analysis.pieces.length === 0) return null;
    const sizes = analysis.pieces.map((p) => p.size).sort((a, b) => a - b);
    const med = sizes[sizes.length >> 1];
    return { smallest: sizes[0] / med, largest: sizes[sizes.length - 1] / med };
  }, [analysis]);

  if (!ready || (!data && !loadError)) return <div className="p-8" style={{ color: 'var(--muted)' }}>Loading…</div>;

  const attempts = data?.attempts ?? [];
  const standings = data?.standings ?? [];
  const score = analysis?.score ?? null;
  const scoreColor = score === null ? 'var(--muted)' : score >= 75 ? CORRECT : score >= 40 ? AMBER : WRONG;

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <div className="flex items-center gap-3 mb-2">
        <h1 className="text-4xl font-normal" style={SERIF}>Onion Dice</h1>
        <TabVisibilityToggle />
      </div>
      <div className="w-8 h-px mb-4" style={{ background: 'var(--border)' }} />
      <p className="text-sm mb-8 max-w-2xl" style={{ color: 'var(--muted)' }}>
        Everyone dices an onion. Spread the pieces out on a plain board so none touch, snap a photo from
        straight above, and the page finds every piece and scores how even the cut is: 100 means identical
        pieces, and the score drops as the sizes spread out. Your best attempt counts, and the round can be
        recorded in the <Link href="/rankings" className="underline">Olympics standings</Link>.
      </p>

      {loadError && <p className="text-sm mb-6" style={{ color: WRONG }}>{loadError}</p>}

      {/* Analyser */}
      <div className="mb-10">
        <SectionTitle>Score a photo</SectionTitle>
        <Panel>
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <label
              className="inline-flex items-center gap-2 px-5 py-2 text-sm tracking-widest uppercase cursor-pointer"
              style={{ background: 'var(--accent)', color: '#f5f0e8', border: '1px solid var(--accent)' }}
            >
              <Camera className="w-4 h-4" />
              {image ? 'New photo' : 'Take or choose a photo'}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="sr-only"
                onChange={(e) => choosePhoto(e.target.files?.[0])}
              />
            </label>
            {image && (
              <button
                type="button"
                onClick={reset}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs tracking-widest uppercase"
                style={{ color: 'var(--foreground)', border: '1px solid var(--border)', background: 'var(--card)' }}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Start over
              </button>
            )}
            {fileName && <span className="text-xs truncate max-w-[14rem]" style={{ color: 'var(--muted)' }}>{fileName}</span>}
          </div>

          {!image && (
            <p className="text-xs italic" style={{ color: 'var(--muted)' }}>
              Photos stay on this device. Good light, a plain background, and a shot from directly above give the best results.
            </p>
          )}

          {photoError && <p className="text-sm mb-3" style={{ color: WRONG }}>{photoError}</p>}

          {image && (
            <div className="grid gap-6 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
              {/* Overlay: green pieces are in spec, amber a bit off, red well off */}
              <div>
                <div className="relative" style={{ border: '1px solid var(--border)', background: '#000' }}>
                  <canvas ref={canvasRef} className="w-full h-auto block" />
                  {analyzing && (
                    <div className="absolute inset-0 flex items-center justify-center text-sm" style={{ background: 'rgba(245,240,232,0.6)', color: 'var(--foreground)' }}>
                      Analysing…
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-4 mt-2 text-[11px] tracking-wide uppercase" style={{ color: 'var(--muted)' }}>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 inline-block" style={{ background: CORRECT }} />Within {pct(IN_SPEC_TOLERANCE)} of median</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 inline-block" style={{ background: AMBER }} />A bit off</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 inline-block" style={{ background: WRONG }} />Well off</span>
                </div>
              </div>

              {/* Score card and tuning */}
              <div>
                <div className="p-5 mb-4 text-center" style={{ border: `1px solid ${score === null ? 'var(--border)' : scoreColor}`, background: 'var(--background)' }}>
                  <p className="text-xs tracking-widest uppercase" style={{ color: 'var(--muted)' }}>Evenness</p>
                  <p className="text-6xl font-normal tabular-nums leading-none my-2" style={{ ...SERIF, color: scoreColor }}>
                    {score === null ? '–' : score}
                  </p>
                  <p className="text-sm" style={{ color: 'var(--muted)' }}>
                    {score === null
                      ? analysis ? `Need at least ${MIN_PIECES} pieces to score` : ''
                      : scoreLabel(score)}
                  </p>
                </div>

                {analysis && (
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm mb-4">
                    <dt style={{ color: 'var(--muted)' }}>Pieces found</dt>
                    <dd className="text-right tabular-nums">{analysis.pieces.length}</dd>
                    <dt style={{ color: 'var(--muted)' }}>In spec</dt>
                    <dd className="text-right tabular-nums">{pct(analysis.inSpec)}</dd>
                    <dt style={{ color: 'var(--muted)' }}>Size spread</dt>
                    <dd className="text-right tabular-nums">{pct(analysis.cv)}</dd>
                    {sizeSummary && (
                      <>
                        <dt style={{ color: 'var(--muted)' }}>Smallest · largest</dt>
                        <dd className="text-right tabular-nums">{pct(sizeSummary.smallest)} · {pct(sizeSummary.largest)} of median</dd>
                      </>
                    )}
                    {analysis.edgeBlobs > 0 && (
                      <dd className="col-span-2 text-xs italic" style={{ color: 'var(--muted)' }}>
                        {analysis.edgeBlobs} blob{analysis.edgeBlobs === 1 ? '' : 's'} touching the frame edge ignored. Keep the whole pile in the shot.
                      </dd>
                    )}
                  </dl>
                )}

                <details className="text-sm">
                  <summary className="cursor-pointer text-xs tracking-widest uppercase" style={{ color: 'var(--muted)' }}>Adjust detection</summary>
                  <div className="mt-3 space-y-3">
                    <Slider
                      label="Sensitivity"
                      hint="Lower if pieces are missed, higher if the board is being picked up"
                      value={options.sensitivity}
                      min={0.4}
                      max={1.8}
                      step={0.05}
                      format={(v) => `${Math.round(v * 100)}%`}
                      onChange={(sensitivity) => setOptions((o) => ({ ...o, sensitivity }))}
                    />
                    <Slider
                      label="Separation"
                      hint="Raise to split pieces that are touching"
                      value={options.separation}
                      min={0}
                      max={6}
                      step={1}
                      format={(v) => `${v}px`}
                      onChange={(separation) => setOptions((o) => ({ ...o, separation }))}
                    />
                    <Slider
                      label="Ignore specks under"
                      hint="Crumbs and glare smaller than this don't count"
                      value={options.minAreaFraction * 10000}
                      min={0.5}
                      max={20}
                      step={0.5}
                      format={(v) => `${v / 100}%`}
                      onChange={(v) => setOptions((o) => ({ ...o, minAreaFraction: v / 10000 }))}
                    />
                  </div>
                </details>

                {isAdmin && score !== null && (
                  <div className="mt-5 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
                    <label className="block text-xs font-medium uppercase tracking-wider mb-1" style={{ color: 'var(--muted)' }}>Whose onion?</label>
                    <div className="flex gap-2">
                      <select
                        value={player}
                        onChange={(e) => setPlayer(e.target.value)}
                        className="flex-1 px-3 py-2 text-sm focus:outline-none"
                        style={{ border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)' }}
                      >
                        <option value="">Choose a player…</option>
                        {users.map((u) => <option key={u} value={u}>{displayName(u)}</option>)}
                      </select>
                      <button
                        type="button"
                        onClick={saveAttempt}
                        disabled={saving || analyzing}
                        className="px-5 py-2 text-sm tracking-widest uppercase disabled:opacity-50"
                        style={{ background: 'var(--accent)', color: '#f5f0e8', border: '1px solid var(--accent)' }}
                      >
                        {saving ? 'Saving…' : 'Save score'}
                      </button>
                    </div>
                    {saveError && <p className="text-sm mt-2" style={{ color: WRONG }}>{saveError}</p>}
                  </div>
                )}
                {!isAdmin && score !== null && (
                  <p className="text-xs mt-4 italic" style={{ color: 'var(--muted)' }}>
                    An admin saves official scores. Show them this screen.
                  </p>
                )}
              </div>
            </div>
          )}
        </Panel>
        {notice && <p className="text-sm mt-3" style={{ color: CORRECT }}>{notice}</p>}
      </div>

      {/* Standings: best attempt per player */}
      <div className="mb-10">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <SectionTitle>Standings</SectionTitle>
          {isAdmin && standings.length > 0 && (
            <button
              type="button"
              onClick={recordGame}
              disabled={saving}
              className="px-3 py-1.5 text-xs tracking-widest uppercase disabled:opacity-40 mb-4"
              style={{ border: '1px solid var(--border)', color: 'var(--foreground)', background: 'var(--card)' }}
            >
              Record in Olympics
            </button>
          )}
        </div>
        <div style={{ border: '1px solid var(--border)', background: 'var(--card)' }}>
          {standings.length === 0 && (
            <p className="p-4 text-sm italic" style={{ color: 'var(--muted)' }}>No onions scored yet.</p>
          )}
          {standings.map((row, i) => {
            const isMe = row.name === user;
            return (
              <div
                key={row.name}
                className="flex items-center gap-3 px-4 py-2.5 text-sm"
                style={{ borderTop: i === 0 ? 'none' : '1px solid var(--border)', background: isMe ? '#efe9dc' : 'transparent' }}
              >
                <span className="w-8 tabular-nums" style={{ color: row.place === 1 ? GOLD : 'var(--muted)' }}>{row.place}.</span>
                <span className="flex-1 font-medium truncate">
                  {displayName(row.name)}
                  {medal(row.place) && <span className="ml-2">{medal(row.place)}</span>}
                  {isMe && <span className="ml-2 text-xs font-normal" style={{ color: 'var(--muted)' }}>you</span>}
                </span>
                <span className="text-xs tabular-nums hidden sm:inline" style={{ color: 'var(--muted)' }}>
                  {row.best.pieces} pieces · {pct(row.best.inSpec)} in spec{row.attempts > 1 ? ` · best of ${row.attempts}` : ''}
                </span>
                <span className="w-12 text-right tabular-nums font-semibold text-base">{row.best.score}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Every attempt, newest first */}
      {attempts.length > 0 && (
        <div className="mb-10">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <SectionTitle>Attempts</SectionTitle>
            {isAdmin && (
              <button
                type="button"
                onClick={clearRound}
                disabled={saving}
                className="text-[11px] tracking-widest uppercase mb-4 disabled:opacity-40"
                style={{ color: WRONG }}
              >
                Clear round
              </button>
            )}
          </div>
          <Panel className="!p-0">
            <ul className="text-sm">
              {[...attempts].reverse().map((a) => (
                <li key={a.id} className="flex items-center gap-3 px-5 py-2.5" style={{ borderBottom: '1px solid var(--border)' }}>
                  <span className="w-10 tabular-nums font-medium shrink-0">{a.score}</span>
                  <span className="flex-1 min-w-0 truncate">
                    <span style={{ fontWeight: a.username === user ? 600 : 400 }}>{displayName(a.username)}</span>
                    <span className="ml-2 text-xs" style={{ color: 'var(--muted)' }}>{a.pieces} pieces · {pct(a.inSpec)} in spec</span>
                  </span>
                  <span className="text-xs whitespace-nowrap shrink-0" style={{ color: 'var(--muted)' }}>{formatDate(a.scoredAt)}</span>
                  {isAdmin && (
                    <button type="button" onClick={() => deleteAttempt(a)} title="Remove this attempt" className="p-1.5 shrink-0" style={{ color: WRONG }}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      )}
    </div>
  );
}

function Slider({
  label, hint, value, min, max, step, format, onChange,
}: {
  label: string;
  hint: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <span className="flex justify-between text-xs">
        <span className="font-medium uppercase tracking-wider" style={{ color: 'var(--muted)' }}>{label}</span>
        <span className="tabular-nums" style={{ color: 'var(--muted)' }}>{format(value)}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
        style={{ accentColor: 'var(--accent)' }}
      />
      <span className="block text-[11px]" style={{ color: 'var(--muted)' }}>{hint}</span>
    </label>
  );
}
