'use client';

import { useLayoutEffect, useRef, type TextareaHTMLAttributes } from 'react';

/**
 * Single-purpose textarea that grows to fit its content, so long facts stay readable.
 * Uses CSS `field-sizing: content` where supported and falls back to measuring scrollHeight.
 */
export function GrowingTextarea({ value, style, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      style={{ resize: 'none', overflow: 'hidden', fieldSizing: 'content', ...style } as React.CSSProperties}
      {...rest}
    />
  );
}
