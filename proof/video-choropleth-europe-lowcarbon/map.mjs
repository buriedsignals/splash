// twin/proof/video-choropleth-europe-lowcarbon/map.mjs
//
// THE VIDEO'S MAP: the plan layers the composition mounts, and every word it prints on the map,
// placed in the video's OWN cameras.
//
// Runs in Bun only (it measures words through resvg). The composition receives the plan and changes
// opacities, the class fills and the camera per frame; it never places anything.
//
// WHAT IS REUSED FROM THE STILL, AND WHAT IS NOT. `layersFor` (`../static-choropleth-europe-lowcarbon/
// beat.mjs`) builds the `classes` and `borders` layers from the study areas in degrees and the ramp —
// those are camera-independent, and this module takes them as they are. Everything else `layersFor`
// builds is bound to the STILL's camera: its words, leaders and sea names sit at unit-box positions
// searched for the 1000/760 frame, and its subject ring is a `circle-radius` in the still's pixels,
// which would stay one size while the video zooms eight times closer. So the video places its own
// words here, from degree data (`subject.geo`), in pixels of the two cameras `statesFor` computes
// (the overview and the Balkans), and draws its ring as a line in degrees that zooms with the map.
//
// A WORD IS CHECKED IN EVERY CAMERA IT IS SEEN IN: inside the map box with room for its halo, clear of
// every other word seen in that camera and of the ring's stroke, and set in an ink that reaches its
// floor on every cell under it — before the filter and after it.

import { createHash } from "node:crypto";
import { applyCase } from "#shared/chart-beat/registers.mjs";
import { contrast, TEXT_CONTRAST_MIN } from "#shared/chart-beat/render-still.mjs";
import { maptilerFace } from "#shared/map-beat/glyphs.mjs";
import { rampFor, layersFor } from "../static-choropleth-europe-lowcarbon/beat.mjs";
import { bandOf, widthOf } from "./layout.mjs";

// ── the camera, the MapLibre way: a world 512 · 2^zoom pixels wide, centred in the box ───────────

const TILE_SIZE = 512;
const RAD = Math.PI / 180;
const worldX = (lon) => (lon + 180) / 360;
const worldY = (lat) => (1 - Math.log(Math.tan(Math.PI / 4 + (lat * RAD) / 2)) / Math.PI) / 2;
const lonOf = (x) => x * 360 - 180;
const latOf = (y) => (2 * Math.atan(Math.exp((1 - 2 * y) * Math.PI)) - Math.PI / 2) / RAD;

/** A camera state (`zoom`, `centerLon`, `centerLat`) read into a map box's own pixels, both ways. */
export function cameraOf(state, box) {
  const scale = TILE_SIZE * 2 ** state.zoom;
  const cx = worldX(state.centerLon);
  const cy = worldY(state.centerLat);
  return {
    scale,
    box,
    toPx: ([lon, lat]) => [(worldX(lon) - cx) * scale + box.width / 2, (worldY(lat) - cy) * scale + box.height / 2],
    toLonLat: ([x, y]) => [lonOf(cx + (x - box.width / 2) / scale), latOf(cy + (y - box.height / 2) / scale)],
  };
}

// ── geography in degrees ─────────────────────────────────────────────────────────────────────────

const polygonsOf = (feature) =>
  feature.geometry.type === "Polygon" ? [feature.geometry.coordinates] : feature.geometry.coordinates;

function inRing(ring, [x, y]) {
  let hit = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}
/** Latitude is monotone under Mercator, so a point is inside a shape in degrees exactly when it is
 *  inside the drawn shape. Holes count by even-odd within each polygon. */
const bounds = new WeakMap();
function boundsOf(feature) {
  if (!bounds.has(feature)) {
    const pts = polygonsOf(feature).flat(2);
    bounds.set(feature, [0, 1].flatMap((k) => [Math.min(...pts.map((p) => p[k])), Math.max(...pts.map((p) => p[k]))]));
  }
  return bounds.get(feature);
}
const inFeature = (feature, point) => {
  const [x0, x1, y0, y1] = boundsOf(feature);
  if (point[0] < x0 || point[0] > x1 || point[1] < y0 || point[1] > y1) return false;
  return polygonsOf(feature).some((rings) => rings.reduce((inside, ring) => (inRing(ring, point) ? !inside : inside), false));
};

/** A word the search found no room for — a refusal of the direction, named as such. */
class NoRoom extends Error {}

const largestRingOf = (feature) => polygonsOf(feature).flat().reduce((a, b) => (b.length > a.length ? b : a));

/** Where a country's word starts looking: its largest ring's vertex mean, walked onto the ring when
 *  the mean falls outside it — the still's seat, in degrees rather than in the still's unit box. */
function seatOf(feature) {
  const ring = largestRingOf(feature);
  const mean = [0, 1].map((k) => ring.reduce((s, p) => s + p[k], 0) / ring.length);
  if (inRing(ring, mean)) return mean;
  return ring.reduce((best, p) =>
    (p[0] - mean[0]) ** 2 + (p[1] - mean[1]) ** 2 < (best[0] - mean[0]) ** 2 + (best[1] - mean[1]) ** 2 ? p : best,
  );
}

