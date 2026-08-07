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
//
// ★ A MARKER THE MAP PLOTS IS A MARKER THE MAP NAMES.
//
// Reported on a real run (glaciers-requiem-2026, 2026-08-06): a locator video with four
// glaciers whose closing frame showed four red dots and three names. The Mont Miné's label
// collided with the Cervin's — 9 km apart, ~51px on screen — and one was sacrificed. Per
// beat each subject was named; only the final shot, the frame a reader screenshots, was
// wrong. A map that points at something and refuses to say what it is has failed at the one
// thing a locator map does.
//
// The sacrifice was OURS, not MapLibre's. The label layers run `text-allow-overlap: true`,
// so nothing is culled by the renderer. `placeLabels` is the culler — and it was being fed
// exactly ONE candidate rectangle per marker, whatever side `placeSymbolLabel` picked to
// clear the VIEWPORT. A label whose one candidate collided had nowhere else to be asked
// about, so the only verdict available was "drop it".
//
// So this module now walks the candidates itself, in the declutter's own order, and only
// hands `placeLabels` a rectangle it has already tried to make free:
//
//   1. every side of the dot, at the base gap, in the FT/NYT preference order;
//   2. the same four sides at a WIDER radial offset, if a neighbour has claimed all four —
//      `text-radial-offset` is already a per-feature datum, so this costs no new plumbing;
//   3. failing both, `placeSymbolLabel`'s own least-overflow choice, and `placeLabels` may
//      still drop it. Two names in the same pixels is not a better failure than one name,
//      so the net stays.
//
// Two rules keep the moving honest. A candidate must not overlap a label already committed
// (that is the whole point), and it must stay NEARER ITS OWN MARKER THAN ANY OTHER — moving
// a label must never reassign it, which is the failure that "just push it further out"
// would otherwise buy. When no candidate satisfies both, the ownership rule is relaxed
// before the collision rule is: a name slightly ambiguous between two adjacent dots still
// says more than a dot with no name at all.
//
// This is a per-marker guarantee, not a per-map one, so it generalises: it knows nothing
// about how many markers there are or where they sit. All four locator renderers inherit it
// from this one call.
import {
  boxForAnchor,
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
  /**
   * MapLibre `text-radial-offset` (ems) per marker, index-aligned. Usually the base
   * radius+gap; wider for a label that had to step out to find room. The renderer MUST push
   * this onto the feature — keeping its own constant would draw the label back on top of
   * the neighbour this placement moved it away from.
   */
  offsets: number[];
}

// ── Tuning knobs (each one a number) ────────────────────────────────────────────────────
/** Sides tried, in order. "left" = text to the RIGHT of the dot — the FT/NYT default. */
const ANCHOR_ORDER: LabelAnchor[] = ["left", "right", "bottom", "top"];
/**
 * Multiples of the base centre→text gap a boxed-in label may step out to. 1 first, so an
 * uncontested layout is byte-identical to before. Capped at 3 (≈36px off a 6px dot at
 * textSize 13) because past that the ownership rule starts refusing everything anyway — a
 * label that far out is nearer someone else's dot.
 */
const OFFSET_STEPS = [1, 2, 3];
/**
 * `text-max-width` of the four locator label layers. The shared estimator defaults to 8
 * (the symbol layers' value); feeding the locator's own 9 keeps the rectangle the declutter
 * collide-tests the same size as the text MapLibre draws. A narrow estimate is worse than
 * useless here: it makes a placement collision-free in the arithmetic and overlapping on
 * screen.
 */
const LOCATOR_MAX_EM = 9;
/** Keep-in gutter for the viewport fit, matching placeSymbolLabel's own default. */
const MARGIN = 4;

