'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { apiFetch } from '@/lib/basePath';

/**
 * Visible/Hidden pill for the current tab, shown next to a page's header.
 * Renders nothing unless the viewer is an admin with admin mode on.
 */
export default function TabVisibilityToggle() {
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);
  const [hiddenTabs, setHiddenTabs] = useState<string[] | null>(null);

  useEffect(() => {
    apiFetch('/api/me')
      .then((res) => res.json())
      .then((data) => setIsAdmin(!!data.isAdmin));
    apiFetch('/api/tabs')
      .then((res) => res.json())
      .then((data) => setHiddenTabs(data.hiddenTabs || []));
  }, []);

  if (!isAdmin || hiddenTabs === null) return null;

  const isHidden = hiddenTabs.includes(pathname);

  const toggle = async () => {
    const next = isHidden ? hiddenTabs.filter((h) => h !== pathname) : [...hiddenTabs, pathname];
    setHiddenTabs(next);
    await apiFetch('/api/tabs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hiddenTabs: next }),
    });
    // Let the navbar refresh its dimming without a navigation
    window.dispatchEvent(new Event('tabs-changed'));
  };

  return (
    <button
      onClick={toggle}
      title={isHidden ? 'This tab is hidden from members — click to show it' : 'This tab is visible to members — click to hide it'}
      className="text-[10px] tracking-wide uppercase px-2 py-1 rounded transition-colors flex items-center gap-1.5"
      style={
        isHidden
          ? { color: '#a33', border: '1px solid #a33' }
          : { color: 'var(--muted)', border: '1px solid var(--border)' }
      }
    >
      {isHidden ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
      {isHidden ? 'Hidden' : 'Visible'}
    </button>
  );
}
