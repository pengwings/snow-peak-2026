'use client';

import Link from 'next/link';

/**
 * Stands in for an editing control when the visitor is browsing view-only.
 * `panel` renders a dashed card in place of a whole form; otherwise a single
 * line of small text. `action` completes the sentence "Sign in to …".
 */
export default function SignInHint({
  action,
  panel = false,
  className = '',
}: {
  action: string;
  panel?: boolean;
  className?: string;
}) {
  const body = (
    <>
      You&apos;re browsing in view-only mode.{' '}
      <Link href="/login" className="underline" style={{ color: 'var(--accent)' }}>Sign in</Link> to {action}.
    </>
  );
  if (!panel) {
    return <p className={`text-xs ${className}`} style={{ color: 'var(--muted)' }}>{body}</p>;
  }
  return (
    <div
      className={`p-5 text-sm ${className}`}
      style={{ background: 'var(--card)', border: '1px dashed var(--border)', color: 'var(--muted)' }}
    >
      {body}
    </div>
  );
}
