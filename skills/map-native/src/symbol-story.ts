// Point-based scroll/story derivation — the symbol sibling of map-story's
// deriveMapStory. Emits the SAME Beat shape (camera is a [w,s,e,n] bbox) so the
// scrolly's mapStoryToChapters consumes it unchanged. title → establish (points
// bbox) → reveal each city (value desc, callout name+value, camera = a small bbox
// around the city) → takeaway (points bbox).
import type { SymbolPoint } from "./symbol-geo";
import type { Beat, RevealMode } from "./map-story";
import { formatLocaleNumber, labelWithUnit, type Lang } from "./core/locale";
import { shortWayLongitudeExtent } from "./core/longitude";

export interface SymbolStoryMeta {
  title: string;
  insight?: string;
  unit?: string;
  /** deliverable language — localizes the callout numbers. Default English. */
  lang?: Lang;
}

// Half-width (degrees) of the city framing box → a tight, legible city zoom.
const CITY_DELTA = 1.5;

export const DEFAULT_MAX_REVEALS = 5;

export function deriveSymbolStory(
  points: SymbolPoint[],
  meta: SymbolStoryMeta,
  opts: { maxReveals?: number } = {},
): Beat[] {
  const unit = meta.unit ?? "";
  // The callout shows the FULL grouped number (not the direct label's k/M abbreviation),
  // localized per `meta.lang`. It must NOT integer-round — a magnitude 7.4 stays "7,4"
  // (the reported "7magnitude" bug was Math.round + no unit spacing). labelWithUnit adds
  // the locale-aware spacing (a word unit like "magnitude" gets a space; a symbol unit
  // like "$bn" attaches) and normalizes any caller-supplied leading space on `unit`.
  const fmt = (v: number) =>
    labelWithUnit(formatLocaleNumber(v, meta.lang), unit, meta.lang);

  const lons = points.map((p) => p.lon);
  const lats = points.map((p) => p.lat);
  // Antimeridian-aware west/east (see core/longitude.ts): a naive min/max box tears a
  // Pacific-spanning dataset (Alaska −176.6° … Japan +142.4° … Chile −73.2°) into a
  // 343°-wide, Africa-centred view with the data split at both frame edges — which then
  // makes every reveal→reveal camera flight cross the whole globe fetching high-zoom
  // tiles for empty territory (the video-hang trigger) and clips edge labels. `east`
  // may exceed +180 (unwrapped) so cameraForBounds centres on the true Pacific midpoint.
  const { west, east } = shortWayLongitudeExtent(lons);
  const bounds: [number, number, number, number] = [
    west,
    Math.min(...lats),
    east,
    Math.max(...lats),
  ];

  const beats: Beat[] = [];
  beats.push({
    kind: "title",
    camera: bounds,
    highlight: [],
    dim: false,
    callout: null,
    copy: meta.title,
  });
  beats.push({
    kind: "establish",
    camera: bounds,
    highlight: [],
    dim: false,
    callout: null,
    copy: "",
  });

  const sorted = [...points].sort((a, b) => b.value - a.value);
  const cap = Math.max(
    1,
    Math.min(opts.maxReveals ?? DEFAULT_MAX_REVEALS, sorted.length),
  );
  for (const p of sorted.slice(0, cap)) {
    const name = p.label ?? "";
    const value = fmt(p.value);
    const text = `${name} — ${value}`;
    beats.push({
      kind: "reveal",
      camera: [
        p.lon - CITY_DELTA,
        p.lat - CITY_DELTA,
        p.lon + CITY_DELTA,
        p.lat + CITY_DELTA,
      ],
      highlight: [name],
      dim: true,
      callout: { region: name, name, value, text },
      copy: text,
    });
  }

  beats.push({
    kind: "takeaway",
    camera: bounds,
    highlight: [],
    dim: false,
    callout: null,
    copy: meta.insight && meta.insight !== meta.title ? meta.insight : "",
  });

  return beats;
}

/**
 * Per-mark entrance trigger frame for SymbolStory's choreography — every point gets one,
 * not just the top-N reveal-beat subjects `triggerFrameByRegion` returns (that map only
 * covers the marks a reveal beat actually visits, capped by `maxReveals`).
 *  - context: every mark establishes TOGETHER, at the establish beat's own start frame.
 *  - sequential: a mark with its own reveal beat (`revealTriggers`, keyed by name/label,
 *    the SAME key `deriveSymbolStory` puts in a reveal beat's `highlight[0]`) triggers at
 *    that beat's start frame — marks appear one-by-one. A mark with no reveal beat (beyond
 *    `maxReveals`) never triggers — it stays hidden (radius/opacity/label all 0) for the
 *    whole story, since sequential's narrative never visits it.
 */
export function markTriggerFrames(
  points: SymbolPoint[],
  mode: RevealMode,
  establishStartFrame: number,
  revealTriggers: Map<string, number>,
): Map<string, number> {
  const out = new Map<string, number>();
  for (const p of points) {
    const key = p.label ?? "";
    out.set(
      key,
      mode === "context"
        ? establishStartFrame
        : (revealTriggers.get(key) ?? Number.POSITIVE_INFINITY),
    );
  }
  return out;
}
