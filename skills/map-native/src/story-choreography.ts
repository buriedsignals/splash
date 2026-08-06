// Shared areal-story choreography — pacing constants, per-frame staged entrance,
// per-subject emphasis layers, and the calculateMetadata builder. Promoted out of
// ChoroplethStory.tsx/Root.tsx so the other beat-driven story comps (SymbolStory,
// LocatorStory, DotDensityStory, HexGridStory, CartogramStory) can share the same
// tuned entrance choreography instead of re-deriving it. No values changed in the
// move — ChoroplethStory renders byte-identical.

import * as maptilersdk from "@maptiler/sdk";
import { interpolate } from "remotion";
import { stagedEntrance, type StagedEntrance } from "./core/staged-reveal";
import { EMPTY_FEATURE } from "./core/border-slice";
import type { Phase } from "./story-timeline";
import { hexToOklch, oklchToHex } from "../../../lib/core/house-ramp";

/** How far down in OKLCH lightness a "subject" trail sits under the fill it outlines. One number,
 *  like every other knob here: 0 would make the border invisible against its own fill, 1 would
 *  make it black and stop being that region's colour. 0.42 is Map Explainer's own relationship —
 *  its COUNTRY_DARK values sit ~40% below their COUNTRY counterparts in lightness. */
export const TRAIL_DARKEN = 0.42;

/**
 * A darker shade of a subject's own colour — Map Explainer's border rule
 * (references/architecture.md §5: "The border is a darker shade of the country colour").
 * OKLCH, so the shade keeps the hue and perceived chroma of the fill instead of drifting the way
 * an sRGB multiply does. Falls back to the input for anything that is not a #rrggbb.
 */
