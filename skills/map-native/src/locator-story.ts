// Beat derivation for locator videos — the sibling of deriveSymbolStory. Two regimes:
// few-annotated (a beat per PLACE, camera on a tight box, caption = the marker note) and
// categorized (a beat per CATEGORY, camera on that category's markers, caption = category + count).
// title → establish (all markers) → reveals → takeaway. Same Beat shape as choropleth/symbol.
import type { Beat } from "./map-story";
import type { LocatorMarker } from "./locator-geo";
import { shortWayLongitudeExtent } from "./core/longitude";

export interface LocatorStoryMeta {
  title: string;
  description?: string;
  insight?: string;
}

const CITY_DELTA = 1.5; // half-width (deg) of a tight place-framing box
const DEFAULT_MAX_REVEALS = 5;

function bboxOf(ms: LocatorMarker[]): [number, number, number, number] {
  const lons = ms.map((m) => m.lon);
  const lats = ms.map((m) => m.lat);
  // Antimeridian-aware west/east (see core/longitude.ts): identity for non-straddling
  // data, but `east` may exceed +180 (unwrapped) for Pacific-spanning markers so the
  // camera frames the true midpoint, not the empty far side. Mirrors deriveSymbolStory.
  const { west, east } = shortWayLongitudeExtent(lons);
  return [west, Math.min(...lats), east, Math.max(...lats)];
}

// Guarantee a minimum extent so a single-marker (or all-coincident) category does not collapse
// to a zero-area bbox — which would over-zoom the camera. Mirrors the per-place ±CITY_DELTA box.
function padBbox(
  b: [number, number, number, number],
): [number, number, number, number] {
  const [w, s, e, n] = b;
  const padW = e - w < CITY_DELTA * 2 ? (CITY_DELTA * 2 - (e - w)) / 2 : 0;
  const padH = n - s < CITY_DELTA * 2 ? (CITY_DELTA * 2 - (n - s)) / 2 : 0;
  return [w - padW, s - padH, e + padW, n + padH];
}

export function deriveLocatorStory(
  markers: LocatorMarker[],
  meta: LocatorStoryMeta,
  opts: { maxReveals?: number } = {},
): Beat[] {
  const cap = Math.max(1, opts.maxReveals ?? DEFAULT_MAX_REVEALS);
  const allBounds = bboxOf(markers);

  const beats: Beat[] = [];
  beats.push({
    kind: "title",
    camera: allBounds,
    highlight: [],
    dim: false,
    callout: null,
    copy: meta.title,
  });
  beats.push({
    kind: "establish",
    camera: allBounds,
    highlight: [],
    dim: false,
    callout: null,
    copy: "",
  });

  const categories = [
    ...new Set(
      markers
        .map((m) => m.category)
        .filter((c): c is string => !!c && c.trim().length > 0),
    ),
  ].sort();

  if (categories.length > 0) {
    // Categorized regime: a beat per category (capped).
    for (const cat of categories.slice(0, cap)) {
      const inCat = markers.filter((m) => m.category === cat);
      const count = inCat.length;
      const text = `${cat} — ${count} ${count === 1 ? "site" : "sites"}`;
      beats.push({
        kind: "reveal",
        camera: padBbox(bboxOf(inCat)),
        highlight: inCat.map((m) => m.label),
        dim: true,
        callout: { region: cat, name: cat, value: `${count}`, text },
        copy: text,
      });
    }
  } else {
    // Few-annotated regime: a beat per place (capped), caption = note ?? label.
    // Camera STAYS on the whole concerned zone (all places framed) for every reveal, so the
    // markers stay visible and separated — a per-place ±CITY_DELTA box would zoom OUT and lose
    // tightly-clustered places (e.g. sites within one city). The reveal is the highlight + callout.
    for (const m of markers.slice(0, cap)) {
      const copy = m.note?.trim() ? m.note : m.label;
      beats.push({
        kind: "reveal",
        camera: allBounds,
        highlight: [m.label],
        dim: true,
        callout: { region: m.label, name: m.label, value: "", text: copy },
        copy,
      });
    }
  }

  beats.push({
    kind: "takeaway",
    camera: allBounds,
    highlight: [],
    dim: false,
    callout: null,
    copy: meta.insight && meta.insight !== meta.title ? meta.insight : "",
  });

  return beats;
}
