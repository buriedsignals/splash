// camera-measure.ts — READ A MAP CAMERA OFF THE RENDERED PIXELS.
//
// ★ THE ONLY INSTRUMENT THAT SURVIVED SCRUTINY: solve the zoom from the PIXEL DISTANCE
//   BETWEEN MARKS WHOSE REAL COORDINATES ARE KNOWN.
//
// Web Mercator puts a mark at (lon,lat) at unit coordinates (u,v) ∈ [0,1]²; on screen it
// sits at px = s·(u,v) + o, where s = TILE_SIZE·2^zoom and o is the camera's translation.
// TWO marks give s, and s alone gives the zoom. o cancels out, so a map div inset inside a
// video frame, furniture bars, letterboxing — none of it costs anything. That is the whole
// method, and it is arithmetic: everything below the frame-decoding boundary is testable
// against synthetic pixels with no render at all (camera-measure.test.ts).
//
// ★ WHY THIS AND NOT THE TWO INSTRUMENTS THAT CAME FIRST. Both were tried on the tour-box
//   work (2026-08-07, see skills/map-native/src/core/tour-box.ts) and both were WRONG:
//
//   · A WHOLE-FRAME PIXEL-DIFFERENCE metric measures INK, NOT CAMERA. It moved the wrong
//     way on a fix that was correct — a tighter camera shows fewer labels and less
//     coastline, so "more different" and "more zoomed" are not the same axis and can point
//     in opposite directions. lib/core/video-verify.ts's diffRatio is the right tool for
//     "did this frame change"; it is the wrong tool for "where is the camera".
//   · An IoU DISC-FIT (fit a circle to the visible marks, compare areas) returned z≈4.2 on
//     the case this method reads as 9.06 — off by five doublings, because a disc fitted to
//     a dimmed mark set is fitting opacity, not geometry.
//   · SHA-256 of two mp4s is not an instrument at all: the render is NOT byte-deterministic.
//     Three renders of the SAME config by the SAME code produced three different hashes
//     (sizes 10359783 / 10359802 / 10359730). See NOISE FLOOR below for what this method
//     reads on two of those same files.
//
// ★ WHAT THIS MODULE DOES NOT DO: no IO, no ffmpeg, no rendering. It consumes decoded
//   packed-RGB24 frames (the `RawFrame` its sibling video-verify.ts already defines) and
//   returns numbers. The IO shell — extracting a beat's settled frame out of an mp4, and
//   deriving which frame that is — lives with the engine that owns the beats:
//   skills/map-native/scripts/measure-camera.mjs. Same split, and the same reason, as
//   video-verify.ts vs scripts/snap-video.mjs: a measuring tool you cannot unit-test is a
//   measuring tool you cannot trust.
//
// ────────────────────────────────────────────────────────────────────────────────────────
// ★ STATED LIMITS — read these before quoting a number this module returns.
// ────────────────────────────────────────────────────────────────────────────────────────
//
// L1 — TWO MARKS OR NO READING. A zoom is a SCALE, and a scale needs a baseline. One mark
//   in frame gives none, so this returns `no-reading` rather than a number. This is not a
//   defect to route around, it is the measurement talking: on the four-glacier tour every
//   stop kept a neighbour in frame and every stop read; on the capped continental tour NO
//   stop kept one, and that unreadability IS the finding — the tighter the true framing,
//   the fewer neighbours remain. Measure the establishing beat, which always holds the
//   whole set, and read the stops relative to it.
//
// L2 — CENTROIDS FAIL ON OVERLAP, and the failure is LAYERED. Two marks whose painted
//   circles touch merge into ONE connected component with ONE centroid midway between them.
//   What that costs depends on how deep the overlap runs, and all three regimes are safe —
//   MEASURED on 7-9 px discs at 1280x720, not reasoned:
//     · NEAR-TOUCHING (centres ~1.8-2.1 radii apart): the merged component is wider than it
//       is tall, the disc filter drops it, and BOTH marks are lost. The beat reads
//       `no-reading` (L1). A missing reading.
//     · DEEPLY OVERLAPPED (centres under ~1.4 radii): the component is round enough to
//       survive as one blob. If that pair IS the frame, one blob is still no reading (L1).
//       Among other marks its centroid sits a pixel or two from BOTH marks it merged —
//       close enough that the fit is unharmed: measured 8.479 and 8.480 against a true
//       8.478, i.e. inside this instrument's own ±0.02 (L5).
//     · THE BAND BETWEEN, where the merged centroid is far enough from either mark to force
//       a bad correspondence yet near enough to be admitted as an inlier: this is precisely
//       what MAX_FIT_RESIDUAL_PX exists for. Measured at an 8-px separation —
//       `residual-too-high`, refused.
//   The cost of overlap is a missing reading or a refused one. It is NEVER a distance short
//   by half. That ordering is the point, and it is why neither the disc filter nor the
//   residual gate is optional: they cover different halves of this failure.
//
// L3 — THE HUE MASK IS A FALLBACK, AND IT COSTS FALSE CANDIDATES. Matching the nominal fill
//   by RGB distance does not work: a mark is painted at ~0.95 opacity when it is the beat's
//   subject and ~0.25 when it is not (LocatorStory's DIM_OPACITY), so an RGB match finds the
//   subject and LOSES EVERY NEIGHBOUR — which by L1 means no reading at all. Blending
//   toward the basemap moves SATURATION, not HUE, so this keys on hue with a low saturation
//   floor and finds dimmed marks too. What that buys in recall it pays in precision: any
//   basemap furniture sharing the hue is now a candidate. MEASURED on the continental case
//   — a blue symbol map (#2171b5, hue ≈207) over a basemap whose WATER is hue 205-210: the
//   frame carries 12 992 hue-matching pixels of which ~340 are marks, a 38:1 false-candidate
//   ratio. Three guards, in order, pay that bill: `isCircular` (water is not round), RANSAC
//   over blob-pair × mark-pair (a false blob cannot agree with a real correspondence), and
//   the residual gate. All three held: that frame read 6 blobs, 6 inliers, rms 0.06 px.
//
// L4 — A WRONG NUMBER IS WORSE THAN NO NUMBER, so the residual gate refuses. A fit whose
//   RMS residual exceeds MAX_FIT_RESIDUAL_PX is two blobs that happen to sit at some
//   distance (a lake the colour of a symbol, a label edge), not a camera. Real fits measure
//   0.03-0.35 px; the gate sits at 1.0.
//
// L5 — CODEC NOISE FLOOR. h264 4:2:0 shifts antialiased edges, so two same-code renders are
//   not pixel-identical: max |Δ| 7 per channel between them, which is why ±40
//   (STILL_MATCH_CHANNEL_TOLERANCE) is a FLOOR for frame comparison, not a preference.
//   What that noise costs THIS instrument was measured directly, on the two same-config
//   same-code renders whose SHA-256s differ (2703230… / af3c213…, 10359783 / 10359730 bytes).
//   Both read zoom 4.224 and centre (4.8686, 47.7899) — and the reason is stronger than
//   "it averages out": their HUE MASKS CAME OUT BIT-IDENTICAL at every measured beat. The
//   codec noise that defeats SHA-256 never reaches the mask, because a mark's interior sits
//   nowhere near the hue/saturation thresholds — only a pixel balanced exactly on one could
//   flip, and a disc of hundreds of pixels does not turn on its edge.
//   Two INDEPENDENT samples of one camera do exist and do differ: a tour's `establish` and
//   `takeaway` beats frame the same box hundreds of frames apart, and read 8.478 vs 8.477.
//   The spread across four stops of one tour that should all be equal is 9.466-9.480.
//   ⇒ Do not assert a measured zoom tighter than ±0.02 levels. The instrument is REPRODUCIBLE
//   WHERE THE ARTIFACT IS NOT, which is exactly why it exists.
//
// L6 — CANDIDATE BUDGET. The RANSAC is O(blobs² · marks²) with an O(blobs · marks) inner
//   loop. That is nothing at the scale a tour actually renders (≤ 6 of each), but a frame
//   whose hue mask shatters into hundreds of round fragments would spend minutes finding
//   nothing. Past MAX_CANDIDATE_BLOBS this refuses with `too-many-candidates` rather than
//   hang — tighten the hue tolerance or measure a beat with fewer marks in frame.
//
// L7 — THE ZOOM IS THE TRUSTWORTHY NUMBER; THE CENTRE IS FRAME-RELATIVE. The translation
//   `o` cancels out of the scale, so ZOOM is immune to where the map sits inside the frame
//   (that is L-zero of this method). The CENTRE is not: `measureCamera` inverts the fit at
//   the FRAME's own midpoint, which equals the map's centre only if the map div fills the
//   frame. In a story video it does not — furniture is laid over and around it. MEASURED on
//   the four-glacier tour: the reported centre sits 0.0534° north of the establishing box's
//   centre at z 8.478, and 0.0264° north of the stop box's centre at z 9.47. Those are not
//   two different errors — they are ONE CONSTANT PIXEL OFFSET of ≈ 39 px seen at two zooms
//   (39.3 px and 38.6 px when converted through each frame's own scale; one zoom level
//   doubles the scale and so halves the same offset in degrees). Read the centre as "the
//   camera, plus this render's furniture inset", and compare centres only between beats at
//   the SAME zoom. The zoom itself carries no such caveat.

