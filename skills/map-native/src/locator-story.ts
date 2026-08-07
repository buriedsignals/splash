// Beat derivation for locator videos — the sibling of deriveSymbolStory. Two regimes:
// few-annotated (a beat per PLACE, camera on a tight box, caption = the marker note) and
// categorized (a beat per CATEGORY, camera on that category's markers, caption = category + count).
// title → establish (all markers) → reveals → takeaway. Same Beat shape as choropleth/symbol.
import {
  applyMapArc,
  beatsForMode,
  type Beat,
  type MapArcBeat,
  type RevealMode,
} from "./map-story";
import type { LocatorMarker } from "./locator-geo";
import type { Phase } from "./story-timeline";
import { shortWayLongitudeExtent } from "./core/longitude";
import { tourBoxDelta } from "./core/tour-box";

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

// Minimum half-width (deg) of a CATEGORY's framing box — the floor `padBbox` inflates a
// single-marker (or all-coincident) category up to. NOT the tour's stop box: an authored walk
// sizes each stop from the markers' own spread (core/tour-box.ts's `tourBoxDelta`), because a
// constant this wide framed every stop of a 90 km tour wider than the whole tour.
const CITY_DELTA = 1.5;
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
    // NAMED marker's own coordinates — never `allBounds`, which is the map's default framing
    // the few-annotated regime uses instead. The box's SIZE is `tourBoxDelta` (core/tour-box.ts):
    // derived from how far apart these markers actually are, because a constant box is what
    // flattened this camera on Rémy's own run — see that file's header.
    const markerByLabel = new Map(markers.map((m) => [m.label, m]));
    const delta = tourBoxDelta(markers);
    beats.push(
      ...applyMapArc(meta.arcBeats, (label) => {
        const m = markerByLabel.get(label);
        return m
          ? {
              camera: [
                m.lon - delta,
                m.lat - delta,
                m.lon + delta,
                m.lat + delta,
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
      // markers stay visible and separated — a fixed per-place ±CITY_DELTA box would zoom OUT and lose
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
 * `beatsForMode` for a LOCATOR walk — with one added rule, and only for this type.
 *
 * ★ AN AUTHORED WALK KEEPS ITS ESTABLISHING OVERVIEW, EVEN IN SEQUENTIAL MODE.
 *
 * `beatsForMode` drops the establish beat in sequential mode because for an areal story the base
 * fill is 0 there, so establishing means dwelling on an empty map. That reasoning does not
 * survive contact with a locator tour, for two reasons this file can see and the generic one
 * cannot:
 *   · a locator has no "empty data" state — its establishing shot is the BASEMAP, i.e. the
 *     territory itself, which is exactly what a tour has to show before it starts crossing it;
 *   · since `tourBoxDelta`, an authored walk zooms IN on each stop. Before that, every stop was
 *     framed wider than the whole set, so the reader got the overview for free at every beat and
 *     losing the establish beat cost nothing. Now it costs the only wide shot before the close.
 *
 * Concretely, this is what a `sweepCarrier` did to Rémy's run: declaring one SELECTS sequential
 * (resolveRevealMode), sequential dropped the establish beat, the title card is opaque over the
 * beat that holds the overview — so the four glaciers first appeared together in the takeaway,
 * the last shot of the video.
 *
 * A DERIVED locator walk is unchanged: its reveals sit on the establishing bounds already
 * (the few-annotated regime frames `allBounds` at every beat), so there the dwell really is the
 * dead air `beatsForMode` describes.
 *
 * MUST be used by both LocatorStory.tsx (the animation) and Root.tsx's `locatorStoryMeta` (the
 * composition's durationInFrames) — the same single-source-of-truth rule `beatsForMode` carries,
 * for the same reason: if they diverge the mp4 ends on a frozen tail.
 */
export function locatorBeatsForMode(beats: Beat[], mode: RevealMode): Beat[] {
  if (mode === "sequential" && beats.some((b) => b.authored)) return beats;
  return beatsForMode(beats, mode);
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
