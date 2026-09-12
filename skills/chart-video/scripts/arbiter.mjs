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
//   0. A label never sits on the data. Measured on the first real render of the CO₂ beat: with
//      only other LABELS avoided, the end value landed on its own series in all three directions —
//      the arbiter tried `above` first, the point it named was on the line, and nothing told it the
//      line was there. Marks are passed in as `avoid`, and the tree already refuses this class of
//      defect elsewhere (`annotation-reads-over-what-it-crosses.test.ts`).
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

/**
 * A request may name the anchors it will accept, and a label that has only one honest position
 * SHOULD.
 *
 * MEASURED, on the 27-row diverging bar. Its values sit beyond their own bar's tip, which on a row
 * chart is one position and not four. Czechia's label found room `above` — above its own row, which
 * is to say ON the row above it — and the row above then had nowhere left to put its own number, so
 * `−6,46` was dropped and Germany shipped without a value. Both halves of that are wrong, and
 * neither is a collision: the arbiter placed two labels that do not overlap, in a chart where one of
 * them names the wrong row.
 *
 * The four-anchor default stays. A point on a scatter or a line genuinely can take a label on any
 * side; a row's value cannot.
 */
const anchorsFor = (request) => {
  const wanted = request.anchors ?? ANCHORS;
  const unknown = wanted.filter((a) => !ANCHORS.includes(a));
  if (unknown.length)
    throw new Error(
      `${request.id}: unknown anchor ${unknown.join(", ")} — a misspelt anchor would silently fall ` +
        `back to all four positions, which is the defect this list exists to prevent`,
    );
  return wanted;
};

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
 * @param {Array<{id: string, treatment: string, text: string, at: {x: number, y: number}, priority?: number, anchors?: string[]}>} requests
 *   `anchors` narrows the positions this label will accept, in the order to try them. Omit it and
 *   all four are tried; give it when the label has fewer honest positions than four.
 * @param {{frame: {left, top, right, bottom}, measure: (text: string) => {width, height}, avoid?: Array<{x, y, width, height}>}} options
 *   `avoid` carries the MARKS — the boxes a label must not sit on, which the caller knows and this
 *   file cannot: a series path, a point, a bar.
 * @returns {{placed: Array<{id, treatment, text, anchor, box}>, dropped: Array<{id, treatment, why}>}}
 */
export function placeLabels(requests, { frame, measure, avoid = [] }) {
  // Highest priority first, and ties broken by id so the result is a function of the request SET
  // rather than of the order it arrived in.
  const queue = [...requests].sort(
    (a, b) => (b.priority ?? 0) - (a.priority ?? 0) || String(a.id).localeCompare(String(b.id)),
  );

  const placed = [];
  const dropped = [];
  // The marks are taken before anything is placed: they were on the canvas first, and a label
  // yields to the data rather than the other way round.
  const taken = [...avoid];

  for (const request of queue) {
    const size = measure(request.text);
    let chosen = null;

    const anchors = anchorsFor(request);
    for (const anchor of anchors) {
      const box = boxAt(anchor, request.at, size);
      if (!insideFrame(box, frame)) continue;
      if (collides(box, taken)) continue;
      chosen = { anchor, box };
      break;
    }

    if (!chosen) {
      // Which of the two rules refused it, so the report can say something true rather than
      // "could not place".
      const anyFits = anchors.some((anchor) => insideFrame(boxAt(anchor, request.at, size), frame));
      dropped.push({
        id: request.id,
        treatment: request.treatment,
        text: request.text,
        why: anyFits
          ? "every anchor would collide with a mark or with a label already placed, and moving it further would take it off the frame"
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