import type { RawFrame } from "./video-verify";

export type { RawFrame };

// ---------------------------------------------------------------------------------
// Tuning knobs (each = one number; see repo convention). Calibrated on the real
// locator/symbol tour renders of 2026-08-07 at 1280x720 — the measurements behind each
// number are quoted in its own comment.
// ---------------------------------------------------------------------------------

/** MapLibre/MapTiler render at 512-px tiles, so the whole world spans 512·2^zoom px. This
 *  is the constant that turns a measured pixel scale into a zoom level; a 256 here would
 *  report every zoom exactly one level too high. */
export const TILE_SIZE = 512;

/** Degrees of hue a pixel may sit from the nominal mark fill and still count. Dimming a
 *  mark toward the basemap moves saturation and value but leaves hue within a few degrees;
 *  14 admits a 0.25-opacity mark while excluding the next Okabe-Ito neighbour (the closest
 *  adjacent pair in that palette is ~30° apart). */
export const HUE_TOLERANCE_DEG = 14;

/** Saturation floor for a candidate pixel. Below this a pixel's hue is numerically unstable
 *  (a near-grey's hue is decided by ±1 of encode noise), so admitting it would let the
 *  basemap's greys into the mask. A mark dimmed to 0.25 over a light basemap still measures
 *  well above this. */
