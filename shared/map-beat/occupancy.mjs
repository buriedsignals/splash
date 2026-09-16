// twin/shared/map-beat/occupancy.mjs
//
// WHICH OF A BASEMAP'S GROUNDS A BEAT'S MARKS ACTUALLY OCCUPY — MEASURED, NEVER NAMED.
//
// THE DEFECT THIS CLOSES. `plateGrounds` handed EVERY map beat both of a basemap's grounds, so
// `guardColour` measured every mark against the sea whether or not the mark had ever been near it.
// The newsroom's house teal `#0B7A75` is 30.0° of hue from the filed water convention `#1F6FB2` —
// inside the 40° this corpus counts as one pole — so twelve beats whose fills, dots, hexes and pins
// are all on LAND were refused outright, at render time, for the colour of a ground they do not sit
// on. A refusal that is not about the drawing is worse than no guard: it teaches a producer to turn
// the guard off.
//
// AND WHY IT IS NOT A LIST OF BEAT NAMES, NOR A TYPE NAME. "A choropleth is on land, a flow map is
// on water" is true of these twelve and false on the thirteenth: a choropleth of shipping lanes is
// on water, a flow map between two inland cities is not, and a proportional-symbol map of PORTS is
// the same type as one of power stations with the opposite answer. The type is a hint about the
// subject, not a fact about the drawing. What IS a fact about the drawing is where the marks land,
// so that is what this measures.
//
// THE RULE, IN ONE SENTENCE: A MARK OCCUPIES A GROUND WHEN THAT GROUND HAS ROOM FOR THE MARK INSIDE
// IT — when the ground runs, under some point of the mark's own footprint, at least as deep as the
// mark's own radius.
//
// That is the reader's question, not an approximation of it. A mark you must pick OUT of a ground is
// a mark the ground surrounds; a mark that merely touches a coastline is picked out along the rest
// of its edge, and its overlap with the sea is a coastline, not a seat. The same sentence answers
// every mark kind, because every mark kind has a radius: a circle has one, a ribbon has half its
// width, a hex or a country fill has the largest disc that fits inside it. Nothing here is tuned per
// beat and there is no share, threshold or tolerance to tune.
//
// WHAT SUPPLIES THE GROUND. A `field` — two distance transforms over the basemap the beat itself
// baked, in the plate's own pixel space: how deep the water runs at a point, and how deep the land
// runs at a point. Reading it takes a PNG decoder, which an installed root does not carry, so the
// reader lives beside the other pixel readers in `scripts/map-beat/plate-water.mjs` and the RULE
// lives here, where every root receives it. The same split `colour-space.mjs` / `pixel-palette.mjs`
// already draws for the harvester.

/** A footprint's own radius — the half-thickness of the thing that is drawn. */
export function radiusOf(mark) {
  if (mark.kind === "disc") return mark.r;
  if (mark.kind === "band") return mark.width / 2;
  if (mark.kind === "area") {
    if (typeof mark.radius === "number") return mark.radius;
    return inradiusOf(mark.rings);
  }
  throw new Error(`a footprint must be a disc, a band or an area, not ${JSON.stringify(mark.kind)}`);
}

/** The points of a footprint a ground is read under. Enough of them that a mark cannot slip between
 *  two samples: the step is a quarter of the mark's own radius, never coarser than the mark. */
export function samplesOf(mark) {
  const r = Math.max(radiusOf(mark), 0.5);
  const step = Math.max(0.5, r / 4);
  const out = [];
  if (mark.kind === "disc") {
    out.push([mark.x, mark.y]);
    for (let dy = -mark.r; dy <= mark.r; dy += step)
      for (let dx = -mark.r; dx <= mark.r; dx += step)
        if (dx * dx + dy * dy <= mark.r * mark.r) out.push([mark.x + dx, mark.y + dy]);
    return out;
  }
  if (mark.kind === "band") {
    const half = mark.width / 2;
    for (let i = 1; i < mark.points.length; i += 1) {
      const [x0, y0] = mark.points[i - 1];
      const [x1, y1] = mark.points[i];
      const len = Math.hypot(x1 - x0, y1 - y0);
      const n = Math.max(1, Math.ceil(len / step));
      for (let k = 0; k <= n; k += 1) {
        const t = k / n;
        out.push([x0 + (x1 - x0) * t, y0 + (y1 - y0) * t]);
      }
    }
    // A band is drawn with a width; its edges meet grounds its centreline never does, so the
    // centreline alone is not the footprint. Half a width to either side, along the normal.
    if (half > 0.5) {
      const spine = out.slice();
      out.length = 0;
      for (let i = 0; i < spine.length; i += 1) {
        const a = spine[Math.max(0, i - 1)];
        const b = spine[Math.min(spine.length - 1, i + 1)];
        const dx = b[0] - a[0];
        const dy = b[1] - a[1];
        const len = Math.hypot(dx, dy) || 1;
        const nx = -dy / len;
        const ny = dx / len;
        for (let t = -half; t <= half; t += step) out.push([spine[i][0] + nx * t, spine[i][1] + ny * t]);
      }
    }
    return out;
  }
  // An area's samples come off its own raster, for the same reason its radius does: one scanline per
  // row instead of one polygon test per cell.
  const raster = rasterOf(mark.rings);
  const every = Math.max(1, Math.round(step / raster.step));
  for (let row = 0; row < raster.h; row += every)
    for (let col = 0; col < raster.w; col += every)
      if (raster.mask[row * raster.w + col])
        out.push([raster.x0 + col * raster.step, raster.y0 + row * raster.step]);
  return out;
}

