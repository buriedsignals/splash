// locator-label-placement — the ONE placement the four locator renderers share.
//
// Until now the cartographic family ran two label models. The symbol maps compute, in screen
// space, which side of the point keeps the text inside the frame (`placeSymbolLabel`) — the
// invariant engraved after "Indonésie" shipped clipped to "Indonés". The locator maps asked
// MapLibre for `text-variable-anchor`, which re-anchors only on label↔label COLLISION and is
// blind to the viewport edge, so a marker near a frame edge kept its default side and its
// label ran off-canvas. Two models means every label fix has to be made twice, and this one
// had only been made once.
//
// It is not a property swap, and this file is why. The locator declutter (`placeLabels`) is
// its own deterministic priority rule — markers always draw, labels are placed
// highest-priority first, colliders are dropped — and it is KEPT: it is an editorial policy
// (`priority`, the beat's `maxReveals`), not a rendering detail, and it is the reason the
// locator layers run `text-allow-overlap: true`. What it cannot do is build its collision
// box from a hardcoded "the text sits above the dot" when the anchor may now put the text to
// the left, right or below. So anchor and box come from ONE call, and the declutter is fed
// the rectangle the label will actually occupy.
import {
  estimateLabelBox,
  labelRadialOffset,
  placeSymbolLabel,
  type LabelAnchor,
} from "./symbol-labels";
import type { LabelBox } from "./locator-labels";

/** The marker fields the placement needs — a structural subset of `PlacedMarker`. */
export interface LocatorLabelMarker {
  label: string;
  priority?: number;
}

export interface LocatorLabelPlacement {
  /** MapLibre `text-anchor` per marker, index-aligned with the input. */
  anchors: LabelAnchor[];
  /** The declutter rectangle the label will really occupy, ready for `placeLabels`. */
  boxes: LabelBox[];
}

/**
 * @param markers  the locator's markers, in source order.
 * @param projected `map.project(...)` per marker, index-aligned. Passed in so this module
 *                  stays browser-free and unit-testable, mirroring assignSymbolLabelAnchors.
 * @param opts.radius the marker radius in px — with the shared 6px gap it gives the same
 *                  centre→text distance the layer renders from `labelRadialOffset`.
 */
export function locatorLabelPlacement(
  markers: ReadonlyArray<LocatorLabelMarker>,
  projected: ReadonlyArray<{ x: number; y: number }>,
  opts: {
    viewport: { width: number; height: number };
    textSize: number;
    radius: number;
    gap?: number;
  },
): LocatorLabelPlacement {
  const gap = opts.gap ?? 6; // labelRadialOffset's own default — one clearance, one source
  const anchors: LabelAnchor[] = [];
  const boxes: LabelBox[] = [];
  for (let i = 0; i < markers.length; i++) {
    const pt = projected[i];
    const { width, height } = estimateLabelBox(markers[i].label, opts.textSize);
    // The layer offsets in EMS via labelRadialOffset; the placement geometry works in px.
    // Deriving the px back from the ems keeps the two definitions from drifting apart.
    const offset =
      labelRadialOffset(opts.radius, opts.textSize, gap) * opts.textSize;
    const placed = placeSymbolLabel({
      cx: pt?.x ?? 0,
      cy: pt?.y ?? 0,
      offset,
      width,
      height,
      viewport: opts.viewport,
    });
    anchors.push(placed.anchor);
    boxes.push({
      key: `m${i}`,
      x: placed.box.left,
      y: placed.box.top,
      w: placed.box.right - placed.box.left,
      h: placed.box.bottom - placed.box.top,
      priority: markers[i].priority ?? 0,
    });
  }
  return { anchors, boxes };
}
