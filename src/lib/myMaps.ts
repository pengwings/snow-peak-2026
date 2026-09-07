/**
 * Google My Maps helpers.
 *
 * A My Maps id ("mid") shows up in every link Google hands out:
 *   https://www.google.com/maps/d/viewer?mid=1AbC...
 *   https://www.google.com/maps/d/edit?mid=1AbC...
 *   https://www.google.com/maps/d/u/0/edit?mid=1AbC...
 *   <iframe src="https://www.google.com/maps/d/embed?mid=1AbC..."></iframe>
 * We store just the mid and build the embed/viewer URLs from it.
 */

const MID_PATTERN = /^[A-Za-z0-9_-]{10,}$/;

/** Returns the map id from a pasted link, iframe snippet, or bare id; null if none found. */
export function extractMyMapsId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const fromUrl = trimmed.match(/[?&]mid=([A-Za-z0-9_-]+)/);
  if (fromUrl) return fromUrl[1];

  if (MID_PATTERN.test(trimmed)) return trimmed;
  return null;
}

export function myMapsEmbedUrl(mid: string): string {
  // ehbc tints the embed's header bar to match the site accent
  return `https://www.google.com/maps/d/embed?mid=${encodeURIComponent(mid)}&ehbc=4A4035`;
}

export function myMapsViewerUrl(mid: string): string {
  return `https://www.google.com/maps/d/viewer?mid=${encodeURIComponent(mid)}`;
}
