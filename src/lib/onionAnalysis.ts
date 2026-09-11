/**
 * Onion dice evenness: finds the pieces in a photo and scores how uniform
 * they are. Pure functions over ImageData so the whole thing runs in the
 * browser; nothing here touches the DOM or the database.
 *
 * Pipeline: estimate the background colour from the photo's edges, mark
 * every pixel that differs from it (Otsu threshold), peel the mask back a
 * little so touching pieces come apart, label the blobs, then grow the
 * labels back out to the original outline. Each blob is a piece; its area
 * in pixels is its size.
 */

export type Piece = {
  /** Pixel area after growing labels back to the original outline. */
  area: number;
  /** Linear size (sqrt of area), the unit evenness is judged in. */
  size: number;
  cx: number;
  cy: number;
  /** Signed deviation of this piece's size from the median, as a fraction. */
  deviation: number;
};

export type Analysis = {
  width: number;
  height: number;
  pieces: Piece[];
  /** Blobs that touched the frame edge are not counted as pieces. */
  edgeBlobs: number;
  /** Coefficient of variation of linear size; 0 = identical pieces. */
  cv: number;
  /** Share of pieces within IN_SPEC_TOLERANCE of the median size. */
  inSpec: number;
  /** 0–100; null when there are too few pieces to judge. */
  score: number | null;
  /** Per-pixel piece index (-1 = background / ignored), for drawing overlays. */
  labels: Int32Array;
};

export type AnalysisOptions = {
  /** Multiplies the automatic threshold: <1 picks up more of the onion, >1 less. */
  sensitivity: number;
  /** Erosion radius in pixels used to pull touching pieces apart. */
  separation: number;
  /** Blobs smaller than this fraction of the image are noise. */
  minAreaFraction: number;
};

export const DEFAULT_OPTIONS: AnalysisOptions = { sensitivity: 1, separation: 2, minAreaFraction: 0.0002 };
export const MIN_PIECES = 3;
/** A piece counts as "in spec" when its size is within 25% of the median. */
export const IN_SPEC_TOLERANCE = 0.25;

/** Evenness score from the spread of piece sizes: 100 for identical pieces, falling to 0 as the CV reaches 1. */
export function scoreFromCv(cv: number): number {
  return Math.max(0, Math.min(100, Math.round(100 * (1 - cv))));
}

export function scoreLabel(score: number): string {
  if (score >= 90) return 'Knife-skills legend';
  if (score >= 75) return 'Restaurant ready';
  if (score >= 60) return 'Solid home cook';
  if (score >= 40) return 'Rustic';
  return 'Chunky';
}