function bboxOf(rings) {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const ring of rings)
    for (const [x, y] of ring) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  return { minX, maxX, minY, maxY };
}

/** Even-odd across a footprint's own rings, so a fill with a hole is a fill with a hole. */
export function insideRings(rings, x, y) {
  let inside = false;
  for (const ring of rings)
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
      const [xi, yi] = ring[i];
      const [xj, yj] = ring[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
  return inside;
}

/** AN AREA MARK'S OWN RASTER, in its own bounding box, at most 160 cells on its longest side.
 *
 *  Scanline rather than a point test per cell: a Natural Earth country carries several thousand ring
 *  vertices, and asking "is this cell inside?" once per cell is that count times the cell count. One
 *  pass per ROW over the edges answers a whole row, which is what makes a 40-country beat measurable
 *  in a second rather than a quarter of an hour. */
function rasterOf(rings) {
  const box = bboxOf(rings);
  const span = Math.max(box.maxX - box.minX, box.maxY - box.minY) || 1;
  const step = span / 160;
  // One cell of margin on every side. Without it a mark that fills its own bounding box — a square,
  // a rectangle of a quantised field — has no OUTSIDE anywhere in the raster, and the depth field
  // measured 100 where the answer is 50.
  const PAD = 1;
  const w = Math.max(1, Math.ceil((box.maxX - box.minX) / step) + 1) + 2 * PAD;
  const h = Math.max(1, Math.ceil((box.maxY - box.minY) / step) + 1) + 2 * PAD;
  const mask = new Uint8Array(w * h);
  const edges = [];
  for (const ring of rings)
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) edges.push([ring[j], ring[i]]);
  const originX = box.minX - PAD * step;
  const originY = box.minY - PAD * step;
  for (let row = PAD; row < h - PAD; row += 1) {
    const y = originY + row * step;
    const xs = [];
    for (const [[x0, y0], [x1, y1]] of edges) {
      if (y0 > y === y1 > y) continue;
      xs.push(x0 + ((y - y0) / (y1 - y0)) * (x1 - x0));
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const from = Math.max(PAD, Math.ceil((xs[k] - originX) / step));
      const to = Math.min(w - 1 - PAD, Math.floor((xs[k + 1] - originX) / step));
      for (let col = from; col <= to; col += 1) mask[row * w + col] = 1;
    }
  }
  return { mask, w, h, step, x0: originX, y0: originY };
}

/** Chamfer distance to the nearest cell that is NOT the mark, two passes, weights 1 and √2. */
function depthField({ mask, w, h }) {
  const D = new Float32Array(w * h);
  const DIAG = Math.SQRT2;
  const BIG = w + h;
  for (let i = 0; i < D.length; i += 1) D[i] = mask[i] ? BIG : 0;
  for (let y = 0; y < h; y += 1)
    for (let x = 0; x < w; x += 1) {
      const i = y * w + x;
      if (D[i] === 0) continue;
      let best = D[i];
      if (y > 0) best = Math.min(best, D[i - w] + 1);
      if (x > 0) best = Math.min(best, D[i - 1] + 1);
      if (y > 0 && x > 0) best = Math.min(best, D[i - w - 1] + DIAG);
      if (y > 0 && x < w - 1) best = Math.min(best, D[i - w + 1] + DIAG);
      D[i] = best;
    }
  for (let y = h - 1; y >= 0; y -= 1)
    for (let x = w - 1; x >= 0; x -= 1) {
      const i = y * w + x;
      if (D[i] === 0) continue;
      let best = D[i];
      if (y < h - 1) best = Math.min(best, D[i + w] + 1);
      if (x < w - 1) best = Math.min(best, D[i + 1] + 1);
      if (y < h - 1 && x < w - 1) best = Math.min(best, D[i + w + 1] + DIAG);
      if (y < h - 1 && x > 0) best = Math.min(best, D[i + w - 1] + DIAG);
      D[i] = best;
    }
  return D;
}

