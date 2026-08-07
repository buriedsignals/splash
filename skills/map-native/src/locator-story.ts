// Beat derivation for locator videos — the sibling of deriveSymbolStory. Two regimes:
// few-annotated (a beat per PLACE, camera on a tight box, caption = the marker note) and
// categorized (a beat per CATEGORY, camera on that category's markers, caption = category + count).
// title → establish (all markers) → reveals → takeaway. Same Beat shape as choropleth/symbol.
import {
  applyMapArc,
  type Beat,
  type MapArcBeat,
  type RevealMode,
} from "./map-story";
import type { LocatorMarker } from "./locator-geo";
import type { Phase } from "./story-timeline";
import { shortWayLongitudeExtent } from "./core/longitude";

export interface LocatorStoryMeta {
  title: string;
  description?: string;
  insight?: string;
  // Journalist-confirmed claim-arc override (S2) — see map-story.ts mapArcErrors.
  // Anchors on marker labels (mirrors deriveSymbolStory's point labels — a marker has no
  // numeric value of its own, so the resolved anchor's `value` is always ""). When present
  // + non-empty, the reveal beats follow the arc (applyMapArc) instead of the categorized/
  // few-annotated regimes below; absent/empty leaves today's regimes byte-identical.
  arcBeats?: MapArcBeat[];
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

  if (meta.arcBeats?.length) {
    // Journalist-confirmed claim-arc override — the reveals follow the ARC order, not
    // either salience regime below. mapArcErrors (run at the gate) has already validated
    // every arcBeat's region against the markers' own labels, so this lookup cannot miss
    // (applyMapArc throws defensively if one somehow did). The camera is a tight box on the
    // NAMED marker's own coordinates (mirrors deriveSymbolStory's CITY_DELTA box) — never
    // `allBounds`, which is the map's default framing the few-annotated regime uses instead.
    const markerByLabel = new Map(markers.map((m) => [m.label, m]));
    beats.push(
      ...applyMapArc(meta.arcBeats, (label) => {
        const m = markerByLabel.get(label);
        return m
          ? {
              camera: [
                m.lon - CITY_DELTA,
                m.lat - CITY_DELTA,
                m.lon + CITY_DELTA,
                m.lat + CITY_DELTA,
              ],
              highlight: [m.label],
              name: m.label,
              // A locator marker carries no numeric value (unlike a choropleth region or a
              // symbol point) — the few-annotated regime's own callout already uses "" for
              // the same reason (see below), so this is not a new convention.
              value: "",
            }
          : null;
      }),
    );
  } else {
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
 *
 * `atHoldStart` mirrors `triggerFrameByRegion`'s own option, for the same reason and with the
 * same default: an EXPLAINER story (a declared sweepCarrier) wants the camera to LAND before
 * the place animates in, and every other caller keeps the beat-start frame it already got. See
 * story-triggers.ts's header for the two readings of the tuned pacing.
 */
export function revealTriggersByLabel(
  beats: Beat[],
  phases: Phase[],
  opts: { atHoldStart?: boolean } = {},
): Map<string, number> {
  const out = new Map<string, number>();
  for (let i = 0; i < beats.length; i++) {
    if (beats[i].kind !== "reveal") continue;
    const trigger = opts.atHoldStart
      ? phases[i].startFrame + phases[i].moveFrames
      : phases[i].startFrame;
    for (const label of beats[i].highlight) {
      if (!out.has(label)) out.set(label, trigger);
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
 *    `maxReveals`) triggers at `closeFrame`, which defaults to never: it stays hidden
 *    (radius/opacity/label all 0) for the whole story, since sequential's narrative never
 *    visits it.
 *
 * ★ `closeFrame` IS THE CLOSE, and it is a frame off the EXISTING timeline (the takeaway
 * beat's own hold start), never a clock of its own — see symbol-story.ts's twin for the full
 * reading. An EXPLAINER story (a declared sweepCarrier) passes it; everyone else gets the
 * `never` that was hard-coded here, so omitting it renders byte-identical.
 */
export function markTriggerFrames(
  markers: { label: string }[],
  mode: RevealMode,
  establishStartFrame: number,
  revealTriggers: Map<string, number>,
  closeFrame = Number.POSITIVE_INFINITY,
): Map<string, number> {
  const out = new Map<string, number>();
  for (const m of markers) {
    out.set(
      m.label,
      mode === "context"
        ? establishStartFrame
        : (revealTriggers.get(m.label) ?? closeFrame),
    );
  }
  return out;
}