export const MIN_SATURATION = 0.22;

/** Value (brightness) floor for a candidate pixel — excludes near-black basemap ink whose
 *  hue is as unstable as a near-grey's. */
export const MIN_VALUE = 0.12;

/** Smallest blob (px) that counts as a mark. Below this the centroid is dominated by
 *  antialiasing and by L5's codec noise; a real mark at the tightest zoom a tour reaches
 *  measures in the hundreds. */
export const MIN_BLOB_PIXELS = 12;

/** Largest blob (px) that counts as a mark. A mark that filled more than this is not a mark
 *  — it is a basemap region sharing the hue (L3). */
export const MAX_BLOB_PIXELS = 40000;

/** Minimum filled fraction of its own bounding box for a blob to read as a disc. A circle
 *  fills π/4 ≈ 0.785 of its box; basemap landuse polygons and road casings that happen to
 *  share the hue fill far less. 0.6 leaves room for the ring stroke and for a mark clipped
 *  by the frame edge. */
export const MIN_BLOB_FILL = 0.6;

/** Bounding-box aspect band (w/h) a blob must sit inside to read as a disc. A circle is 1;
 *  a river or a road casing is nowhere near. */
export const MIN_BLOB_ASPECT = 0.6;
export const MAX_BLOB_ASPECT = 1.7;