/** THE LARGEST DISC THAT FITS INSIDE AN AREA MARK — its radius, measured on the mark's own rings.
 *
 *  A hex cartogram's cell has one and it is small; a country fill has one and it is enormous, which
 *  is exactly why a country fill is never seated on the sliver of sea its coastline disagrees with
 *  the basemap's about. This is the mark's own size, and the rule asks the ground to have room for
 *  it. */
export function inradiusOf(rings) {
  const raster = rasterOf(rings);
  const D = depthField(raster);
  let best = 0;
  for (let i = 0; i < D.length; i += 1) if (D[i] > best) best = D[i];
  return best * raster.step;
}

/**
 * HOW MUCH OF A BEAT'S DRAWING HAS TO SIT ON A GROUND BEFORE THE GROUND IS ONE THE BEAT OCCUPIES —
 * and the measurement that fixes it rather than a preference.
 *
 * "Any mark at all" is the rule that needs no number, and it is wrong: measured across the twelve
 * map beats in this tree, EVERY one of them seats at least one mark on water. Malta is a country
 * fill on a sea MapTiler does not draw at z3.7; 213 of 8 900 European power stations are offshore
 * wind; a 100 km isoline runs up an estuary. None of those makes a beat a beat drawn on the sea, and
 * a rule that said so would refuse all twelve exactly as the unfiltered guard did.
 *
 * So the share was measured on all twelve, and it is bimodal with a gap three times wider than any
 * step inside either group:
 *
 *   land-seated   2.4 · 7.3 · 7.3 · 8.9 · 11.2 · 11.9 · 12.1 · 14.0 %
 *   water-seated                                        41.9 · 41.9 · 100 %
 *
 * A quarter sits in the middle of that gap. It is not a tuned number: anything from 15 % to 40 %
 * gives the same twelve answers, which is what makes it a plateau rather than a threshold. The
 * table behind it is in `fix-ground-occupancy.md`, and a thirteenth beat that lands inside the gap
 * is a beat this corpus has not met and should be measured, not guessed.
 */
export const SEATED_SHARE_MIN = 0.25;

/**
 * WHICH GROUNDS THIS BEAT'S MARKS OCCUPY.
 *
 * `field` answers, at a point in the plate's own pixel space, how deep the water and the land run
 * there — `waterDepthAt(x, y)` and `landDepthAt(x, y)`, both 0 where the other ground is. A point off
 * the plate answers `null` and is not counted: a mark drawn past the edge of the basemap is on the
 * page, not on the map.
 *
 * TWO READINGS, ONE PER KIND OF FOOTPRINT, AND EACH IS THE NATURAL ONE FOR IT. This is not a
 * per-beat special case; it is what the two kinds of mark ARE.
 *
 *   - A PLACED mark — a circle, a ribbon, a pin — is put down somewhere and has a surround. It sits
 *     on the ground that has ROOM FOR IT: the ground runs, under some point of its footprint, at
 *     least as deep as the mark's own radius. A circle at sea is seated on water; a coastal circle
 *     whose edge laps the sea is seated on land and touching a coastline.
 *   - An AREA mark — a country fill, a hex, a quantised cell — does not sit on a ground, it CLAIMS
 *     one. It sits on the ground it MOSTLY COVERS. Measured the other way it answers nothing: a
 *     country fill's own inradius is, by construction, the depth of the land beneath it, so "has the
 *     land room for it" turns on which of two rasters rounds first — measured on
 *     `proof/web-choropleth-europe-lowcarbon`, Great Britain's fill came out seated on NEITHER
 *     ground at 33.4 px of inradius against 33-ish px of land, and nine coastal countries with it.
 *
 * Returns the two booleans `plateGrounds` needs and the measurement behind them, so a beat prints
 * what it found rather than asserting it.
 */
