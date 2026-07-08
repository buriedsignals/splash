// Point-based scroll/story derivation — the symbol sibling of map-story's
// deriveMapStory. Emits the SAME Beat shape (camera is a [w,s,e,n] bbox) so the
// scrolly's mapStoryToChapters consumes it unchanged. title → establish (points
// bbox) → reveal each city (value desc, callout name+value, camera = a small bbox
// around the city) → takeaway (points bbox).
import type { SymbolPoint } from "./symbol-geo";
import type { Beat } from "./map-story";
import { formatLocaleNumber, type Lang } from "./core/locale";

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
  const bounds: [number, number, number, number] = [
    Math.min(...lons),
    Math.min(...lats),
    Math.max(...lons),
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