/** Two shapes are neighbours when a vertex of one lands within a tenth of a degree of a vertex of
 *  the other — `loadSubject`'s own test, run here BEFORE its `value.has` filter, because the video's
 *  zoom shows the neighbour that filter drops. */
const NEAR_DEGREES = 0.1;
function ringNeighboursOf(geo, iso) {
  const own = geo.features.filter((f) => f.properties.iso === iso).flatMap((f) => polygonsOf(f).flat(2));
  return geo.features.filter(
    (f) =>
      f.properties.iso !== iso &&
      polygonsOf(f)
        .flat(2)
        .some(([x, y]) => own.some(([u, v]) => Math.abs(x - u) < NEAR_DEGREES && Math.abs(y - v) < NEAR_DEGREES)),
  );
}

// ── boxes in pixels ──────────────────────────────────────────────────────────────────────────────

const overlaps = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
const grow = (b, d) => ({ x0: b.x0 - d, y0: b.y0 - d, x1: b.x1 + d, y1: b.y1 + d });
const contains = (b, [x, y]) => x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1;
const samplesOf = (b) => [
  [b.x0, b.y0], [b.x1, b.y0], [b.x0, b.y1], [b.x1, b.y1],
  [(b.x0 + b.x1) / 2, b.y0], [(b.x0 + b.x1) / 2, b.y1], [b.x0, (b.y0 + b.y1) / 2], [b.x1, (b.y0 + b.y1) / 2],
  [(b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2],
];

/** Does the segment a→b cross box `r`? (Liang–Barsky.) */
function segmentCrosses([ax, ay], [bx, by], r) {
  let t0 = 0;
  let t1 = 1;
  const dx = bx - ax;
  const dy = by - ay;
  for (const [p, q] of [[-dx, ax - r.x0], [dx, r.x1 - ax], [-dy, ay - r.y0], [dy, r.y1 - ay]]) {
    if (p === 0) {
      if (q < 0) return false;
    } else {
      const t = q / p;
      if (p < 0) t0 = Math.max(t0, t);
      else t1 = Math.min(t1, t);
      if (t0 > t1) return false;
    }
  }
  return true;
}

// ── the words' forms: one line, or broken at a space that does not separate a figure from its unit ─

function formsOf(text) {
  const tokens = text.split(/ (?!%)/);
  const out = [];
  const cut = (rest, lines) => {
    if (lines.length > 3) return;
    if (!rest.length) return out.push(lines);
    for (let i = 1; i <= rest.length; i++) cut(rest.slice(i), [...lines, rest.slice(0, i).join(" ")]);
  };
  cut(tokens, []);
  return out.sort((a, b) => a.length - b.length);
}

/** Every word the video map prints, uncased — so the runner resolves the axis register's family on
 *  the text the map really sets, not on the still's. */
export function mapTextsOf(subject) {
  const { geo, value, above, ODD_ONE, neighbours, format, french } = subject;
  const outside = ringNeighboursOf(geo, ODD_ONE).filter((f) => !value.has(f.properties.iso));
  return [
    ...above.filter((r) => r.iso !== ODD_ONE).map((r) => r.label),
    ...outside.map((f) => `${f.properties.name}, hors données`),
    ...neighbours.map((iso) => `${french(iso)} ${format(value.get(iso).lowCarbon)}`),
    `${french(ODD_ONE)} ${format(value.get(ODD_ONE).lowCarbon)}`,
  ];
}

/**
 * The video map for one direction.
 *
 * @param {{ direction: any, subject: any, layout: any, states: any[], tints: { water: string },
 *           accentInk: string, strokeScale: number }} input `layout` from `videoLayoutFor`, `states`
 *        from `statesFor` (in `EVENT_ORDER`), `accentInk` the accent walked to the text floor on the
 *        ground, `strokeScale` the factor the still's 960-wide strokes are drawn at.
 */
export function videoMapFor({ direction, subject, layout, states, tints, accentInk, strokeScale }) {
  const { geo, value, above, ODD_ONE, neighbours, BREAKS, format, french } = subject;
  const axis = layout.registers.axis;
  const band = bandOf(axis);
  const box = { width: layout.drawn.width, height: layout.drawn.height };
  const overview = cameraOf(states[0], box);
  const zoomed = cameraOf(states[3], box);
  const cameras = { overview, zoomed };
  const ramp = rampFor(direction, subject);

  /** Every spacing below is a share of the axis register's lead — the register the map's words are
   *  set in — so the map breathes with the panel it sits beside. */
  const PAD = axis.lead * 0.25;
  const HALO = (band.ascent * 0.34) / 2;
  const STEP = axis.lead / 4;
  const REACH = axis.lead * 7;
  /** The most of a word centred in its own shape that may lie on a neighbour carrying a word of its
   *  own: its edge, a fifth of its box — enough for a two-line name in North Macedonia, which Albania,
   *  Kosovo and Greece close in on three sides, never enough to read as the neighbour's. */
  const SPILL = 0.2;
  /** Two cells within this contrast read as one ground under a word: about one step of the ramp. */
  const CALM = 1.35;
  const ANGLES = 24;

  const featureOf = (iso) => {
    const f = geo.features.find((x) => x.properties.iso === iso);
    if (!f) throw new Error(`${iso} is named on the video map but has no frozen shape`);
    return f;
  };

  // ── derived values BRIEF.md names for the subject event, asserted ────────────────────────────
  const albania = featureOf(ODD_ONE);
  const ringNeighbours = ringNeighboursOf(geo, ODD_ONE);
  const measured = ringNeighbours.filter((f) => value.has(f.properties.iso)).map((f) => f.properties.iso);
  const outside = ringNeighbours.filter((f) => !value.has(f.properties.iso));
  if (ringNeighbours.length !== 4 || measured.sort().join() !== [...neighbours].sort().join() || outside.length !== 1)
    throw new Error(
      `the zoom names ${french(ODD_ONE)}'s four ring-neighbours — ${neighbours.join(", ")} measured and one ` +
        `outside the data; the frozen rings give ${ringNeighbours.map((f) => f.properties.iso).join(", ")}`,
    );
  const window = [albania, ...ringNeighbours].map(largestRingOf).flat();
  const span = {
    west: Math.min(...window.map((p) => p[0])),
    east: Math.max(...window.map((p) => p[0])),
    south: Math.min(...window.map((p) => p[1])),
    north: Math.max(...window.map((p) => p[1])),
  };
  const BRIEF_WINDOW = { west: 18.4, east: 26.6, south: 36.4, north: 43.5 };
  const drift = Math.max(...Object.keys(BRIEF_WINDOW).map((k) => Math.abs(span[k] - BRIEF_WINDOW[k])));
  if (drift > 0.1)
    throw new Error(
      `the Balkans window is the union of the five largest rings, 18.4–26.6°E × 36.4–43.5°N; the frozen ` +
        `rings now span ${span.west.toFixed(2)}–${span.east.toFixed(2)}°E × ${span.south.toFixed(2)}–${span.north.toFixed(2)}°N`,
    );
  const albaniaWidthAt = (camera) => {
    const xs = polygonsOf(albania).flat(2).map(([lon]) => worldX(lon));
    return (Math.max(...xs) - Math.min(...xs)) * camera.scale;
  };
  const oddValueText = format(value.get(ODD_ONE).lowCarbon);
  const oddValueWidth = widthOf(oddValueText, axis);
  if (!(albaniaWidthAt(overview) < oddValueWidth && albaniaWidthAt(zoomed) >= oddValueWidth))
    throw new Error(
      `the zoom is evidence only if ${french(ODD_ONE)} is narrower than « ${oddValueText} » at the overview and ` +
        `not at the zoom: it draws ${albaniaWidthAt(overview).toFixed(1)}px and ${albaniaWidthAt(zoomed).toFixed(1)}px ` +
        `against a ${oddValueWidth.toFixed(1)}px label`,
    );

  // ── the ring: the subject's own hull, drawn a fixed distance outside it ───────────────────────
  /** A RING THAT HUGS AT THE ZOOM AND STILL READS AT THE OVERVIEW. A circle or an ellipse in degrees
   *  grows eight times with the zoom and swallowed the neighbours the zoom exists to print; one in
   *  pixels would stay the overview's size over a shape eight times larger. So the ring is the convex
   *  hull of Albania's own rings, in degrees — it zooms with the shape — drawn with a `line-offset`
   *  in pixels, so the air between shape and ring is the same quarter lead in both cameras. The hull
   *  is wound counter-clockwise on screen, which puts a positive offset outside it. */
  const ringStroke = direction.stroke.rule * 1.6 * strokeScale;
  const RING_OFFSET = PAD + ringStroke / 2;
  const ring = (() => {
    const pts = polygonsOf(albania)
      .flat(2)
      .map(([lon, lat]) => [worldX(lon), worldY(lat)])
      .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const half = (list) => {
      const out = [];
      for (const p of list) {
        while (out.length >= 2 && cross(out.at(-2), out.at(-1), p) <= 0) out.pop();
        out.push(p);
      }
      return out.slice(0, -1);
    };
    // Monotone chain: counter-clockwise with y up, so clockwise on a y-down screen — reversed.
    const hull = [...half(pts), ...half([...pts].reverse())].reverse();
    // The line runs one edge past its start: an offset line's two ends do not join, and the overlap
    // closes the notch they would leave.
    const line = [...hull, hull[0], hull[1]].map(([x, y]) => [lonOf(x), latOf(y)]);
    const closed = [...hull, hull[0]].map(([x, y]) => [lonOf(x), latOf(y)]);
    const hullPx = (camera) => closed.map(camera.toPx);
    const distanceToEdges = (poly, [x, y]) => {
      let best = Infinity;
      for (let k = 1; k < poly.length; k++) {
        const [ax, ay] = poly[k - 1];
        const [bx, by] = poly[k];
        const t = Math.max(0, Math.min(1, ((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / ((bx - ax) ** 2 + (by - ay) ** 2 || 1)));
        best = Math.min(best, Math.hypot(x - (ax + t * (bx - ax)), y - (ay + t * (by - ay))));
      }
      return best;
    };
    /** Is a pixel inside the ring's reach — the hull, its air and its stroke — plus `margin`? */
    const inside = (camera, p, margin = 0) => {
      const poly = hullPx(camera);
      return inRing(poly, p) || distanceToEdges(poly, p) <= RING_OFFSET + ringStroke / 2 + margin;
    };
    /** Does a word's box, with its halo, touch the ring's reach? */
    const blocks = (camera, b) => {
      const g = grow(b, HALO);
      for (let u = 0; u <= 4; u++)
        for (let v = 0; v <= 2; v++)
          if (inside(camera, [g.x0 + ((g.x1 - g.x0) * u) / 4, g.y0 + ((g.y1 - g.y0) * v) / 2])) return true;
      return hullPx(camera).some((p) => contains(grow(g, RING_OFFSET + ringStroke / 2), p));
    };
    return { line, inside, blocks };
  })();

  /** The fill really under a point, before the filter (`filtered` false) or after it. */
  const cellAt = (point, filtered) => {
    const hit = geo.features.find((f) => inFeature(f, point));
    if (!hit) return tints.water;
    const v = value.get(hit.properties.iso)?.lowCarbon;
    if (v !== undefined) {
      const klass = ramp.classOf(v);
      return filtered && klass < BREAKS.length ? ramp.landNoValue : ramp.classFill(klass);
    }
    return subject.studySet.includes(hit.properties.iso) ? ramp.missingFill : ramp.landNoValue;
  };

  // ── the words ────────────────────────────────────────────────────────────────────────────────
  const set = (text) => applyCase(text, axis.transform);
  const namedHomes = new Set([...above.map((r) => r.iso)]);
  const reveal = above
    .filter((r) => r.iso !== ODD_ONE)
    .map((r) => ({ group: "names", iso: r.iso, text: set(r.label), klass: "feature", seen: [["overview", false], ["overview", true]] }));
  /** The natural order at the zoom: the word outside the data (the longest, on the smallest shape),
   *  then the measured neighbours. `orders` below tries others when this one cannot seat them all. */
  const zoomWords = [
    ...outside.map((f) => ({
      group: "neighbours",
      iso: f.properties.iso,
      text: set(`${f.properties.name}, hors données`),
      klass: "area",
      seen: [["zoomed", false]],
    })),
    ...neighbours.map((iso) => ({
      group: "neighbours",
      iso,
      text: set(`${french(iso)} ${format(value.get(iso).lowCarbon)}`),
      klass: "area",
      seen: [["zoomed", false]],
    })),
  ];
  const subjectWord = {
    group: "subject",
    iso: ODD_ONE,
    text: set(`${french(ODD_ONE)} ${oddValueText}`),
    klass: "feature",
    seen: [["zoomed", false], ["overview", false], ["overview", true]],
  };

  const placed = []; // { camera, box } — every word box, in the camera it is seen in
  const leaderBoxes = []; // { camera, from, to }
  const mark = () => [placed.length, leaderBoxes.length];
  const rewind = ([words, leadersSoFar]) => {
    placed.length = words;
    leaderBoxes.length = leadersSoFar;
  };
  const inkFloor = (klass) => (klass === "feature" ? 7 : TEXT_CONTRAST_MIN);

  /** The cells under a word's box, most common first, on a 5 × 3 grid, in one state. */
  const cellsUnder = (camera, b, filtered) => {
    const counts = new Map();
    for (let u = 0; u <= 4; u++)
      for (let v = 0; v <= 2; v++) {
        const cell = cellAt(camera.toLonLat([b.x0 + ((b.x1 - b.x0) * u) / 4, b.y0 + ((b.y1 - b.y0) * v) / 2]), filtered);
        counts.set(cell, (counts.get(cell) ?? 0) + 1);
      }
    return [...counts].sort((a, c) => c[1] - a[1]);
  };

  /** ONE INK FOR EVERY CELL A WORD'S CENTRE IS SEEN OVER, AND A HALO STRUCK IN THE CELL UNDER THE WORD
   *  THAT PARTS FROM THAT INK THE MOST — the cartographer's halo: a light edge round dark letters, a
   *  dark edge round light ones. Over that cell the halo disappears; over any other it reads as the
   *  word's own edge. Struck in the cell under the word's centre, or in the most common one, a word
   *  straddling a light cell and a dark one drew a block of the dark colour across the light. The ink
   *  is taken from the most common cell first, then from each centre cell. */
  function inkOver(klass, cells, under) {
    for (const cell of [under[0][0], ...cells]) {
      const ink = ramp.inkFor(klass, cell);
      if (!ink) continue;
      const halo = under.map(([c]) => c).reduce((a, c) => (contrast(ink, c) > contrast(ink, a) ? c : a));
      if (contrast(ink, halo) >= inkFloor(klass) && cells.every((c) => contrast(ink, c) >= TEXT_CONTRAST_MIN))
        return { ink, halo };
    }
    return null;
  }

  const sizeOf = (lines) => ({
    width: Math.max(...lines.map((l) => widthOf(l, axis))),
    height: (lines.length - 1) * axis.lead + band.ascent + band.descent,
  });
  const boxAt = (centre, size) => ({
    x0: centre[0] - size.width / 2,
    x1: centre[0] + size.width / 2,
    y0: centre[1] - size.height / 2,
    y1: centre[1] + size.height / 2,
  });
  /** Nothing clipped: the word and its halo stay inside the map box, with the ring's stroke of air. */
  const EDGE = HALO + ringStroke;
  const inFrame = (b) => b.x0 >= EDGE && b.y0 >= EDGE && b.x1 <= box.width - EDGE && b.y1 <= box.height - EDGE;
  const clearAt = (cameraName, b) => {
    const camera = cameras[cameraName];
    if (!inFrame(b)) return false;
    const grown = grow(b, PAD + HALO);
    if (placed.some((p) => p.camera === cameraName && overlaps(grown, p.box))) return false;
    if (leaderBoxes.some((l) => l.camera === cameraName && segmentCrosses(l.from, l.to, grown))) return false;
    if (ring.blocks(camera, b)) return false;
    return true;
  };
  /** Where a word beside the subject's neighbour starts from: the shape's own seat, unless the ring
   *  is drawn over it — Kosovo's seat sits under the ring at the zoom — in which case the point of the
   *  shape, clear of the ring, farthest from the shape's own edge. A leader from under the ring would
   *  cross it. */
  function seatOutsideRing(camera, feature) {
    const seat = camera.toPx(seatOf(feature));
    const clear = (p) => !ring.inside(camera, p, PAD);
    if (clear(seat) || feature === albania) return seat;
    const edge = polygonsOf(feature).flat(2).map(camera.toPx);
    const xs = edge.map((p) => p[0]);
    const ys = edge.map((p) => p[1]);
    let best = null;
    for (let x = Math.min(...xs); x <= Math.max(...xs); x += STEP / 2)
      for (let y = Math.min(...ys); y <= Math.max(...ys); y += STEP / 2) {
        if (!clear([x, y]) || !inFeature(feature, camera.toLonLat([x, y]))) continue;
        const depth = Math.min(...edge.map((q) => Math.hypot(q[0] - x, q[1] - y)));
        if (!best || depth > best.depth) best = { p: [x, y], depth };
      }
    return best ? best.p : seat;
  }

  /** A leader drawn through the ring reads as a second mark on the subject. */
  const crossesRing = (camera, from, to) =>
    Array.from({ length: 33 }, (_, i) => [from[0] + ((to[0] - from[0]) * i) / 32, from[1] + ((to[1] - from[1]) * i) / 32]).some(
      (p) => ring.inside(camera, p),
    );
  const candidates = function* () {
    for (let r = 0; r <= REACH; r += STEP)
      for (let k = 0; k < (r === 0 ? 1 : ANGLES); k++) {
        const t = (k / ANGLES) * 2 * Math.PI;
        yield [r * Math.cos(t), r * Math.sin(t)];
      }
  };

  /** Two options for one word closer than a lead are the same option. */
  const distinct = (seen, centre) => {
    if (seen.some((c) => Math.hypot(c[0] - centre[0], c[1] - centre[1]) < axis.lead)) return false;
    seen.push(centre);
    return true;
  };

  /** Every place a word anchored at one point and seen in one camera may go (the reveal names, the
   *  zoom's neighbours), best first, in three passes: the whole word inside its own shape; its centre
   *  inside its own shape; beside the shape on a leader. Each option carries the boxes and the leader
   *  it would claim; the caller claims them. */
  function* anchoredOptions(word) {
    const [cameraName] = word.seen[0];
    const camera = cameras[cameraName];
    const home = featureOf(word.iso);
    const seat = seatOutsideRing(camera, home);
    const others = [...namedHomes, ...zoomWords.map((w) => w.iso)]
      .filter((iso) => iso !== word.iso)
      .map((iso) => camera.toPx(seatOf(featureOf(iso))));
    /** The shapes that carry a word of their own in this camera. A word read over one of them is
     *  read as that shape's — « Kosovo, hors données » set on North Macedonia names the wrong place —
     *  so a word beside its shape keeps off all of them, and at the zoom a word inside its shape may
     *  not spill onto a neighbour that is named beside it. */
    const labelledHomes = (cameraName === "zoomed" ? [ODD_ONE, ...zoomWords.map((w) => w.iso)] : [...namedHomes])
      .filter((iso) => iso !== word.iso)
      .map(featureOf);
    const onAnotherHome = (b) =>
      samplesOf(b).some((p) => labelledHomes.some((f) => inFeature(f, camera.toLonLat(p))));
    /** How much of a word lies on another labelled shape, as a share of a 5 × 3 grid over its box. */
    const shareOnAnotherHome = (b) => {
      let on = 0;
      for (let u = 0; u <= 4; u++)
        for (let v = 0; v <= 2; v++) {
          const p = camera.toLonLat([b.x0 + ((b.x1 - b.x0) * u) / 4, b.y0 + ((b.y1 - b.y0) * v) / 2]);
          if (labelledHomes.some((f) => inFeature(f, p))) on++;
        }
      return on / 15;
    };
    const yielded = [];
    for (const pass of ["whole", "calm", "centre", "leader"])
      for (const lines of formsOf(word.text)) {
        const size = sizeOf(lines);
        for (const [dx, dy] of candidates()) {
          const centre = [seat[0] + dx, seat[1] + dy];
          const b = boxAt(centre, size);
          const at = (p) => camera.toLonLat(p);
          if (pass === "whole" && !samplesOf(b).every((p) => inFeature(home, at(p)))) continue;
          // Centred in its own shape, and set on ground that reads as one: every cell under the word
          // within a quiet step of its shape's own. Straddling a dark class and a light one, a word's
          // halo shows as a block over the half it does not match (North Macedonia on Bulgaria).
          // The zoom's words only: at the overview a name on its own class and the sea beside it is
          // how every name in the north is set, and the pass sent « Suède » to Lapland above Norway.
          if (pass === "calm") {
            if (cameraName !== "zoomed" || !inFeature(home, at(centre))) continue;
            if (shareOnAnotherHome(b) > SPILL) continue;
            const own = cellAt(at(centre), word.seen.at(-1)[1]);
            if (cellsUnder(camera, b, word.seen.at(-1)[1]).some(([c]) => contrast(c, own) > CALM)) continue;
          }
          if (pass === "centre" && !inFeature(home, at(centre))) continue;
          // At the zoom a word centred in its own shape may reach a neighbour's edge, not sit on it.
          if (pass === "centre" && cameraName === "zoomed" && shareOnAnotherHome(b) > SPILL) continue;
          if (pass === "leader" && (inFeature(home, at(centre)) || onAnotherHome(b))) continue;
          // A word on a leader is set BESIDE its shape, not half over it: « Kosovo, hors données » with
          // its centre on Serbia and its first word on Kosovo read as a label stuck across a border.
          if (pass === "leader" && samplesOf(b).some((p) => inFeature(home, at(p)))) continue;
          if (others.some((p) => contains(grow(b, PAD), p))) continue;
          if (!clearAt(cameraName, b)) continue;
          const lonLat = at(centre);
          const colours = inkOver(
            word.klass,
            word.seen.map(([, filtered]) => cellAt(lonLat, filtered)),
            cellsUnder(camera, b, word.seen.at(-1)[1]),
          );
          if (!colours) continue;
          let leader = null;
          if (pass === "leader") {
            const edge = [Math.min(Math.max(seat[0], b.x0), b.x1), Math.min(Math.max(seat[1], b.y0), b.y1)];
            if (placed.some((p) => p.camera === cameraName && segmentCrosses(seat, edge, grow(p.box, PAD)))) continue;
            if (crossesRing(camera, seat, edge)) continue;
            leader = { from: seat, to: edge };
          }
          if (!distinct(yielded, centre)) continue;
          yield {
            boxes: [{ camera: cameraName, box: b, text: word.text }],
            leaders: leader ? [{ camera: cameraName, ...leader }] : [],
            result: {
              ...word,
              lines,
              pass,
              lonLat,
              ...colours,
              leader: leader && { from: at(leader.from), to: at(leader.to) },
              box: b,
            },
          };
        }
      }
  }

  /** THE CAMERA BETWEEN THE ZOOM AND THE OVERVIEW, at a share `closing` of the way from the
   *  overview's pixel scale (0) to the zoom's (1) — the composition's own path (`cameraBetween` in
   *  `DirectedChoroplethVideo.tsx`): the zoom about the one point that sits at the same pixel in both
   *  cameras, read here at a scale rather than at a time. */
  const zoomState = states[3];
  const overviewState = states[0];
  const cameraAtClosing = (closing) => {
    const s0 = 2 ** overviewState.zoom;
    const s1 = 2 ** zoomState.zoom;
    const s = s0 + (s1 - s0) * closing;
    const c0 = [worldX(overviewState.centerLon), worldY(overviewState.centerLat)];
    const c1 = [worldX(zoomState.centerLon), worldY(zoomState.centerLat)];
    const fixed = c0.map((c, k) => (c * s0 - c1[k] * s1) / (s0 - s1));
    const c = fixed.map((f, k) => f + ((c0[k] - f) * s0) / s);
    return cameraOf({ zoom: Math.log2(s), centerLon: lonOf(c[0]), centerLat: latOf(c[1]) }, box);
  };
  /** The subject's word is checked at every one of these steps of the pull back, not only at its two
   *  ends: interpolated between a place beside the ring at the zoom and one beside it at the overview,
   *  the word crossed the ring half-way. */
  const PATH_STEPS = 16;

  /** Every place the subject's word may go. It is anchored at its seat and seen from the zoom to the
   *  hold, so an option is a PATH of offsets — one per step of the pull back, each the valid place
   *  nearest the step before — that the composition glides along with the map's scale: beside the
   *  ring and never inside it, clear of the reveal's names as they come back into the frame, in the
   *  same form all the way, and at the zoom off every neighbour that carries a word of its own. */
  function* subjectOptions(word) {
    const home = featureOf(word.iso);
    const seatLonLat = seatOf(home);
    const valid = (camera, b, atZoom) => {
      if (!inFrame(b) || ring.blocks(camera, b)) return false;
      const grown = grow(b, PAD + HALO);
      if (atZoom) {
        if (placed.some((p) => p.camera === "zoomed" && overlaps(grown, p.box))) return false;
        if (leaderBoxes.some((l) => l.camera === "zoomed" && segmentCrosses(l.from, l.to, grown))) return false;
        return !samplesOf(b).some((p) => zoomWords.some((w) => inFeature(featureOf(w.iso), camera.toLonLat(p))));
      }
      return !revealPlaced.some((w) => {
        const [x, y] = camera.toPx(w.lonLat);
        const half = { width: w.box.x1 - w.box.x0, height: w.box.y1 - w.box.y0 };
        return overlaps(grown, boxAt([x, y], half));
      });
    };
    for (const lines of formsOf(word.text)) {
      const size = sizeOf(lines);
      const zoomSeat = zoomed.toPx(seatLonLat);
      const starts = [];
      for (const [dx, dy] of candidates()) {
        const centre = [zoomSeat[0] + dx, zoomSeat[1] + dy];
        if (!valid(zoomed, boxAt(centre, size), true) || !distinct(starts, centre)) continue;
        const path = [[1, dx, dy]];
        for (let k = PATH_STEPS - 1; k >= 0 && path.length; k--) {
          const closing = k / PATH_STEPS;
          const camera = k === 0 ? overview : cameraAtClosing(closing);
          const seat = camera.toPx(seatLonLat);
          const [, px, py] = path.at(-1);
          const next = [...candidates()]
            .map(([ex, ey]) => [ex, ey])
            .sort((a, b) => Math.hypot(a[0] - px, a[1] - py) - Math.hypot(b[0] - px, b[1] - py))
            .find(([ex, ey]) => valid(camera, boxAt([seat[0] + ex, seat[1] + ey], size), false));
          if (!next) path.length = 0;
          else path.push([closing, next[0], next[1]]);
        }
        if (path.length !== PATH_STEPS + 1) continue;
        const [, ox, oy] = path.at(-1);
        const overviewSeat = overview.toPx(seatLonLat);
        const atOverview = boxAt([overviewSeat[0] + ox, overviewSeat[1] + oy], size);
        const atZoom = boxAt(centre, size);
        const overviewLonLat = overview.toLonLat([overviewSeat[0] + ox, overviewSeat[1] + oy]);
        const cells = [
          cellAt(zoomed.toLonLat(centre), false),
          cellAt(overviewLonLat, false),
          cellAt(overviewLonLat, true),
        ];
        const colours = inkOver(word.klass, cells, cellsUnder(overview, atOverview, true));
        if (!colours) continue;
        yield {
          boxes: [
            { camera: "zoomed", box: atZoom, text: word.text },
            { camera: "overview", box: atOverview, text: word.text },
          ],
          leaders: [],
          result: {
            ...word,
            lines,
            lonLat: seatLonLat,
            /** `[closing, dx, dy]` in ems of the axis register, from the zoom (1) to the overview (0). */
            offsets: path.map(([closing, dx, dy]) => [closing, dx / axis.fontSize, dy / axis.fontSize]),
            ...colours,
            boxes: { zoomed: atZoom, overview: atOverview },
          },
        };
      }
    }
  }

  /** THE WORDS OF ONE CAMERA ARE SEATED TOGETHER, NOT ONE AFTER ANOTHER. Five words at the axis
   *  register's size share the zoom's frame eight degrees wide, and a greedy search that gives the
   *  first word its best place can leave the next with none. So each word offers its best few distinct
   *  places, and the search backs up through them until every word has one; no combination seating
   *  them all is a refusal that names the word it could not seat. */
  const OPTIONS_PER_WORD = 24;
  function seatTogether(list) {
    let deepest = { depth: -1, word: null };
    const walk = (i) => {
      if (i === list.length) return [];
      if (i > deepest.depth) deepest = { depth: i, word: list[i] };
      let tried = 0;
      const options = list[i].group === "subject" ? subjectOptions(list[i]) : anchoredOptions(list[i]);
      for (const option of options) {
        const before = mark();
        placed.push(...option.boxes);
        leaderBoxes.push(...option.leaders);
        const rest = walk(i + 1);
        if (rest) return [option.result, ...rest];
        rewind(before);
        if (++tried >= OPTIONS_PER_WORD) break;
      }
      return null;
    };
    const seated = walk(0);
    if (!seated) {
      const word = deepest.word;
      throw new NoRoom(
        `no room on the ${word.seen[0][0]} map for « ${word.text} » beside the words placed before it: every ` +
          `position within ${REACH.toFixed(0)}px of its seat collides, clips or cannot be read`,
      );
    }
    return seated;
  }

  const revealPlaced = seatTogether(reveal);

  /** …AND IN MORE THAN ONE ORDER. A word first in the walk offers its places before it knows its
   *  neighbours' needs, so the zoom's words are walked in every order of the four neighbours (the
   *  subject's word, which must hold from the zoom to the hold, last), from the natural one; the first
   *  order that seats all five wins. */
  function* orders(list) {
    if (list.length <= 1) return yield list;
    for (let i = 0; i < list.length; i++)
      for (const rest of orders([...list.slice(0, i), ...list.slice(i + 1)])) yield [list[i], ...rest];
  }
  let zoomSeated = null;
  let refusal = null;
  for (const order of orders(zoomWords)) {
    try {
      zoomSeated = seatTogether([...order, subjectWord]);
      break;
    } catch (error) {
      if (!(error instanceof NoRoom)) throw error;
      refusal ??= error;
    }
  }
  if (!zoomSeated) throw refusal;
  const subjectPlaced = zoomSeated.at(-1);
  const zoomPlaced = zoomWords.map((w) => zoomSeated.find((o) => o.group === w.group && o.iso === w.iso));

  const unnamed = outside.filter((f) => !zoomPlaced.some((w) => w.iso === f.properties.iso));
  if (unnamed.length)
    throw new Error(`every ring-neighbour without a value is named at the zoom; ${unnamed.map((f) => f.properties.name).join(", ")} is not`);

  // ── the plan's layers ────────────────────────────────────────────────────────────────────────
  /** `classes` and `borders` exactly as the still builds them. `layersFor` also needs a placement
   *  and the still's geometry for the layers this module replaces; it is handed empty word lists and
   *  the video's own axis register, and only the two camera-independent layers are kept. */
  const still = layersFor(
    direction,
    { axisBand: band, mapW: box.width },
    { registers: { area: axis, feature: axis, water: axis }, labels: [], waters: [] },
    subject,
  );
  const [classes, borders] = ["classes", "borders"].map((id) => still.find((l) => l.id === id));

  const point = (lonLat, properties) => ({ type: "Feature", properties, geometry: { type: "Point", coordinates: lonLat } });
  const collection = (features) => ({ type: "FeatureCollection", features });
  const nameOf = (w) => w.lines.join("\n");
  const words = (id, placedWords, extra = {}) => ({
    id,
    role: "place",
    type: "symbol",
    data: collection(
      placedWords.map((w) => point(w.lonLat, { iso: w.iso, name: nameOf(w), ink: w.ink, halo: w.halo, ...extra(w) })),
    ),
    layout: {
      "text-field": ["get", "name"],
      "text-font": [maptilerFace(axis)],
      "text-size": axis.fontSize,
      "text-letter-spacing": Number(axis.letterSpacing ?? 0) / axis.fontSize,
      "text-line-height": axis.lead / axis.fontSize,
      "text-max-width": Math.ceil(box.width / axis.fontSize),
      "text-allow-overlap": true,
      "text-ignore-placement": true,
    },
    paint: {
      "text-color": ["get", "ink"],
      "text-halo-color": ["get", "halo"],
      "text-halo-width": HALO,
      "text-opacity": 0,
    },
  });
  const leaders = [...revealPlaced, ...zoomPlaced].filter((w) => w.leader);

  const layers = [
    classes,
    borders,
    {
      id: "leaders",
      role: "place",
      type: "line",
      data: collection(
        leaders.map((w) => ({
          type: "Feature",
          properties: { iso: w.iso, group: w.group },
          geometry: { type: "LineString", coordinates: [w.leader.from, w.leader.to] },
        })),
      ),
      paint: { "line-color": ramp.coast, "line-width": direction.stroke.rule * strokeScale, "line-opacity": 0 },
    },
    {
      id: "subject-ring",
      role: "subject",
      type: "line",
      data: collection([{ type: "Feature", properties: { iso: ODD_ONE }, geometry: { type: "LineString", coordinates: ring.line } }]),
      layout: { "line-join": "round" },
      paint: { "line-color": accentInk, "line-width": ringStroke, "line-offset": RING_OFFSET, "line-opacity": 0 },
    },
    words("reveal-names", revealPlaced, () => ({})),
    words("neighbour-values", zoomPlaced, () => ({})),
    {
      ...words("subject-name", [subjectPlaced], (w) => ({ offsets: w.offsets })),
      role: "subject",
    },
  ];

  return {
    layers,
    ringStroke,
    words: [...revealPlaced, ...zoomPlaced, subjectPlaced],
    texts: [...revealPlaced, ...zoomPlaced, subjectPlaced].flatMap((w) => w.lines),
    report: {
      ringNeighbours: ringNeighbours.map((f) => f.properties.iso),
      window: span,
      albaniaWidth: { overview: albaniaWidthAt(overview), zoomed: albaniaWidthAt(zoomed), label: oddValueWidth },
    },
  };
}

/** A layer's data replaced by what an audit asks of it — how many features, and a digest of them —
 *  so the committed props file does not carry the study geometry three times per direction. */
export function auditedPlan(plan) {
  return {
    ...plan,
    layers: plan.layers.map((l) => ({
      ...l,
      data: {
        type: l.data.type,
        features: l.data.features.length,
        sha256: createHash("sha256").update(JSON.stringify(l.data)).digest("hex"),
      },
    })),
  };
}