export function analyzeImage(image: ImageData, opts: Partial<AnalysisOptions> = {}): Analysis {
  const { sensitivity, separation, minAreaFraction } = { ...DEFAULT_OPTIONS, ...opts };
  const { width: w, height: h, data } = image;
  const n = w * h;

  // 1. Background colour: the median of a band around the frame edge.
  const bg = edgeMedianColor(image);

  // 2. Distance of every pixel from the background, scaled 0–255.
  const dist = new Uint8ClampedArray(n);
  for (let i = 0; i < n; i++) {
    const dr = data[i * 4] - bg[0];
    const dg = data[i * 4 + 1] - bg[1];
    const db = data[i * 4 + 2] - bg[2];
    // Max possible distance is sqrt(3)*255 ≈ 441; scale so mild differences are still visible.
    dist[i] = Math.min(255, Math.sqrt(dr * dr + dg * dg + db * db) * 0.9);
  }

  // 3. Threshold (Otsu, nudged by the sensitivity slider).
  const threshold = Math.max(8, Math.min(250, otsu(dist) * sensitivity));
  const mask = new Uint8Array(n);
  for (let i = 0; i < n; i++) mask[i] = dist[i] > threshold ? 1 : 0;

  // 4. Erode to split touching pieces, label the survivors, then grow labels back.
  const eroded = erode(mask, w, h, separation);
  const { labels, count, areas, touchesEdge } = labelComponents(eroded, w, h);
  growLabels(labels, mask, w, h, separation);

  // Recount areas after growing back so pieces regain their true outline,
  // and re-check the frame edge now that the outline is complete.
  areas.fill(0);
  touchesEdge.fill(false);
  const sx = new Float64Array(count);
  const sy = new Float64Array(count);
  for (let i = 0; i < n; i++) {
    const l = labels[i];
    if (l < 0) continue;
    areas[l]++;
    const x = i % w;
    const y = (i / w) | 0;
    sx[l] += x;
    sy[l] += y;
    if (x === 0 || y === 0 || x === w - 1 || y === h - 1) touchesEdge[l] = true;
  }

  // 5. Keep blobs that are big enough and fully inside the frame.
  const minArea = Math.max(4, n * minAreaFraction);
  const keep = new Int32Array(count).fill(-1);
  const pieces: Piece[] = [];
  let edgeBlobs = 0;
  for (let l = 0; l < count; l++) {
    if (areas[l] < minArea) continue;
    if (touchesEdge[l]) { edgeBlobs++; continue; }
    keep[l] = pieces.length;
    pieces.push({ area: areas[l], size: Math.sqrt(areas[l]), cx: sx[l] / areas[l], cy: sy[l] / areas[l], deviation: 0 });
  }
  for (let i = 0; i < n; i++) labels[i] = labels[i] < 0 ? -1 : keep[labels[i]];

  // 6. Evenness.
  const sizes = pieces.map((p) => p.size);
  const med = median(sizes);
  for (const p of pieces) p.deviation = med > 0 ? (p.size - med) / med : 0;
  const mean = sizes.reduce((a, b) => a + b, 0) / (sizes.length || 1);
  const variance = sizes.reduce((a, s) => a + (s - mean) ** 2, 0) / (sizes.length || 1);
  const cv = mean > 0 ? Math.sqrt(variance) / mean : 0;
  const inSpec = pieces.length ? pieces.filter((p) => Math.abs(p.deviation) <= IN_SPEC_TOLERANCE).length / pieces.length : 0;
  const score = pieces.length >= MIN_PIECES ? scoreFromCv(cv) : null;

  return { width: w, height: h, pieces, edgeBlobs, cv, inSpec, score, labels };
}

/** Paints each detected piece over the photo: green in spec, amber a bit off, red well off. */
export function drawOverlay(ctx: CanvasRenderingContext2D, image: ImageData, analysis: Analysis) {
  const out = ctx.createImageData(image.width, image.height);
  const src = image.data;
  const dst = out.data;
  const n = image.width * image.height;
  for (let i = 0; i < n; i++) {
    const l = analysis.labels[i];
    const o = i * 4;
    if (l < 0) {
      // Dim the background so the pieces pop.
      dst[o] = src[o] * 0.45;
      dst[o + 1] = src[o + 1] * 0.45;
      dst[o + 2] = src[o + 2] * 0.45;
      dst[o + 3] = 255;
      continue;
    }
    const dev = Math.abs(analysis.pieces[l].deviation);
    const tint = dev <= IN_SPEC_TOLERANCE ? [45, 106, 79] : dev <= IN_SPEC_TOLERANCE * 2 ? [184, 134, 11] : [170, 51, 51];
    dst[o] = src[o] * 0.5 + tint[0] * 0.5;
    dst[o + 1] = src[o + 1] * 0.5 + tint[1] * 0.5;
    dst[o + 2] = src[o + 2] * 0.5 + tint[2] * 0.5;
    dst[o + 3] = 255;
  }
  ctx.putImageData(out, 0, 0);
}

// ---- helpers ----