/** Pixels a blob may sit from a mark's predicted position and still count as that mark
 *  under a candidate fit. Wide enough to forgive centroid noise and the ring stroke,
 *  narrow enough that a wrong correspondence at these zooms lands tens of px away. */
export const INLIER_TOLERANCE_PX = 5;

/** RMS residual (px) above which a fit is REFUSED rather than reported — see L4. Real fits
 *  on real renders measure 0.03-0.35; this sits ~3x above the worst of them. */
export const MAX_FIT_RESIDUAL_PX = 1.0;

/** Candidate blobs past which this refuses to search rather than hang — see L6. A tour
 *  frame carries ≤ 6; 64 is a hang guard, not a capability bar. */
export const MAX_CANDIDATE_BLOBS = 64;

// ---------------------------------------------------------------------------------
// Web Mercator — the projection MapLibre renders in, unit square, north-up.
// ---------------------------------------------------------------------------------

/** A mark of known real-world position. `label` is carried only so a fit can report WHICH
 *  marks it matched — the arithmetic never reads it. */
export interface Mark {
  label: string;
  lon: number;
  lat: number;
}

/** Unit-square Web Mercator coordinates: u ∈ [0,1] west→east, v ∈ [0,1] north→south. */
export interface UnitPoint {
  u: number;
  v: number;
}

/**
 * (lon,lat) → unit-square Web Mercator. Longitude is taken AS GIVEN and never wrapped: an
 * antimeridian-straddling set arrives here already unwrapped by core/longitude.ts's
 * `shortWayLongitudeExtent` (east may exceed +180), and re-wrapping it would tear the frame
 * this measurement is trying to read.
 */
export function mercatorUV(lon: number, lat: number): UnitPoint {
  return {
    u: (lon + 180) / 360,
    v:
      (180 -
        (180 / Math.PI) *
          Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360))) /
      360,
  };
}

/** The inverse of `mercatorUV` — used to report the camera CENTRE once a fit is solved. */
export function inverseMercator(
  u: number,
  v: number,
): { lon: number; lat: number } {
  return {
    lon: u * 360 - 180,
    lat:
      (Math.atan(Math.exp(((180 - v * 360) * Math.PI) / 180)) * 360) / Math.PI -
      90,
  };
}

/** Pixel scale (px per unit-mercator, i.e. px across the whole world) → zoom level. */
export function zoomFromScale(scalePx: number): number {
  return Math.log2(scalePx / TILE_SIZE);
}

/** Zoom level → pixel scale. The inverse of `zoomFromScale`; synthetic tests paint with it,
 *  which is what makes them a real round trip rather than a restatement. */
export function scaleFromZoom(zoom: number): number {
  return TILE_SIZE * Math.pow(2, zoom);
}

// ---------------------------------------------------------------------------------
// Mark finding — hue mask, then connected components, then a disc shape filter.
// ---------------------------------------------------------------------------------

/** [hue 0-360, saturation 0-1, value 0-1]. */
export function rgbToHsv(
  r: number,
  g: number,
  b: number,
): [number, number, number] {
  const R = r / 255;
  const G = g / 255;
  const B = b / 255;
  const mx = Math.max(R, G, B);
  const mn = Math.min(R, G, B);
  const d = mx - mn;
  let h = 0;
  if (d !== 0) {
    if (mx === R) h = 60 * (((G - B) / d) % 6);
    else if (mx === G) h = 60 * ((B - R) / d + 2);
    else h = 60 * ((R - G) / d + 4);
  }
  if (h < 0) h += 360;
  return [h, mx === 0 ? 0 : d / mx, mx];
}

/** The hue of a `#rrggbb` fill — how a caller names the colour the component paints. */
export function hueOfHex(hex: string): number {
  const h = hex.replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(h)) {
    throw new Error(`hueOfHex: expected #rrggbb, got ${JSON.stringify(hex)}`);
  }
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  return rgbToHsv(r!, g!, b!)[0];
}

export interface MaskOptions {
  /** Nominal hue of the mark fill, degrees. */
  hue: number;
  hueTolerance?: number;
  minSaturation?: number;
  minValue?: number;
}

