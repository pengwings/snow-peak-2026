'use client';

import { useEffect, useState } from 'react';
import { ExternalLink, MapPin } from 'lucide-react';
import TabVisibilityToggle from '@/components/TabVisibilityToggle';
import { myMapsEmbedUrl, myMapsViewerUrl } from '@/lib/myMaps';
import { useSession } from '@/lib/useSession';
import { apiFetch } from '@/lib/basePath';

export default function MapPage() {
  const { isAdmin, ready } = useSession();
  const [mapId, setMapId] = useState<string | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [link, setLink] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch('/api/map')
      .then((res) => res.json())
      .then((data) => {
        setMapId(data.mapId ?? null);
        setMapLoaded(true);
      });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await apiFetch('/api/map', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ link }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setError(data.error || 'Could not save the map link.');
      return;
    }
    setMapId(data.mapId ?? null);
    setLink('');
  };

  const handleClear = async () => {
    if (!window.confirm('Remove the map from this tab?')) return;
    setSaving(true);
    await apiFetch('/api/map', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ link: '' }),
    });
    setSaving(false);
    setMapId(null);
  };

  if (!ready) return <div className="p-8">Loading...</div>;

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <div className="flex items-center gap-3 mb-2">
        <h1 className="text-4xl font-normal" style={{ fontFamily: 'EB Garamond, Georgia, serif' }}>Trip Map</h1>
        <TabVisibilityToggle />
      </div>
      <div className="w-8 h-px mb-6" style={{ background: 'var(--border)' }} />

      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <p className="text-sm" style={{ color: 'var(--muted)' }}>
          Places we&apos;d like to visit while we&apos;re there.
        </p>
        {mapId && (
          <a
            href={myMapsViewerUrl(mapId)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs tracking-wide uppercase px-3 py-1.5 rounded transition-colors"
            style={{ color: 'var(--muted)', border: '1px solid var(--border)' }}
            title="Opens in the Google Maps app on your phone"
          >
            <ExternalLink className="w-3 h-3" />
            Open in Google Maps
          </a>
        )}
      </div>

      {/* The map itself */}
      {mapId ? (
        <div className="overflow-hidden" style={{ border: '1px solid var(--border)', background: 'var(--card)' }}>
          <iframe
            key={mapId}
            src={myMapsEmbedUrl(mapId)}
            title="Trip map"
            className="w-full block"
            style={{ height: '70vh', minHeight: 420 }}
            loading="lazy"
            allowFullScreen
          />
        </div>
      ) : (
        mapLoaded && (
          <div
            className="flex flex-col items-center justify-center text-center py-20 px-6"
            style={{ border: '1px dashed var(--border)', background: 'var(--card)', color: 'var(--muted)' }}
          >
            <MapPin className="w-6 h-6 mb-3" />
            <p className="text-sm">
              {isAdmin
                ? 'No map yet. Paste a Google My Maps link below to show it here.'
                : 'The trip admin hasn’t added a map yet. Check back soon.'}
            </p>
          </div>
        )
      )}

      {/* Admin: set or replace the map */}
      {isAdmin && (
        <div className="mt-8 p-5" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          <h2 className="text-sm font-medium uppercase tracking-wider mb-1" style={{ color: 'var(--muted)' }}>
            {mapId ? 'Replace the map' : 'Add a map'}
          </h2>
          <p className="text-xs mb-3" style={{ color: 'var(--muted)' }}>
            In Google My Maps, click <span className="font-medium">Share</span>, turn on
            &ldquo;Anyone with this link can view&rdquo;, and paste the link here. Viewer, edit, or embed links all work.
          </p>
          <form onSubmit={handleSave} className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              required
              className="flex-1 px-3 py-2 text-sm focus:outline-none"
              style={{ border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)' }}
              placeholder="https://www.google.com/maps/d/viewer?mid=..."
              value={link}
              onChange={(e) => setLink(e.target.value)}
            />
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 text-sm tracking-widest uppercase disabled:opacity-50"
              style={{ background: 'var(--accent)', color: '#f5f0e8' }}
            >
              {saving ? 'Saving' : 'Save'}
            </button>
            {mapId && (
              <button
                type="button"
                onClick={handleClear}
                disabled={saving}
                className="px-4 py-2 text-sm tracking-widest uppercase disabled:opacity-50"
                style={{ background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--muted)' }}
              >
                Remove
              </button>
            )}
          </form>
          {error && (
            <p className="text-xs mt-2" style={{ color: '#a33' }}>{error}</p>
          )}
        </div>
      )}
    </div>
  );
}
