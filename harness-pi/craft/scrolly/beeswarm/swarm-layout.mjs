// THE ONE IMPLEMENTATION OF THIS BEAT'S LAYOUT, USED TWICE.
//
// `DirectedBeeswarmScrolly.tsx` imports it in node to render the swarm at a reference size (what a
// reader without a script gets); `render-directions-scrolly.mjs` inlines the same source into the
// page, where `swarm-drive.mjs` re-runs it in the reader's own pixels on every resize. A swarm packed
// at one size is wrong at every other — the radii are pixels and the axis is a fraction — so the
// packing has to run where the frame is known, and it must be the same packing.
//
// The rules are the static plate's (`static-beeswarm-co2-per-person/DirectedBeeswarm.tsx`), unchanged
// in substance:
//   - marks are laid down largest first and pushed ONLY perpendicular to the axis, never along it;
//   - the radius runs on a square root of population, its largest rung walked from generous to mean
//     until the swarm fits its band, the smallest countries floored at a visible radius;
//   - a callout card is centred on its circle, pushed apart from its neighbour along the axis and
//     clamped inside the frame — a card may move, a circle may not;
//   - the axis name and its ticks share a row, and a tick that would touch the name gives way.

export const MAX_RADII = [30, 26, 22, 19, 16, 13, 11, 9, 7, 5, 4];
export const MIN_RADIUS = 0.9;

/** `x` maps tonnes to pixels along the plot's own width, with the static plate's 6px inset. */
export function swarmScale(xMax, width) {
  const domain = xMax * 1.02;
  return (value) => 6 + (value / domain) * (width - 12);
}

/** One packing at one largest radius; `cy` is relative to the band's midline. With `uniform`, every mark
 *  is a dot of that radius — the field before its surfaces mean anything. */
export function packSwarm(marks, x, maxRadius, uniform = null) {
  const biggest = Math.max(...marks.map((m) => m.people));
  const radiusOf = (m) => (uniform !== null ? uniform : Math.max(MIN_RADIUS, Math.sqrt(m.people / biggest) * maxRadius));
  const placed = [];
  let extent = 0;
  for (const m of [...marks].sort((a, b) => b.people - a.people)) {
    const r = radiusOf(m);
    const cx = x(m.tonnes);
    let cy = 0;
    for (let step = 0; step < 4000; step++) {
      const offset = Math.ceil(step / 2) * 1.1 * (step % 2 === 0 ? 1 : -1);
      const hits = placed.some((p) => {
        const dx = p.cx - cx;
        const dy = p.cy - offset;
        const reach = p.r + r + 0.55;
        return dx * dx + dy * dy < reach * reach;
      });
      if (!hits) {
        cy = offset;
        break;
      }
    }
    placed.push({ code: m.code, cx, cy, r });
    extent = Math.max(extent, Math.abs(cy) + r);
  }
  return { placed, extent };
}

/**
 * The whole frame, in pixels: which largest radius fits `bandHeight`, where every circle sits, where
 * the two cards go, and which ticks survive beside the axis name.
 *
 * @param {{marks, xMax, width, bandHeight, cards: {code, width}[], ticks: {value, width}[], nameWidth}} input
 */
export function layoutSwarm({ marks, xMax, width, bandHeight, cards, ticks, nameWidth }) {
  let x = swarmScale(xMax, width);
  let pack = null;
  let maxRadius = MAX_RADII[MAX_RADII.length - 1];
  // The static plate's ladder is measured on a plot about 900px wide; a wider plot earns proportionally larger
  // circles — and two rungs above the plate's own, so a tall frame is filled rather than holding a thin band.
  const grow = Math.max(1, width / 900);
  for (const base of [44, 36, ...MAX_RADII]) {
    const rung = Math.round(base * grow * 10) / 10;
    // The axis is inset by the radius of the widest circle at either end of it, so those circles stay
    // inside the gutters without leaving a band of bare ground when the ends are small countries.
    const biggest = Math.max(...marks.map((m) => m.people));
    const radius = (m) => Math.max(MIN_RADIUS, Math.sqrt(m.people / biggest) * rung);
    const lo = Math.min(...marks.map((m) => m.tonnes));
    const hi = Math.max(...marks.map((m) => m.tonnes));
    const edgeRadius = Math.max(...marks.filter((m) => m.tonnes - lo < xMax * 0.02 || hi - m.tonnes < xMax * 0.02).map(radius));
    const inset = 2 + edgeRadius;
    const trialX = (value) => inset + (value / (xMax * 1.02)) * (width - inset * 2);
    const trial = packSwarm(marks, trialX, rung);
    pack = trial;
    maxRadius = rung;
    x = trialX;
    if (trial.extent * 2 <= bandHeight) break;
  }
  const fits = pack.extent * 2 <= bandHeight;
  const seat = new Map(pack.placed.map((p) => [p.code, p]));

  const seated = cards
    .map((c) => {
      const p = seat.get(c.code);
      if (!p) throw new Error(`${c.code} was never seated in the swarm`);
      return { code: c.code, width: c.width, cx: p.cx, circle: p };
    })
    .sort((a, b) => a.cx - b.cx);
  for (let i = 1; i < seated.length; i++) {
    const overlap = seated[i - 1].cx + seated[i - 1].width / 2 + 12 - (seated[i].cx - seated[i].width / 2);
    if (overlap > 0) seated[i].cx += overlap;
  }
  const placedCards = seated.map((c) => {
    if (c.cx - c.width / 2 < 0) return { ...c, left: 0, anchor: "start" };
    if (c.cx + c.width / 2 > width) return { ...c, left: width - c.width, anchor: "end" };
    return { ...c, left: c.cx - c.width / 2, anchor: "middle" };
  });

  const nameLeft = width - nameWidth - 10;
  const shownTicks = ticks.filter((t) => x(t.value) + (t.value === 0 ? t.width : t.width / 2) < nameLeft);

  return { x, circles: pack.placed, extent: pack.extent, maxRadius, fits, cards: placedCards, shownTicks };
}

/**
 * WHERE THE BLOCK SITS, VERTICALLY. The cards stand just above the swarm and the average's label just
 * under it, and the three are centred together in the plot — the static plate's own stacking. A band
 * as tall as the plot put the cards at its top and the swarm at its middle, and the hairlines between
 * them ran a third of a screen.
 */
export function verticalSeat({ height, cardRoom, extent, labelHeight }) {
  const block = cardRoom + 2 * extent + 4 + labelHeight;
  const cardsTop = Math.max(0, (height - block) / 2);
  const midline = cardsTop + cardRoom + extent;
  return { cardsTop, midline, bandTop: midline - extent, bandBottom: midline + extent };
}
