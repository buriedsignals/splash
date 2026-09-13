// THE ONE IMPLEMENTATION OF THIS BEAT'S GEOMETRY, USED TWICE: in node by `DirectedScatterScrolly.tsx` for
// the picture a reader without a script gets, and in the page by `scatter-drive.mjs`, where the frame is
// the reader's own pixels. Circles stay circles, so nothing is drawn in a stretched viewBox.
//
// The rules are the static plate's (`static-connected-scatter-lowcarbon/DirectedConnectedScatter.tsx`):
//   - both axes are shares, both zero-based; the y axis runs 0–100;
//   - the link is a quadratic arc that bows by a fixed fraction of its chord, capped, so no arc
//     collapses into the straight line that would read as interpolation;
//   - the ring is the earlier state, the disc the later one.

/** The point at `t` along the quadratic from P0 through control C to P1, and the part of the curve up to
 *  it (de Casteljau), so an arc can be drawn as far as the disc has travelled. */
export function arcAt(p0, c, p1, t) {
  const q0 = [p0[0] + (c[0] - p0[0]) * t, p0[1] + (c[1] - p0[1]) * t];
  const q1 = [c[0] + (p1[0] - c[0]) * t, c[1] + (p1[1] - c[1]) * t];
  const b = [q0[0] + (q1[0] - q0[0]) * t, q0[1] + (q1[1] - q0[1]) * t];
  return { point: b, partial: `M ${p0[0].toFixed(1)} ${p0[1].toFixed(1)} Q ${q0[0].toFixed(1)} ${q0[1].toFixed(1)} ${b[0].toFixed(1)} ${b[1].toFixed(1)}` };
}

/**
 * Every entity's two seats, its arc's control point, in the plot's own pixels.
 * @param {{code: string, from: {weight: number, ownMix: number}, to: {weight: number, ownMix: number}}[]} entities
 */
export function scatterLayout(entities, { width, height, xMax, inset }) {
  const x = (v) => inset + (v / xMax) * (width - inset * 2);
  const y = (v) => height - inset - (v / 100) * (height - inset * 2);
  return {
    x,
    y,
    seats: entities.map((e) => {
      const p0 = [x(e.from.weight), y(e.from.ownMix)];
      const p1 = [x(e.to.weight), y(e.to.ownMix)];
      const dx = p1[0] - p0[0];
      const dy = p1[1] - p0[1];
      const len = Math.hypot(dx, dy) || 1;
      const bow = Math.min(len * 0.18, 26);
      const c = [(p0[0] + p1[0]) / 2 - (dy / len) * bow, (p0[1] + p1[1]) / 2 + (dx / len) * bow];
      return { code: e.code, p0, c, p1 };
    }),
  };
}
