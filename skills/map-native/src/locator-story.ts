// Beat derivation for locator videos — the sibling of deriveSymbolStory. Two regimes:
// few-annotated (a beat per PLACE, camera on a tight box, caption = the marker note) and
// categorized (a beat per CATEGORY, camera on that category's markers, caption = category + count).
// title → establish (all markers) → reveals → takeaway. Same Beat shape as choropleth/symbol.
import type { Beat, RevealMode } from "./map-story";
import type { LocatorMarker } from "./locator-geo";
import type { Phase } from "./story-timeline";
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

/**
 * Every label present in ANY reveal beat's `highlight[]` (not just `highlight[0]`) → that
 * beat's start frame. The generic `triggerFrameByRegion` (story-triggers.ts) assumes one
 * subject per reveal beat — true for Symbol/Choropleth, but NOT for Locator's categorized
 * regime, where a single reveal beat highlights EVERY marker in that category. A marker
 * absent from every reveal beat's highlight (beyond `maxReveals`) is simply not in the map.
 */
export function revealTriggersByLabel(
  beats: Beat[],
  phases: Phase[],
): Map<string, number> {
  const out = new Map<string, number>();
  for (let i = 0; i < beats.length; i++) {
    if (beats[i].kind !== "reveal") continue;
    for (const label of beats[i].highlight) {
      if (!out.has(label)) out.set(label, phases[i].startFrame);
    }
  }
  return out;
}

/**
 * Per-marker entrance trigger frame for LocatorStory's choreography — every marker gets one
 * (mirrors symbol-story.ts's `markTriggerFrames`, keyed by `label` instead of `SymbolPoint`
 * so it works for `LocatorMarker`):
 *  - context: every marker establishes TOGETHER, at the establish beat's own start frame.
 *  - sequential: a marker with its own reveal beat (`revealTriggers`, built by
 *    `revealTriggersByLabel` above so a categorized beat's every marker gets a trigger, not
 *    just the first) triggers at that beat's start frame — markers appear one-by-one (few-
 *    annotated) or category-by-category (categorized). A marker with no reveal beat (beyond
 *    `maxReveals`) never triggers — it stays hidden (radius/opacity/label all 0) for the
 *    whole story, since sequential's narrative never visits it.
 */
export function markTriggerFrames(
  markers: { label: string }[],
  mode: RevealMode,
  establishStartFrame: number,
  revealTriggers: Map<string, number>,
): Map<string, number> {
  const out = new Map<string, number>();
  for (const m of markers) {
    out.set(
      m.label,
      mode === "context"
        ? establishStartFrame
        : (revealTriggers.get(m.label) ?? Number.POSITIVE_INFINITY),
    );
  }
  return out;
}