/** Per-pixel 1/0 mask of "this pixel could belong to a mark" — see L3 for why hue and not
 *  RGB distance. Row-major, length width·height. */
export function hueMask(frame: RawFrame, opts: MaskOptions): Uint8Array {
  const { width, height, data } = frame;
  if (data.length !== width * height * 3) {
    throw new Error(
      `hueMask: frame data is ${data.length} bytes, expected ${width * height * 3} for ${width}x${height} RGB24`,
    );
  }
  const hueTol = opts.hueTolerance ?? HUE_TOLERANCE_DEG;
  const satMin = opts.minSaturation ?? MIN_SATURATION;
  const valMin = opts.minValue ?? MIN_VALUE;
  const mask = new Uint8Array(width * height);
  for (let i = 0, p = 0; i < mask.length; i++, p += 3) {
    const [h, s, v] = rgbToHsv(data[p]!, data[p + 1]!, data[p + 2]!);
    if (s < satMin || v < valMin) continue;
    let dh = Math.abs(h - opts.hue);
    if (dh > 180) dh = 360 - dh;
    if (dh <= hueTol) mask[i] = 1;
  }
  return mask;
}

/**
 * Flat run-length encoding of a 0/1 mask: [offRun, onRun, offRun, onRun, …], always
 * starting with an OFF run (which may be 0).
 *
 * This is the shape the committed ground-truth fixture stores, and it lives HERE rather
 * than in the script that writes it because the encoder and the decoder must not drift: the
 * CLI writes fixtures with `encodeMaskRuns`, the test suite reads them with
 * `decodeMaskRuns`, and a round-trip test pins the pair. A mark's mask is a few hundred runs
 * on a real tour frame, which is what makes real pixel evidence small enough to commit.
 */
export function encodeMaskRuns(mask: Uint8Array): number[] {
  const runs: number[] = [];
  let current = 0;
  let length = 0;
  for (const v of mask) {
    if (v === current) {
      length++;
    } else {
      runs.push(length);
      current = v;
      length = 1;
    }
  }
  runs.push(length);
  return runs;
}

/** Inverse of `encodeMaskRuns`. Throws when the runs do not cover exactly `length` pixels —
 *  a truncated fixture must fail loudly, not silently measure a partial frame. */
export function decodeMaskRuns(
  runs: readonly number[],
  length: number,
): Uint8Array {
  const mask = new Uint8Array(length);
  let at = 0;
  let on = 0;
  for (const run of runs) {
    if (at + run > length) {
      throw new Error(
        `decodeMaskRuns: runs overflow the mask (${at + run} > ${length})`,
      );
    }
    if (on) mask.fill(1, at, at + run);
    at += run;
    on ^= 1;
  }
  if (at !== length) {
    throw new Error(`decodeMaskRuns: runs cover ${at} px, expected ${length}`);
  }
  return mask;
}

/** One connected component of the mask that passed the disc filter. */
export interface Blob {
  /** Centroid, in pixels, of the component's own members — NOT of its bounding box. */
  x: number;
  y: number;
  pixels: number;
  boxWidth: number;
  boxHeight: number;
  /** pixels / (boxWidth·boxHeight) — π/4 ≈ 0.785 for a disc. */
  fill: number;
}

export interface BlobOptions {
  minPixels?: number;
  maxPixels?: number;
  minFill?: number;
  minAspect?: number;
  maxAspect?: number;
}

/**
 * 4-connected components of `mask`, keeping only those that read as a painted disc. The
 * shape filter is what pays L3's false-candidate bill and what makes L2's overlap failure
 * safe (a merged pair is not round, so it is dropped rather than mis-measured).
 */