export function markOccupancy(marks, field) {
  if (!marks?.length)
    throw new Error(
      "a map beat with no marks cannot say which grounds it occupies — hand this the footprints the " +
        "beat actually draws, in the plate's own pixel space",
    );
  let onWater = 0;
  let onLand = 0;
  let deepestWater = 0;
  let deepestLand = 0;
  let sampled = 0;
  let offPlate = 0;
  /** How close the nearest water comes to any mark, counted in that mark's OWN radii — the honest
   *  unit, because 3 px from a hairline dot and 3 px from a 36 px ribbon are not the same distance.
   *  0 means a mark overlaps water. Reported whatever the verdict, so a beat that just misses and a
   *  beat that is nowhere near are two different readings rather than one `false`. */
  let closestWater = Infinity;
  const waterMarks = [];
  for (const mark of marks) {
    const claims = mark.kind === "area";
    const r = Math.max(radiusOf(mark), 0.5);
    let water = false;
    let land = false;
    let touchesWater = false;
    let touchesLand = false;
    let inWater = 0;
    let inLand = 0;
    let nearest = Infinity;
    for (const [x, y] of samplesOf(mark)) {
      const w = field.waterDepthAt(x, y);
      if (w === null) {
        offPlate += 1;
        continue;
      }
      sampled += 1;
      const l = field.landDepthAt(x, y);
      if (w > deepestWater) deepestWater = w;
      if (l > deepestLand) deepestLand = l;
      // `landDepthAt` is 0 on water and, on land, the distance to the nearest water — which is what
      // "how far is this sample from the sea" means without a second transform.
      if (l < nearest) nearest = l;
      if (w > 0) {
        touchesWater = true;
        inWater += 1;
      }
      if (l > 0) {
        touchesLand = true;
        inLand += 1;
      }
      if (w >= r) water = true;
      if (l >= r) land = true;
    }
    if (claims) {
      water = inWater > inLand;
      land = inLand >= inWater;
    } else if (!water && !land) {
      // A PLACED MARK NO GROUND HAS ROOM FOR IS A MARK THAT STRADDLES, and it sits on both. Measured
      // on `proof/static-locator-zaporizhzhia`, whose one accent mark is a pin on the Dnieper at
      // Zaporijjia: the reservoir under it runs 4.2 px deep and the bank 7.1, against a 13 px pin, so
      // "has room for it" is false twice and the pin would have been seated on nothing at all.
      water = touchesWater;
      land = touchesLand;
    }
    const inRadii = nearest / r;
    if (inRadii < closestWater) closestWater = inRadii;
    if (water) {
      onWater += 1;
      waterMarks.push(mark.name ?? null);
    }
    if (land) onLand += 1;
  }
  if (!sampled)
    throw new Error(
      "every footprint handed to `markOccupancy` fell outside the plate — the marks and the plate " +
        "are not in the same pixel space, and an occupancy measured across two spaces is a guess",
    );
  const waterShare = onWater / marks.length;
  const landShare = onLand / marks.length;
  return {
    water: waterShare >= SEATED_SHARE_MIN,
    land: landShare >= SEATED_SHARE_MIN,
    measured: {
      marks: marks.length,
      onWater,
      onLand,
      waterShare: Number(waterShare.toFixed(3)),
      landShare: Number(landShare.toFixed(3)),
      sampled,
      offPlate,
      deepestWater: Number(deepestWater.toFixed(1)),
      deepestLand: Number(deepestLand.toFixed(1)),
      closestWaterInRadii: Number.isFinite(closestWater) ? Number(closestWater.toFixed(2)) : null,
      waterMarks: waterMarks.filter(Boolean).slice(0, 12),
    },
  };
}

/** One line a beat prints, so the occupancy that decided its grounds is on the console beside the
 *  colour it was measured against. */
export function occupancyLine(occupancy) {
  const m = occupancy.measured;
  const seat = [occupancy.water && "water", occupancy.land && "land"].filter(Boolean).join(" and ") || "neither";
  return (
    `occupancy: seated on ${seat} — ${m.onWater} of ${m.marks} marks have room inside the water ` +
    `(${(m.waterShare * 100).toFixed(1)} %), ${m.onLand} inside the land (${(m.landShare * 100).toFixed(1)} %), ` +
    `against a ${(SEATED_SHARE_MIN * 100).toFixed(0)} % share\n  ` +
    `${m.sampled} samples · water runs ${m.deepestWater}px deep under them, land ${m.deepestLand}px · ` +
    `the nearest water is ${m.closestWaterInRadii} mark-radii from the nearest mark` +
    (m.waterMarks.length ? `\n  on water: ${m.waterMarks.join(", ")}` : "")
  );
}

/**
 * LON/LAT INTO THE PLATE'S OWN FRAME, from the camera the bake recorded.
 *
 * Six of the twelve draw nothing in pixels at all — their marks are MapLibre layers in degrees and
 * MapTiler reprojects them live — so an occupancy measured on their marks has to put those degrees
 * where the plate put them. `frameCorners` is the box the camera SETTLED on after `fitBounds`, read
 * back with `map.unproject()`, which is why it and not the typed window is what the plate's pixels
 * agree with. The arithmetic is Web Mercator, the same four lines five of these beats already carry
 * inline; having it once is what keeps a mark and the ground under it in one space.
 */
export function frameProjector({ frame, frameCorners }) {
  if (!(frame?.width > 0) || !frameCorners)
    throw new Error("a projector needs the plate's own frame and the corners the camera settled on");
  const mercY = (lat) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
  const north = mercY(frameCorners.north);
  const south = mercY(frameCorners.south);
  return ([lon, lat]) => [
    ((lon - frameCorners.west) / (frameCorners.east - frameCorners.west)) * frame.width,
    ((mercY(lat) - north) / (south - north)) * frame.height,
  ];
}