export function subjectTrailColor(fillHex: string): string {
  if (!/^#[0-9a-f]{6}$/i.test(fillHex.trim())) return fillHex;
  const { L, C, h } = hexToOklch(fillHex);
  return oklchToHex({ L: L * (1 - TRAIL_DARKEN), C, h });
}

// --- Areal entrance pacing (tuning knobs — each a number) --------------------
// The choropleth is a beat-TOUR: each region is visited for one hold, then the
// camera leaves. So the label (the payload) must land EARLY and stay readable
// within the hold — unlike RouteReveal, where labels accumulate over a long
// story. These durations are passed to stagedEntrance/buildTimeline so the core
// defaults (which RouteReveal depends on for parity) are never touched.
// The phases INTERWEAVE (overlap) instead of running strictly one-after-another,
// so the entrance reads as one fluid gesture rather than three discrete steps:
// the fill begins while the border is still drawing (AREAL_FILL_START_S), and the
// label rises while the fill is still blooming (AREAL_LABEL_START_S). The border
// draws during the camera glide-in (trigger = beat start = when the move begins),
// so motion is continuous. Label reaches full at AREAL_LABEL_START_S + AREAL_LABEL_S;
// AREAL_REVEAL_HOLD_S gives ~1s of readable stillness after that before the next move.
export const AREAL_BORDER_S = 1.3; // border draw-on seconds (was core default 2.5)
export const AREAL_FILL_S = 0.8; // fill-bloom seconds
export const AREAL_FILL_START_S = 0.5; // fill begins ~40% into the border draw (overlap)
export const AREAL_LABEL_S = 1.1; // label rise seconds — a gentle fade/rise-in, not a fast pop
export const AREAL_LABEL_START_S = 1.0; // label begins while the fill blooms (overlap) → full at ~2.1s
export const AREAL_REVEAL_HOLD_S = 3.0; // per-region hold → gentle entrance ~2.1s + ~0.9s readable stillness
export const AREAL_MOVE_S = 1.3; // camera move seconds — snappy but eased glide

// Single source of truth for the beat-timeline pacing. MUST be used both here
// (component animation) and in remotion/src/Root.tsx (composition durationInFrames):
// if they diverge, the composition is too short and the story is cut off.
export const AREAL_TIMELINE_OPTS = {
  revealHold: AREAL_REVEAL_HOLD_S,
  move: AREAL_MOVE_S,
} as const;

/** Seconds the closing wash takes to bring the rest of the distribution in under the takeaway,
 *  once the camera has finished pulling back. One number, like every other pacing knob. */
export const EXPLAINER_CLOSE_S = 1.2;

/**
 * ★ THE CLOSE, 0 → 1 — carrier stories only, and on the takeaway beat's OWN hold.
 *
 * Map Explainer's device is faithful while the walk runs: the subjects the walk visits light up
 * and stay lit, and the rest of the map is basemap. On Tom's map that is right, because a country
 * the river never enters is not part of the claim. On a map whose EVERY mark carries a value —
 * a choropleth's regions, a cartogram's cells, a hex grid's bins, a dot-density's regions, a
 * symbol map's points — an unpainted mark reads as "no data", not as "not a subject". Frame 719
 * of the first choropleth explainer render showed it: Britain, France, Spain and Italy grey
 * behind a takeaway about a north–south gradient they are half of.
 *
 * So the takeaway beat brings back what the walk sat inside. It rides the SAME clock as
 * everything else — this beat's own hold, so the camera pulls back first and the rest appears
 * after — never a second one. Callers scale it by their own channel's settled target and
 * exclude the subjects, whose own entrance already holds them at full.
 */
export function explainerCloseProgress(
  frame: number,
  phase: Phase,
  fps: number,
): number {
  const holdStart = phase.startFrame + phase.moveFrames;
  return interpolate(
    frame,
    [holdStart, holdStart + Math.round(EXPLAINER_CLOSE_S * fps)],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
}

/**
 * Per-frame staged entrance for every subject key, keyed by its own trigger frame —
 * pure (no map/DOM access). Each key's local seconds since trigger drive the same
 * tuned areal envelope (border → fill → label, overlapping).
 */
export function stagedByKey(
  triggers: Map<string, number>,
  frame: number,
  fps: number,
  fillTarget: number,
): Map<string, StagedEntrance> {
  const out = new Map<string, StagedEntrance>();
  for (const [key, triggerFrame] of triggers) {
    const localSeconds = (frame - triggerFrame) / fps;
    out.set(
      key,
      stagedEntrance(localSeconds, {
        fillOpacity: fillTarget,
        borderS: AREAL_BORDER_S,
        fillS: AREAL_FILL_S,
        labelS: AREAL_LABEL_S,
        fillStart: AREAL_FILL_START_S,
        labelStart: AREAL_LABEL_START_S,
      }),
    );
  }
  return out;
}

/**
 * Per-subject emphasis: border trail (draws on) + fill bloom (brief overshoot on top
 * of the base fill) — one dedicated source+layer pair per reveal-beat subject, staged
 * over the beat's own entrance window. Bloom sits above the base fill so its opacity
 * reads as an additive brightening; the trail sits above the bloom so the drawn border
 * stays visible through it. `idPrefix` namespaces the source/layer ids per comp family
 * (choropleth passes "choro") so multiple story comps never collide.
 *
 * `bloom` (default true) controls whether the fill-bloom source+layer is built at all.
 * DotDensityStory's fill channel is the dots themselves (stipple-in, driven per-frame
 * off `stagedByKey`'s fillOpacity), not an areal fill — it passes `bloom: false` to get
 * the trail only, so no unused bloom source/layer is created.
 */
export function addSubjectEmphasisLayers(
  map: maptilersdk.Map,
  keys: string[],
  opts: {
    idPrefix: string;
    // ChoroplethStory's singleRegionFeature yields a one-feature FeatureCollection
    // (source data accepts either — see maplibre-gl's GeoJSONSourceSpecification).
    featureFor: (k: string) => GeoJSON.Feature | GeoJSON.FeatureCollection;
    colorFor: (k: string) => string;
    dark: boolean;
    bloom?: boolean;
    /**
     * What colour the drawn border settles to.
     *  - "neutral" (default) — one flat near-white/near-black for every subject. What every
     *    caller did before, so omitting this renders byte-identical.
     *  - "subject" — a darker shade of THIS subject's own colour (Map Explainer's rule). The
     *    border then already says which bin the region is in, before the fill answers.
     */
    trailShade?: "neutral" | "subject";
  },
): void {
  const {
    idPrefix,
    featureFor,
    colorFor,
    dark,
    bloom = true,
    trailShade = "neutral",
  } = opts;
  for (const key of keys) {
    if (bloom) {
      map.addSource(`${idPrefix}-bloom-${key}`, {
        type: "geojson",
        data: featureFor(key),
      });
      map.addLayer({
        id: `${idPrefix}-bloom-${key}`,
        type: "fill",
        source: `${idPrefix}-bloom-${key}`,
        paint: {
          "fill-color": colorFor(key),
          "fill-opacity": 0,
        },
      });
    }

    map.addSource(`${idPrefix}-trail-${key}`, {
      type: "geojson",
      data: EMPTY_FEATURE,
    });
    map.addLayer({
      id: `${idPrefix}-trail-${key}`,
      type: "line",
      source: `${idPrefix}-trail-${key}`,
      paint: {
        "line-color":
          trailShade === "subject"
            ? subjectTrailColor(colorFor(key))
            : dark
              ? "#f4f4f5"
              : "#1a1a1a",
        "line-width": 2.5,
        "line-opacity": 0.95,
      },
    });
  }
}

/**
 * Builds a Remotion `calculateMetadata` fn from a pure frame-count computer over the
 * composition's `config` prop. Mode-aware compositions (e.g. sequential drops the
 * establish beat) must recompute duration from the INJECTED config, not a static
 * default, or the mp4 ends with a frozen tail.
 */
export function makeStoryMeta<TConfig>(
  computeFrames: (config: TConfig) => number,
): (arg: { props: { config: TConfig } }) => { durationInFrames: number } {
  return ({ props }) => ({ durationInFrames: computeFrames(props.config) });
}
