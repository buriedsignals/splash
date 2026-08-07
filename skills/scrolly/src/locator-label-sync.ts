// locator-label-sync — what the WEB locator scrolly has to do that the frame-driven
// Remotion locator comps do not, and nothing else.
//
// ★ A MARKER THE MAP PLOTS IS A MARKER THE MAP NAMES.
//
// map-native engraved that for its four locator renderers: `locatorLabelPlacement` walks every
// side of the dot (then a wider radial offset) before anything may be dropped, and `placeLabels`
// stays as the last-resort net. Its sweep could only reach its own skill, and named the gap:
// THIS package ships the fifth locator renderer, ScrollyLocatorMap.tsx — the one a reader
// actually scrolls — and it still asked MapLibre for `text-variable-anchor` with
// `text-allow-overlap: false` and `text-optional: true`, i.e. the renderer's own silent culling
// and no viewport-edge awareness at all. Measured on a delivered page before this file existed:
// six glaciers, six dots, FIVE names.
//
// NOTHING GEOMETRIC IS RE-DERIVED HERE. The placement is map-native's, the declutter is
// map-native's; a second implementation of either is how the two engines would drift back
// apart, which is the whole reason that module was extracted in the first place. What is
// genuinely local is the SYNC POLICY, and it is local because the web renderer's clock is
// different:
//
//   · the Remotion comps advance one frame at a time and recompute the placement per frame;
//   · this one flies the camera between steps (scrolly-camera's flyToBeat, ~1200ms), so the
//     projection changes continuously with no frame to hang off. MapLibre's `move` event is
//     the equivalent tick, and the placement must ride it — an anchor chosen at the step
//     boundary is stale by the middle of the flight, which is exactly when a marker drifts
//     toward the frame edge.
//
// And the two halves keep different clocks on purpose. WHERE a label sits is geometry and may
// change on any tick. WHICH labels show is an editorial decision taken once per step: labels
// winking in and out during a camera flight would read as a glitch, so the declutter's verdict
// is carried across the moves inside a step and only retaken when the step does — the same
// split LocatorScrolly.tsx makes with `stepChanged`.
import {
  locatorLabelPlacement,
  type LocatorLabelPlacement,
} from "../../map-native/src/locator-label-placement";
import {
  placeLabels,
  type LabelBox,
} from "../../map-native/src/locator-labels";
import type { LabelAnchor } from "../../map-native/src/symbol-labels";

/** The marker fields this sync reads — a structural subset of locatorGeometry's output. */
export interface SyncMarker {
  label: string;
  lon: number;
  lat: number;
  color: string;
  category?: string;
  priority?: number;
}

/** Carried from one tick to the next: the placement, and the step's frozen verdict. */
export interface LocatorLabelSyncState {
  stepKey: number;
  anchors: LabelAnchor[];
  offsets: number[];
  boxes: LabelBox[];
  /** The declutter keys (`m<i>`) allowed to show for this step. */
  shown: Set<string>;
  /**
   * The `__highlight` flag written onto each feature. Carried because the reveal's DIM is the
   * one thing that can change with neither the camera nor the verdict moving — a beat that
   * dims its siblings at the same camera produces an identical placement and an identical
   * `shown`, so without this `changed` would report false and the dim would never be pushed.
   */
  highlighted: boolean[];
}

export interface LocatorLabelSyncInput {
  markers: ReadonlyArray<SyncMarker>;
  /** `map.project([lon, lat])`, injected so this module stays browser-free and testable. */
  project: (marker: SyncMarker, index: number) => { x: number; y: number };
  viewport: { width: number; height: number };
  textSize: number;
  radius: number;
  /**
   * The beat index whose declutter verdict is IN FORCE. A change here retakes the verdict, so
   * the caller must only advance it once the camera has SETTLED on that beat — advancing it at
   * the step boundary would judge the new step's crowding against the frame the reader is
   * leaving, and the verdict would be one camera behind for the whole story.
   */
  stepKey: number;
  /** True on a reveal beat that dims its siblings. */
  emphasise: boolean;
  /** Labels of the markers the current beat highlights. */
  highlight: ReadonlySet<string>;
  previous: LocatorLabelSyncState | null;
}

export interface LocatorLabelSyncResult {
  /** False when neither the placement nor the step moved — the caller skips `setData`. */
  changed: boolean;
  state: LocatorLabelSyncState;
  features: GeoJSON.Feature[];
}

/**
 * A reveal beat's subject must not be the marker a neighbour shoves onto a worse side, so it
 * is handed to the placement as priority. Big enough to outrank any authored `priority`, which
 * is a per-marker editorial weight, not a per-beat one — mirrors LocatorScrolly.tsx's own 1000.
 */
const HIGHLIGHT_PRIORITY = 1000;

export function syncLocatorLabels(
  input: LocatorLabelSyncInput,
): LocatorLabelSyncResult {
  const { markers, previous } = input;

  const placement: LocatorLabelPlacement = locatorLabelPlacement(
    markers.map((m) => ({
      label: m.label,
      priority:
        (m.priority ?? 0) +
        (input.emphasise && input.highlight.has(m.label)
          ? HIGHLIGHT_PRIORITY
          : 0),
    })),
    markers.map((m, i) => input.project(m, i)),
    {
      viewport: input.viewport,
      textSize: input.textSize,
      radius: input.radius,
    },
  );

  const stepChanged = !previous || previous.stepKey !== input.stepKey;
  // The offset moves for the same reason the anchor does — a label that had to step further
  // out to clear a neighbour — so it is part of "the placement changed", not a constant the
  // rebuild can supply itself.
  const placementChanged =
    !previous ||
    placement.anchors.some((a, i) => a !== previous.anchors[i]) ||
    placement.offsets.some((o, i) => o !== previous.offsets[i]);

  // The verdict is retaken ONLY at a step boundary; within a step it is carried, so a label
  // the step opened with cannot vanish halfway through the camera flight.
  const shown = stepChanged
    ? new Set(placeLabels(placement.boxes).shown)
    : previous.shown;

  // The reveal's dim. Its own clock again: it follows the STEP the reader is on, not the
  // verdict — the prose card and the glow have to change together, so this is recomputed on
  // every tick rather than carried.
  const highlighted = markers.map((m) =>
    input.emphasise ? input.highlight.has(m.label) : true,
  );
  const highlightChanged =
    !previous || highlighted.some((h, i) => h !== previous.highlighted[i]);

  const state: LocatorLabelSyncState = {
    stepKey: input.stepKey,
    anchors: placement.anchors,
    offsets: placement.offsets,
    boxes: placement.boxes,
    shown,
    highlighted,
  };

  const features: GeoJSON.Feature[] = markers.map((m, i) => ({
    type: "Feature",
    id: i,
    properties: {
      key: `m${i}`,
      label: m.label,
      color: m.color,
      category: m.category ?? "",
      anchor: placement.anchors[i],
      labelOffset: placement.offsets[i],
      __showLabel: shown.has(`m${i}`),
      __highlight: highlighted[i],
    },
    geometry: { type: "Point", coordinates: [m.lon, m.lat] },
  }));

  return {
    changed: stepChanged || placementChanged || highlightChanged,
    state,
    features,
  };
}
