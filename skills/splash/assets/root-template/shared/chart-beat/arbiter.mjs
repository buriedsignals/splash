// twin/shared/chart-beat/arbiter.mjs
//
// TREATMENTS COMPOSE THROUGH AN ARBITER, NEVER BY STACKING.
//
// THE DEFECT, MEASURED. A probe enabled five treatments on one beat and three labels landed in the
// same corner — "PIC DE 1973", "CHOC PÉTROLIER", "SECOND CHOC". Each treatment had placed ITS OWN
// label correctly. None could see the others, because none had any way to: a treatment knows the
// mark it names and nothing else on the canvas. That is not a bug in any treatment, and no amount
// of care inside one would have prevented it.
//
// This file is the only place in the system that knows where every treatment's text will land, so
// it is the only place a collision can be refused. It is the piece the whole design base's
// architecture turned on, and it came from a rendered picture rather than from reasoning.
//
// TWO RULES IT WILL NOT BEND.
//
//   1. A label never leaves the frame. An off-frame label is worse than an absent one, and the
//      tree already refuses overflow elsewhere (`three-sizes-no-collision.test.ts` measures every
//      run's real ink box against the frame edge). When there is no room, the label is DROPPED and
//      the drop is reported — see `report()`.
//   2. Placement is decided in priority order, so one set of requests never resolves two ways. A
//      renderer whose picture depends on the order treatments happened to be enumerated in is not
//      reproducible, and its guard would flicker.

/** How far a label sits from the point it names, before any nudging. */
const GAP = 8;

/**
 * The positions tried, in order, for a label about a point. `above` first because a label over its
 * mark reads as belonging to it; the others are the honest fallbacks.
 */
const ANCHORS = Object.freeze(["above", "below", "right", "left"]);

/** Boxes closer than this on both axes are touching, and touching reads as overlapping. */
const BREATH = 2;

function boxAt(anchor, at, size) {
  const { width, height } = size;
  if (anchor === "above") return { x: at.x - width / 2, y: at.y - GAP - height, width, height };
  if (anchor === "below") return { x: at.x - width / 2, y: at.y + GAP, width, height };
  if (anchor === "right") return { x: at.x + GAP, y: at.y - height / 2, width, height };
  return { x: at.x - GAP - width, y: at.y - height / 2, width, height };
}

function insideFrame(box, frame) {
  return (
    box.x >= frame.left &&
    box.y >= frame.top &&
    box.x + box.width <= frame.right &&
    box.y + box.height <= frame.bottom
  );
}

function collides(box, taken) {
  return taken.some(
    (other) =>
      box.x < other.x + other.width + BREATH &&
      other.x < box.x + box.width + BREATH &&
      box.y < other.y + other.height + BREATH &&
      other.y < box.y + box.height + BREATH,
  );
}

/**
 * Place every treatment's label, or drop it and say why.
 *
 * @param {Array<{id: string, treatment: string, text: string, at: {x: number, y: number}, priority?: number}>} requests
 * @param {{frame: {left: number, top: number, right: number, bottom: number}, measure: (text: string) => {width: number, height: number}}} options
 * @returns {{placed: Array<{id, treatment, text, anchor, box}>, dropped: Array<{id, treatment, why}>}}
 */
export function placeLabels(requests, { frame, measure }) {
  // Highest priority first, and ties broken by id so the result is a function of the request SET
  // rather than of the order it arrived in.
  const queue = [...requests].sort(
    (a, b) => (b.priority ?? 0) - (a.priority ?? 0) || String(a.id).localeCompare(String(b.id)),
  );

  const placed = [];
  const dropped = [];
  const taken = [];

  for (const request of queue) {
    const size = measure(request.text);
    let chosen = null;

    for (const anchor of ANCHORS) {
      const box = boxAt(anchor, request.at, size);
      if (!insideFrame(box, frame)) continue;
      if (collides(box, taken)) continue;
      chosen = { anchor, box };
      break;
    }

    if (!chosen) {
      // Which of the two rules refused it, so the report can say something true rather than
      // "could not place".
      const anyFits = ANCHORS.some((anchor) => insideFrame(boxAt(anchor, request.at, size), frame));
      dropped.push({
        id: request.id,
        treatment: request.treatment,
        text: request.text,
        why: anyFits
          ? "would collide with a label already placed, and moving it would take it off the frame"
          : "there is no room for it inside the frame at any anchor",
      });
      continue;
    }

    taken.push(chosen.box);
    placed.push({
      id: request.id,
      treatment: request.treatment,
      text: request.text,
      anchor: chosen.anchor,
      box: chosen.box,
    });
  }

  return { placed, dropped };
}