function edgeMedianColor(image: ImageData): [number, number, number] {
  const { width: w, height: h, data } = image;
  const band = Math.max(2, Math.round(Math.min(w, h) * 0.03));
  const rs: number[] = [];
  const gs: number[] = [];
  const bs: number[] = [];
  const push = (x: number, y: number) => {
    const o = (y * w + x) * 4;
    rs.push(data[o]);
    gs.push(data[o + 1]);
    bs.push(data[o + 2]);
  };
  // Sample every other pixel of the band; plenty for a median.
  for (let y = 0; y < h; y += 2) {
    for (let x = 0; x < w; x += 2) {
      if (x < band || x >= w - band || y < band || y >= h - band) push(x, y);
    }
  }
  return [median(rs), median(gs), median(bs)];
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/** Otsu's method: the threshold that best splits a histogram into two classes. */
function otsu(values: Uint8ClampedArray): number {
  const hist = new Float64Array(256);
  for (let i = 0; i < values.length; i++) hist[values[i]]++;
  const total = values.length;
  let sum = 0;
  for (let t = 0; t < 256; t++) sum += t * hist[t];
  let sumB = 0;
  let wB = 0;
  let best = 0;
  let threshold = 0;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;
    sumB += t * hist[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) ** 2;
    if (between > best) {
      best = between;
      threshold = t;
    }
  }
  return threshold;
}

/** Square erosion by `radius` pixels, done as two 1-D passes. */
function erode(mask: Uint8Array, w: number, h: number, radius: number): Uint8Array {
  if (radius <= 0) return mask.slice();
  const tmp = new Uint8Array(mask.length);
  const out = new Uint8Array(mask.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let v = 1;
      for (let k = -radius; k <= radius && v; k++) {
        const xx = x + k;
        if (xx < 0 || xx >= w || !mask[y * w + xx]) v = 0;
      }
      tmp[y * w + x] = v;
    }
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let v = 1;
      for (let k = -radius; k <= radius && v; k++) {
        const yy = y + k;
        if (yy < 0 || yy >= h || !tmp[yy * w + x]) v = 0;
      }
      out[y * w + x] = v;
    }
  }
  return out;
}

/** 8-connected labelling with an explicit stack (photos are far too big for recursion). */
function labelComponents(mask: Uint8Array, w: number, h: number) {
  const labels = new Int32Array(mask.length).fill(-1);
  const areas: number[] = [];
  const touchesEdge: boolean[] = [];
  const stack: number[] = [];
  let count = 0;
  for (let start = 0; start < mask.length; start++) {
    if (!mask[start] || labels[start] >= 0) continue;
    const l = count++;
    let area = 0;
    let edge = false;
    labels[start] = l;
    stack.push(start);
    while (stack.length) {
      const i = stack.pop()!;
      area++;
      const x = i % w;
      const y = (i / w) | 0;
      if (x === 0 || y === 0 || x === w - 1 || y === h - 1) edge = true;
      for (let dy = -1; dy <= 1; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= h) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          if (xx < 0 || xx >= w) continue;
          const j = yy * w + xx;
          if (mask[j] && labels[j] < 0) {
            labels[j] = l;
            stack.push(j);
          }
        }
      }
    }
    areas.push(area);
    touchesEdge.push(edge);
  }
  return { labels, count, areas, touchesEdge };
}

/**
 * Grows each label outwards `steps` times, but only into pixels the original
 * mask marked as onion, so pieces get their full outline back without merging.
 */
function growLabels(labels: Int32Array, mask: Uint8Array, w: number, h: number, steps: number) {
  for (let s = 0; s < steps; s++) {
    const next = labels.slice();
    let changed = false;
    for (let i = 0; i < labels.length; i++) {
      if (!mask[i] || labels[i] >= 0) continue;
      const x = i % w;
      const y = (i / w) | 0;
      const candidates = [
        x > 0 ? labels[i - 1] : -1,
        x < w - 1 ? labels[i + 1] : -1,
        y > 0 ? labels[i - w] : -1,
        y < h - 1 ? labels[i + w] : -1,
      ];
      for (const c of candidates) {
        if (c >= 0) {
          next[i] = c;
          changed = true;
          break;
        }
      }
    }
    labels.set(next);
    if (!changed) break;
  }
}