interface Rect {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

function overlaps(a: Rect, b: Rect): boolean {
  return (
    a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top
  );
}

function fitsViewport(
  b: Rect,
  viewport: { width: number; height: number },
): boolean {
  return (
    b.left >= MARGIN &&
    b.right <= viewport.width - MARGIN &&
    b.top >= MARGIN &&
    b.bottom <= viewport.height - MARGIN
  );
}

/** Squared distance from a point to the nearest edge of a rectangle (0 when inside). */
function distanceSq(b: Rect, p: { x: number; y: number }): number {
  const dx = Math.max(b.left - p.x, 0, p.x - b.right);
  const dy = Math.max(b.top - p.y, 0, p.y - b.bottom);
  return dx * dx + dy * dy;
}

/** True when no OTHER marker sits closer to this rectangle than the marker it names. */
function ownedBy(
  b: Rect,
  self: number,
  points: ReadonlyArray<{ x: number; y: number }>,
): boolean {
  const own = distanceSq(b, points[self]);
  for (let j = 0; j < points.length; j++) {
    if (j === self) continue;
    if (distanceSq(b, points[j]) < own) return false;
  }
  return true;
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
  // The layer offsets in EMS via labelRadialOffset; the placement geometry works in px.
  // Deriving the px back from the ems keeps the two definitions from drifting apart.
  const baseOffset =
    labelRadialOffset(opts.radius, opts.textSize, gap) * opts.textSize;

  const points = markers.map((_, i) => ({
    x: projected[i]?.x ?? 0,
    y: projected[i]?.y ?? 0,
  }));
  const dims = markers.map((m) =>
    estimateLabelBox(m.label, opts.textSize, LOCATOR_MAX_EM),
  );

  // ★ THE SAME ORDER `placeLabels` WOULD HAVE USED. Placing highest-priority first means the
  // marker the declutter would have kept is the one that keeps the preferred side, and the
  // one it would have dropped is the one that moves. Ties break on index, so the result does
  // not depend on the order the markers arrived in.
  const order = markers
    .map((_, i) => i)
    .sort(
      (a, b) =>
        (markers[b].priority ?? 0) - (markers[a].priority ?? 0) || a - b,
    );

  const anchors: LabelAnchor[] = new Array(markers.length);
  const boxes: LabelBox[] = new Array(markers.length);
  const offsets: number[] = new Array(markers.length);
  const committed: Rect[] = [];

  for (const i of order) {
    const base = {
      cx: points[i].x,
      cy: points[i].y,
      width: dims[i].width,
      height: dims[i].height,
      viewport: opts.viewport,
      margin: MARGIN,
    };

    const candidates: { anchor: LabelAnchor; offset: number; box: Rect }[] = [];
    for (const step of OFFSET_STEPS) {
      const offset = baseOffset * step;
      for (const anchor of ANCHOR_ORDER) {
        const box = boxForAnchor(anchor, { ...base, offset });
        if (!fitsViewport(box, opts.viewport)) continue;
        candidates.push({ anchor, offset, box });
      }
    }

    const free = (c: { box: Rect }) =>
      !committed.some((p) => overlaps(c.box, p));

    // ★ BEING NAMED OUTRANKS BEING UNAMBIGUOUS, and that order is measured, not assumed.
    //
    // In a crowd no side may be BOTH free and unambiguously its own — eight names inside
    // 150px have to reach past somebody. The first version of this line ranked the free
    // candidates by how much closer they stayed to their own dot than to any other, which
    // reads better in isolation and packs WORSE: on the eight-marker cluster below it spent
    // the room a later marker needed, and that marker lost its name outright (measured while
    // writing this — seven shown, one hidden). A name a reader might briefly attach to the
    // neighbouring dot still says which four places the story is about; a missing name says
    // nothing at all. So the relaxed pass takes the first FREE candidate in the preference
    // order — tightest offset, FT/NYT default side first — which is also what packs best.
    const chosen =
      candidates.find((c) => free(c) && ownedBy(c.box, i, points)) ??
      candidates.find(free) ??
      // Last resort: no side of this dot holds the label inside the frame at all. Fall back
      // to placeSymbolLabel's least-overflow anchor — this rectangle may collide, and
      // `placeLabels` may drop it, which is the behaviour that has always been there.
      (() => {
        const p = placeSymbolLabel({ ...base, offset: baseOffset });
        return { anchor: p.anchor, offset: baseOffset, box: p.box };
      })();

    committed.push(chosen.box);
    anchors[i] = chosen.anchor;
    offsets[i] = chosen.offset / opts.textSize; // px → ems, for text-radial-offset
    boxes[i] = {
      key: `m${i}`,
      x: chosen.box.left,
      y: chosen.box.top,
      w: chosen.box.right - chosen.box.left,
      h: chosen.box.bottom - chosen.box.top,
      priority: markers[i].priority ?? 0,
    };
  }

  return { anchors, boxes, offsets };
}
