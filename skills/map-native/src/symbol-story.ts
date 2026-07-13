// Point-based scroll/story derivation — the symbol sibling of map-story's
// deriveMapStory. Emits the SAME Beat shape (camera is a [w,s,e,n] bbox) so the
// scrolly's mapStoryToChapters consumes it unchanged. title → establish (points
// bbox) → reveal each city (value desc, callout name+value, camera = a small bbox
// around the city) → takeaway (points bbox).
import type { SymbolPoint } from "./symbol-geo";
import type { Beat } from "./map-story";
import { formatLocaleNumber, type Lang } from "./core/locale";
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
  // Mirrors deriveMapStory's fmt (map-story.ts) — same helper, same convention: the
  // caller's `unit` string carries its own leading space when one is needed ("$bn" vs
  // " nights"), the localizer only handles thousands-grouping/decimal per `meta.lang`.
  const fmt = (v: number) =>
    `${formatLocaleNumber(Math.round(v), meta.lang)}${unit}`;

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
