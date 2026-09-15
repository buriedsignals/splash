// SUTHERLAND–HODGMAN, BORROWED BY THE OTHER VIDEO MAPS. This beat drew Natural Earth in SVG and clipped its rings
// here before the scrolly's clamp could fold them; it now draws the live MapTiler map, and only the clip stays, for
// the video beats that still draw SVG maps and import it from this file (the cartogram, the dot density, the flow
// map, the locator). The algorithm is `proof/scrolly-contour-europe-distance/contour-field.mjs`'s `clipRing`, with
// its box as a parameter.

/** Sutherland–Hodgman: the part of a closed ring inside an axis-aligned box, each crossing cut where the
 *  edge really crosses the box. */
export function clipRing(pts, box) {
  const cut = (a, b, axis, v) => {
    const t = (v - a[axis]) / (b[axis] - a[axis]);
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  };
  const edges = [
    [(p) => p[0] >= box.x0, (a, b) => cut(a, b, 0, box.x0)],
    [(p) => p[0] <= box.x1, (a, b) => cut(a, b, 0, box.x1)],
    [(p) => p[1] >= box.y0, (a, b) => cut(a, b, 1, box.y0)],
    [(p) => p[1] <= box.y1, (a, b) => cut(a, b, 1, box.y1)],
  ];
  let out = pts;
  for (const [inside, cross] of edges) {
    const input = out;
    out = [];
    for (let i = 0; i < input.length; i++) {
      const cur = input[i];
      const prev = input[(i + input.length - 1) % input.length];
      if (inside(cur)) {
        if (!inside(prev)) out.push(cross(prev, cur));
        out.push(cur);
      } else if (inside(prev)) out.push(cross(prev, cur));
    }
    if (!out.length) break;
  }
  return out;
}