export function findBlobs(
  mask: Uint8Array,
  width: number,
  height: number,
  opts: BlobOptions = {},
): Blob[] {
  const minPixels = opts.minPixels ?? MIN_BLOB_PIXELS;
  const maxPixels = opts.maxPixels ?? MAX_BLOB_PIXELS;
  const minFill = opts.minFill ?? MIN_BLOB_FILL;
  const minAspect = opts.minAspect ?? MIN_BLOB_ASPECT;
  const maxAspect = opts.maxAspect ?? MAX_BLOB_ASPECT;

  const seen = new Uint8Array(width * height);
  const stack = new Int32Array(width * height);
  const out: Blob[] = [];
  for (let start = 0; start < mask.length; start++) {
    if (!mask[start] || seen[start]) continue;
    let top = 0;
    let n = 0;
    let sx = 0;
    let sy = 0;
    let x0 = Infinity;
    let x1 = -Infinity;
    let y0 = Infinity;
    let y1 = -Infinity;
    stack[top++] = start;
    seen[start] = 1;
    while (top > 0) {
      const c = stack[--top]!;
      const x = c % width;
      const y = (c / width) | 0;
      n++;
      sx += x;
      sy += y;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
      if (x + 1 < width && mask[c + 1] && !seen[c + 1]) {
        seen[c + 1] = 1;
        stack[top++] = c + 1;
      }
      if (x - 1 >= 0 && mask[c - 1] && !seen[c - 1]) {
        seen[c - 1] = 1;
        stack[top++] = c - 1;
      }
      if (y + 1 < height && mask[c + width] && !seen[c + width]) {
        seen[c + width] = 1;
        stack[top++] = c + width;
      }
      if (y - 1 >= 0 && mask[c - width] && !seen[c - width]) {
        seen[c - width] = 1;
        stack[top++] = c - width;
      }
    }
    if (n < minPixels || n > maxPixels) continue;
    const boxWidth = x1 - x0 + 1;
    const boxHeight = y1 - y0 + 1;
    const fill = n / (boxWidth * boxHeight);
    const aspect = boxWidth / boxHeight;
    if (fill < minFill || aspect < minAspect || aspect > maxAspect) continue;
    out.push({ x: sx / n, y: sy / n, pixels: n, boxWidth, boxHeight, fill });
  }
  return out;
}

/** hueMask + findBlobs: the mark candidates in one decoded frame. */
export function findMarks(
  frame: RawFrame,
  opts: MaskOptions & BlobOptions,
): Blob[] {
  return findBlobs(hueMask(frame, opts), frame.width, frame.height, opts);
}

// ---------------------------------------------------------------------------------
// The fit — px = scale·(u,v) + offset, solved by RANSAC then least squares.
// ---------------------------------------------------------------------------------

export interface CameraFit {
  /** THE ANSWER: the map zoom level the frame was rendered at. */
  zoom: number;
  /** px per unit-mercator (px across the whole world at this zoom). */
  scalePx: number;
  offsetX: number;
  offsetY: number;
  /** How many blobs the winning correspondence explained. */
  inliers: number;
  /** RMS residual of the refined fit, px — the honesty number (L4). */
  residualPx: number;
  /** Labels of the marks that were matched, in blob order. */
  matched: string[];
}

/** A fit plus the camera centre it implies — see L7 on what that centre is and is not.
 *  Only `measureCamera` can produce one: the centre is read at the FRAME's midpoint, and
 *  `fitCamera` works in blob space and has no frame. */
export interface MeasuredCamera extends CameraFit {
  centreLon: number;
  centreLat: number;
}

export type FitResult =
  | { ok: true; fit: CameraFit }
  | { ok: false; reason: MeasureRefusal; detail: string };

export type CameraReading =
  | { ok: true; fit: MeasuredCamera }
  | { ok: false; reason: MeasureRefusal; detail: string };

export type MeasureRefusal =
  /** Fewer than two mark candidates in frame — L1/L2. */
  | "no-reading"
  /** Candidates exist but no correspondence explained two of them — L3. */
  | "no-fit"
  /** A fit was found but its residual exceeds the gate — L4. */
  | "residual-too-high"
  /** More candidate blobs than the search budget — L6. */
  | "too-many-candidates";

export interface FitOptions {
  inlierTolerancePx?: number;
  maxResidualPx?: number;
  maxCandidateBlobs?: number;
}

/**
 * Solve the camera from blob positions and known mark coordinates.
 *
 * RANSAC over blob-pair × mark-pair, not a direct assignment: legend swatches, a lake the
 * colour of a symbol and any other same-hue furniture (L3) must be REJECTED AS OUTLIERS
 * rather than silently biasing a least-squares fit over everything found. Each hypothesis
 * fixes scale+translation from one blob-pair/mark-pair, collects whatever else it explains
 * within `inlierTolerancePx`, then refits by least squares over its inliers only. The
 * hypothesis explaining the most blobs wins; ties break on residual.
 *
 * Only scale and translation are solved — no rotation, no shear. Web Mercator as MapLibre
 * renders it is axis-aligned and north-up, so a rotation parameter would be a free variable
 * fitting noise. A rotated (bearing ≠ 0) render is therefore OUT OF SCOPE and will read as
 * `no-fit` rather than as a wrong zoom.
 */
export function fitCamera(
  blobs: readonly Blob[],
  marks: readonly Mark[],
  opts: FitOptions = {},
): FitResult {
  const tolPx = opts.inlierTolerancePx ?? INLIER_TOLERANCE_PX;
  const maxResidual = opts.maxResidualPx ?? MAX_FIT_RESIDUAL_PX;
  const maxBlobs = opts.maxCandidateBlobs ?? MAX_CANDIDATE_BLOBS;

  if (blobs.length > maxBlobs) {
    return {
      ok: false,
      reason: "too-many-candidates",
      detail: `${blobs.length} candidate blobs exceeds the search budget of ${maxBlobs} — tighten the hue tolerance or measure a beat with fewer marks in frame`,
    };
  }
  if (blobs.length < 2 || marks.length < 2) {
    return {
      ok: false,
      reason: "no-reading",
      detail: `a zoom needs two marks sharing the frame; found ${blobs.length} mark candidate(s) against ${marks.length} known mark(s)`,
    };
  }

  const uv = marks.map((m) => ({ mark: m, ...mercatorUV(m.lon, m.lat) }));
  let best: CameraFit | null = null;

  for (let i = 0; i < blobs.length; i++) {
    for (let j = i + 1; j < blobs.length; j++) {
      const dPx = Math.hypot(
        blobs[j]!.x - blobs[i]!.x,
        blobs[j]!.y - blobs[i]!.y,
      );
      // Two blobs closer than the inlier tolerance cannot discriminate a scale: any
      // hypothesis built on them is noise amplified by division.
      if (dPx <= tolPx) continue;
      for (let p = 0; p < uv.length; p++) {
        for (let q = 0; q < uv.length; q++) {
          if (p === q) continue;
          const dM = Math.hypot(uv[q]!.u - uv[p]!.u, uv[q]!.v - uv[p]!.v);
          if (dM === 0) continue;
          const s = dPx / dM;
          const ox = blobs[i]!.x - s * uv[p]!.u;
          const oy = blobs[i]!.y - s * uv[p]!.v;

          // Greedy nearest-mark assignment under this hypothesis. Greedy is safe here
          // because the hypothesis is already a near-exact transform when it is the right
          // one: real marks land sub-pixel, so there is no contested assignment to lose.
          const used = new Set<number>();
          const pairs: Array<{
            blob: Blob;
            u: number;
            v: number;
            label: string;
          }> = [];
          for (const b of blobs) {
            let bestK = -1;
            let bestD = Infinity;
            for (let k = 0; k < uv.length; k++) {
              if (used.has(k)) continue;
              const d = Math.hypot(
                b.x - (s * uv[k]!.u + ox),
                b.y - (s * uv[k]!.v + oy),
              );
              if (d < bestD) {
                bestD = d;
                bestK = k;
              }
            }
            if (bestK >= 0 && bestD <= tolPx) {
              used.add(bestK);
              pairs.push({
                blob: b,
                u: uv[bestK]!.u,
                v: uv[bestK]!.v,
                label: uv[bestK]!.mark.label,
              });
            }
          }
          if (pairs.length < 2) continue;

          // Least-squares refine over the inliers: one isotropic scale + a translation
          // (Mercator is axis-aligned, so x and y share the scale by construction — fitting
          // them separately would let a bad correspondence hide as an anisotropy).
          const n = pairs.length;
          const bx = pairs.reduce((a, r) => a + r.blob.x, 0) / n;
          const by = pairs.reduce((a, r) => a + r.blob.y, 0) / n;
          const mu = pairs.reduce((a, r) => a + r.u, 0) / n;
          const mv = pairs.reduce((a, r) => a + r.v, 0) / n;
          let num = 0;
          let den = 0;
          for (const r of pairs) {
            num += (r.blob.x - bx) * (r.u - mu) + (r.blob.y - by) * (r.v - mv);
            den += (r.u - mu) ** 2 + (r.v - mv) ** 2;
          }
          // Defence in depth, and honestly labelled as such: `den === 0` would divide by
          // zero (every inlier on one coincident point), `num <= 0` would make the scale
          // NEGATIVE and the zoom `log2` of a negative — a NaN reported as a reading.
          // ⚠ MEASURED by mutation (2026-08-08): removing EITHER leaves the whole suite
          // green, because neither is reachable today. The seed constraint above requires
          // `dPx > tolPx`, so every inlier set spans more than the tolerance around a
          // POSITIVE-scale prediction, which keeps the covariance positive and non-zero.
          // They are kept, not deleted, because that constraint is the only thing making
          // them dead: loosen it and both go live, and a NaN zoom is exactly the "wrong
          // number" this instrument refuses to produce (L4). The CONTRACT they protect is
          // pinned by tests instead — a mirrored frame and a coincident mark pair must both
          // come back refused, whichever branch does the refusing.
          if (den === 0 || num <= 0) continue;
          const scale = num / den;
          const offsetX = bx - scale * mu;
          const offsetY = by - scale * mv;
          let rss = 0;
          for (const r of pairs) {
            rss +=
              (r.blob.x - (scale * r.u + offsetX)) ** 2 +
              (r.blob.y - (scale * r.v + offsetY)) ** 2;
          }
          const residualPx = Math.sqrt(rss / n);
          const cand: CameraFit = {
            zoom: zoomFromScale(scale),
            scalePx: scale,
            offsetX,
            offsetY,
            inliers: n,
            residualPx,
            matched: pairs.map((r) => r.label),
          };
          if (
            !best ||
            cand.inliers > best.inliers ||
            (cand.inliers === best.inliers && cand.residualPx < best.residualPx)
          ) {
            best = cand;
          }
        }
      }
    }
  }

  if (!best) {
    return {
      ok: false,
      reason: "no-fit",
      detail: `${blobs.length} candidate blob(s) but no correspondence to the ${marks.length} known mark(s) explained two of them within ${tolPx} px`,
    };
  }
  if (best.residualPx > maxResidual) {
    return {
      ok: false,
      reason: "residual-too-high",
      detail: `best fit explains ${best.inliers} blob(s) at ${best.residualPx.toFixed(2)} px RMS, past the ${maxResidual} px gate — these are blobs at some distance, not a camera`,
    };
  }
  return { ok: true, fit: best };
}

/**
 * The whole instrument: a decoded frame plus the marks it should contain → the camera.
 *
 * The centre is inverted from the fit at the frame's own midpoint, which is what makes it a
 * CAMERA reading rather than a mark reading: it answers "where is this map looking", not
 * "where did these dots land".
 */
export function measureCamera(
  frame: RawFrame,
  marks: readonly Mark[],
  opts: MaskOptions & BlobOptions & FitOptions,
): CameraReading {
  const blobs = findMarks(frame, opts);
  const reading = fitCamera(blobs, marks, opts);
  if (!reading.ok) return reading;
  const { scalePx, offsetX, offsetY } = reading.fit;
  const centre = inverseMercator(
    (frame.width / 2 - offsetX) / scalePx,
    (frame.height / 2 - offsetY) / scalePx,
  );
  return {
    ok: true,
    fit: { ...reading.fit, centreLon: centre.lon, centreLat: centre.lat },
  };
}
