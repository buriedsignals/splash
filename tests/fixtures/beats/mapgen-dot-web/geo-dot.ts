/**
 * The pure half of the dot-density WEB beat: population csv parsing, the loud join, the dot-value
 * derivation, the seeded deterministic scatter, and — new in this format — the per-country anchor a
 * hit target sits on and the frame test that keeps every drawn dot inside the picture. No browser,
 * no rasteriser, no DOM.
 *
 * This is this beat's OWN copy; `proof/mapmore-dot-population` (the static sibling on the same data)
 * carries its own, and a beat never reaches into a sibling beat at runtime. What is added here, and
 * exists nowhere else, is `partsInFrame`, `cloudAnchor` and `en` — the web format needs a place to
 * put a pointer target and an honest guarantee that no dot is scattered where the clip will eat it.
 */

export type Pt = [number, number];
export type Ring = Pt[];

// ── Reading the source ─────────────────────────────────────────────────────────────────────────

export type PopulationRow = { code: string; name: string; population: number };

/** @parity */
export function parsePopulationCsv(csv: string): PopulationRow[] {
  const [header, ...rows] = csv.trim().split(/\r?\n/);
  const columns = (header ?? "").split(",");
  const codeAt = columns.indexOf("Code");
  const nameAt = columns.indexOf("Country");
  const popAt = columns.indexOf("Population");
  if (codeAt < 0 || nameAt < 0 || popAt < 0)
    throw new Error(
      `population csv missing Code/Country/Population column, got: ${header}`,
    );
  return rows
    .filter((r) => r.length > 0)
    .map((r) => {
      const cells = r.split(",");
      const population = Number(cells[popAt]);
      if (!Number.isFinite(population))
        throw new Error(`bad population value in row: ${r}`);
      return { code: cells[codeAt]!, name: cells[nameAt]!, population };
    });
}

// ── The join, failing loud both ways (reused discipline, `dot-density.md`'s own "the second, type
//    -specific way this goes wrong") ──────────────────────────────────────────────────────────────

/**
 * `alias`: shape key → data key, where Natural Earth's shape code and the data source's own code
 * disagree — this beat's own single entry is Kosovo, `KOS` in Natural Earth, `XKX` at the World
 * Bank, the same class of mismatch `map-beat/assets/geo.ts`'s own `CO2_ALIAS` documents for
 * Kosovo against OWID (`OWID_KOS` there, a third spelling again — three sources, three codes).
 
 *  @parity */
export function joinPopulation(
  shapeKeys: readonly string[],
  rows: PopulationRow[],
  alias: Record<string, string> = {},
): Map<string, PopulationRow> {
  const byCode = new Map(rows.map((r) => [r.code, r]));
  const unmatchedShapes = shapeKeys.filter((k) => !byCode.has(alias[k] ?? k));
  if (unmatchedShapes.length > 0)
    throw new Error(
      `${unmatchedShapes.length} shapes found no population row: ${unmatchedShapes.join(", ")} — ` +
        `a bad join renders these regions with zero dots, which reads as "nobody lives here" rather than "the join is wrong."`,
    );
  const usedDataKeys = new Set(shapeKeys.map((k) => alias[k] ?? k));
  const unusedRows = rows.filter((r) => !usedDataKeys.has(r.code));
  if (unusedRows.length > 0)
    throw new Error(
      `${unusedRows.length} population rows found no shape: ${unusedRows.map((r) => r.code).join(", ")} — the study set and the shape set have drifted apart.`,
    );
  const out = new Map<string, PopulationRow>();
  for (const key of shapeKeys) out.set(key, byCode.get(alias[key] ?? key)!);
  return out;
}

// ── The dot value: derived from the total, not guessed (dot-density.md: "the dot value has to be
//    derived from the total so the rendered dot count lands somewhere legible") ───────────────────

/** @parity */
export function chooseDotValue(
  totalPopulation: number,
  {
    targetDots = 3000,
    maxDots = 6000,
  }: { targetDots?: number; maxDots?: number } = {},
): number {
  let value = Math.round(totalPopulation / targetDots / 1000) * 1000;
  if (value < 1000) value = 1000;
  while (totalPopulation / value > maxDots) value *= 1.5;
  return Math.round(value);
}

// ── Point in polygon (pixel space or lon/lat — dimension-agnostic ray casting) ────────────────────

/** @parity */
export function pointInRing(point: Pt, ring: Ring): boolean {
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]!;
    const [xj, yj] = ring[j]!;
    const crosses = yi > y !== yj > y;
    if (crosses && x < ((xj - xi) * (y - yi)) / (yj - yi + 1e-15) + xi)
      inside = !inside;
  }
  return inside;
}

/** `rings[0]` is the outer boundary, `rings[1..]` are holes to cut back out — the same convention
 *  every other beat in this twin uses for a baked polygon's ring list.
 *  @parity */
export function pointInRings(point: Pt, rings: Ring[]): boolean {
  const [outer, ...holes] = rings;
  if (!outer || !pointInRing(point, outer)) return false;
  return !holes.some((hole) => pointInRing(point, hole));
}

// ── The seeded, deterministic scatter (dot-density.md: "computed ONCE and seeded deterministically
//    per region... never re-randomised on each render") ──────────────────────────────────────────

/** FNV-1a, so a region's own key deterministically seeds its own scatter without depending on scan
 *  order or any global counter.
 *  @parity */
function hashSeed(key: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32 — a small, deterministic PRNG: same seed, same sequence, every run.
 *  @parity */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Rejection-sample `count` points inside ONE polygon part (`rings[0]` its outer boundary,
 * `rings[1..]` its own holes), seeded by `seedKey` — the SAME region always gets the SAME scatter.
 * `maxAttemptsPerDot` bounds a pathological shape (a sliver whose bbox is mostly empty) from
 * spinning forever; a part that cannot place all its dots within budget places fewer, rather than
 * hanging.
 
 *  @parity */
export function scatterInRings(
  rings: Ring[],
  count: number,
  seedKey: string,
  maxAttemptsPerDot = 400,
): Pt[] {
  const outer = rings[0];
  if (!outer || outer.length < 3 || count <= 0) return [];
  const xs = outer.map((p) => p[0]);
  const ys = outer.map((p) => p[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const rand = mulberry32(hashSeed(seedKey));
  const points: Pt[] = [];
  let attempts = 0;
  const attemptBudget = count * maxAttemptsPerDot;
  while (points.length < count && attempts < attemptBudget) {
    attempts++;
    const p: Pt = [
      minX + rand() * (maxX - minX),
      minY + rand() * (maxY - minY),
    ];
    if (pointInRings(p, rings)) points.push(p);
  }
  return points;
}

/** @parity */
function bboxArea(rings: Ring[]): number {
  const outer = rings[0];
  if (!outer || outer.length < 3) return 0;
  const xs = outer.map((p) => p[0]);
  const ys = outer.map((p) => p[1]);
  return (
    (Math.max(...xs) - Math.min(...xs)) * (Math.max(...ys) - Math.min(...ys))
  );
}

/**
 * The fix for this beat's own caught defect: a MultiPolygon shape (France's mainland + Corsica,
 * an overseas department, any island territory) is several DISJOINT parts, each its own
 * `[outer, ...holes]` — never one flattened ring list. Flattening first (this beat's first
 * version) reads a second landmass's own outer ring as a HOLE to cut out of whichever ring
 * happens to sort first in the source data, and restricts the whole country's dot budget to that
 * first ring's own bbox — for France, Natural Earth's own part order put Corsica first, so every
 * one of France's ~340 dots landed crammed onto Corsica's own tiny bbox.
 *
 * Dots are allocated across parts proportional to each part's own bbox area (a coarse but
 * deterministic and cheap stand-in for true polygon area — good enough for a dot COUNT split, not
 * a precision measurement), by largest remainder so the parts' counts sum to exactly `count`.
 
 *  @parity */
export function scatterInParts(
  parts: Ring[][],
  count: number,
  seedKey: string,
): Pt[] {
  const real = parts.filter((p) => bboxArea(p) > 0);
  if (real.length === 0 || count <= 0) return [];
  const areas = real.map(bboxArea);
  const totalArea = areas.reduce((a, b) => a + b, 0);
  const raw = areas.map((a) => (a / totalArea) * count);
  const base = raw.map(Math.floor);
  let remaining = count - base.reduce((a, b) => a + b, 0);
  const order = raw
    .map((v, i) => ({ i, frac: v - base[i]! }))
    .sort((a, b) => b.frac - a.frac);
  for (const { i } of order) {
    if (remaining <= 0) break;
    base[i]!++;
    remaining--;
  }
  return real.flatMap((rings, i) =>
    scatterInRings(rings, base[i]!, `${seedKey}#${i}`),
  );
}

// ── The web format's own additions ───────────────────────────────────────────────────────────────

/**
 * Drop the parts of a shape that lie entirely outside the frame, BEFORE the scatter allocates dots
 * across them.
 *
 * `scatterInParts` splits a country's dots between its parts in proportion to each part's own bbox
 * area, and the bake keeps any ring whose bbox comes within a 40px margin of the frame. On this study
 * set that leaves Madeira and three Azorean rings attached to Portugal, sitting past the frame edge:
 * they would take their share of Portugal's dots with them and the SVG clip would eat those dots —
 * fewer dots drawn for a country than its population buys, on a map whose argument is which clouds
 * are biggest, with nothing red anywhere.
 *
 * MEASURED, so this is not oversold: on today's numbers the effect is **zero dots**. Those four bboxes
 * are small enough that largest-remainder allocation gives them none of Portugal's 52 dots either way.
 * This is a guard against a future camera, a bigger study set or a smaller dot value, not a fix for a
 * defect currently on screen — the defect currently on screen was the CAMERA, and that is fixed in
 * `bake.mjs`. `render-web.mjs` asserts the invariant (no dot outside the frame) rather than trusting
 * this function to hold it.
 *
 * Dropping the part is the honest correction rather than clipping the dots afterwards: the country's
 * population figure covers those territories, so its dots belong somewhere the map actually shows,
 * and the beat's caveat says exactly that. `render-web.mjs` prints what it dropped and then asserts
 * that no dot lands outside the frame.
 */
export function partsInFrame(
  parts: Ring[][],
  frame: { width: number; height: number },
): Ring[][] {
  return parts.filter((part) => {
    const outer = part[0];
    if (!outer || outer.length < 3) return false;
    const xs = outer.map((p) => p[0]);
    const ys = outer.map((p) => p[1]);
    return (
      Math.max(...xs) >= 0 &&
      Math.min(...xs) <= frame.width &&
      Math.max(...ys) >= 0 &&
      Math.min(...ys) <= frame.height
    );
  });
}

/**
 * A plate pixel back to the real lon/lat it stands for, using the plate's own TRUE frame corners
 * (`bake.mjs`'s `frameCorners`, measured with `map.unproject()` after the camera settled — NOT the
 * nominal `bounds` passed to `fitBounds`, which `fitBounds` widens on whichever axis does not bind).
 * Longitude is linear in pixel-x under Web Mercator; latitude needs the inverse Mercator formula,
 * because pixel-y is linear in Mercator-y and not in latitude itself.
 *
 * THE WEB FORMAT NEEDS THIS AND THE OTHER TWO FORMATS DO NOT. This beat's dots are rejection-sampled
 * in the plate's own PIXEL space (`scatterInParts`), which is the only space the country outlines
 * exist in after the bake; a live MapTiler map wants them in lon/lat. Nothing is re-scattered here —
 * the dots are the same dots, read back through the same projection that made them, so the live
 * field and the fallback field are one scatter seen twice rather than two scatters that can drift.
 *
 * Under `geo-parity.test.ts`'s walk, in all three copies at once — `proof/mapgen-hexgrid-web/geo-hex.ts`
 * and `proof/mapscrolly-quakes-three-ways/geo-hex.ts` carry the same tag on the same byte-identical
 * body. It had to be all three in one edit: that walk's second assertion reddens every file
 * declaring a name tagged ANYWHERE without carrying the tag itself, so tagging one copy alone turned
 * the suite green→two failures naming exactly the other two. Measured, both ways.
 *
 * @parity
 */
export function pixelToLonLat(
  px: number,
  py: number,
  frameCorners: { west: number; north: number; east: number; south: number },
  frame: { width: number; height: number },
): { lon: number; lat: number } {
  const { west, north, east, south } = frameCorners;
  const lon = west + (px / frame.width) * (east - west);
  const mercatorY = (lat: number) =>
    Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
  const yNorth = mercatorY(north);
  const ySouth = mercatorY(south);
  const y = yNorth + (py / frame.height) * (ySouth - yNorth);
  const lat = ((2 * Math.atan(Math.exp(y)) - Math.PI / 2) * 180) / Math.PI;
  return { lon, lat };
}

/**
 * The frame height a Web-Mercator camera showing exactly these corners MUST have, at the width it
 * was baked at. This is the invariant `pixelToLonLat` above rests on, written so it can go red.
 *
 * Under Web Mercator, one pixel is worth `(east − west) / width` degrees of longitude everywhere in
 * the frame, so the world is `360 / that` pixels around; the frame's own height is then the Mercator
 * span of its two latitudes as a fraction of the whole world's `2π`. If the recorded corners, the
 * recorded frame and Web Mercator do not agree, `pixelToLonLat` is putting the dots somewhere else
 * than where the plate drew them — which is invisible in the picture until a reader hovers a country
 * and is told about its neighbour.
 *
 * Measured on this beat's own frozen plate: the identity holds to 1.1e-11 px. There is no tolerance
 * to tune here, only floating point.
 */
export function mercatorFrameHeightPx(
  frameCorners: { west: number; north: number; east: number; south: number },
  frameWidth: number,
): number {
  const mercatorY = (lat: number) =>
    Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
  const worldWidthPx =
    360 / ((frameCorners.east - frameCorners.west) / frameWidth);
  return (
    ((mercatorY(frameCorners.north) - mercatorY(frameCorners.south)) /
      (2 * Math.PI)) *
    worldWidthPx
  );
}

/**
 * Where a country's own pointer target and label sit: the DOT nearest the centre of that country's
 * largest landmass.
 */
export function cloudAnchor(points: Pt[], parts: Ring[][]): Pt {
  if (points.length === 0)
    throw new Error(
      "a cloud with no dots has no anchor — a country whose population buys fewer than one dot needs `shapeAnchor` instead",
    );
  // The target is the centre of the country's LARGEST landmass, not the mean of all its dots. The
  // mean of a country in several pieces sits between them: the United Kingdom's lands in the Irish
  // Sea, Norway's inside Sweden, and a label or a hit target placed there answers for the wrong
  // country. Snapping to the nearest real DOT then guarantees the anchor sits on ink this country
  // actually drew, which a ring centroid alone does not (a crescent's centroid is outside it).
  const [tx, ty] = shapeAnchor(parts);
  let best = points[0]!;
  let bestD = Infinity;
  for (const p of points) {
    const d = (p[0] - tx) ** 2 + (p[1] - ty) ** 2;
    if (d < bestD) {
      bestD = d;
      best = p;
    }
  }
  return best;
}

/**
 * Where a country with NO dots puts its pointer target: the centre of its largest part's own outer
 * ring.
 *
 * This case is not a corner: with one dot standing for ~199,000 people, every country smaller than
 * that draws nothing at all. Liechtenstein, the Faroe Islands and Andorra are each under 100,000 and
 * get zero dots on this map — the still sibling ships the same silence. A dot map cannot show them,
 * but the web format can still answer for them: they keep a hit target, an `aria-label`, a table row,
 * and a sentence in the caveat saying they draw nothing, because on a map an absence reads as a zero.
 */
export function shapeAnchor(parts: Ring[][]): Pt {
  let best: Ring | null = null;
  let bestArea = -1;
  for (const part of parts) {
    const area = bboxArea(part);
    if (area > bestArea) {
      bestArea = area;
      best = part[0] ?? null;
    }
  }
  if (!best || best.length === 0)
    throw new Error("a shape with no rings inside the frame has no anchor");
  const mx = best.reduce((s, p) => s + p[0], 0) / best.length;
  const my = best.reduce((s, p) => s + p[1], 0) / best.length;
  return [mx, my];
}

/**
 * Every country, most populous first — the order the accessible table reads in and the order the
 * keyboard's Home/End follows, so "the first row" means the same thing whichever channel a reader
 * picks. It is also the order the claim is made in: the five the title names are the first five.
 
 *  @parity-exempt: each beat reads its own data in its own order — value on a choropleth, population on a dot map, ascending priority on a locator. Four sorts, four beats, not four drifts. */
export function readingOrder<T extends { population: number }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => b.population - a.population);
}

/** The beat's own language is English (`lang="en"` on the page this feeds), so its numbers are
 *  English — the same `en` on `en-GB` `proof/web-co2-ranking/bar-geometry.ts` settled on.
 *  @parity */
export function en(value: number, decimals = 1): string {
  return new Intl.NumberFormat("en-GB", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

// ── What a reader actually SEES: fill tightness, which is not the same quantity as the title's ──

/** Signed shoelace area of one ring, in whatever units the ring's coordinates are in.
 *  @parity */
function ringArea(ring: Ring): number {
  let a = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    a += ring[j]![0] * ring[i]![1] - ring[i]![0] * ring[j]![1];
  }
  return a / 2;
}

/** True drawn area of a MultiPolygon in plate pixels: every part's outer ring, its holes removed.
 *  @parity */
export function drawnAreaPx(parts: Ring[][]): number {
  let area = 0;
  for (const part of parts) {
    const [outer, ...holes] = part;
    if (!outer || outer.length < 3) continue;
    area += Math.abs(ringArea(outer));
    for (const hole of holes) area -= Math.abs(ringArea(hole));
  }
  return Math.max(0, area);
}

/**
 * How TIGHTLY each region's dots are packed on the plate — dots per 1,000 drawn pixels — ranked
 * densest first.
 *
 * This exists because the alt text used to call the five countries the title names "the densest,
 * most continuous clusters". They are the five LARGEST clouds, which is the title's claim; they are
 * not the tightest fills, which is a different measurement entirely. Dots are scattered uniformly
 * inside each country, so fill tightness reads as people per unit area — and on this plate the
 * tightest fills belong to Malta, the Netherlands and Belgium, none of which the sentence named,
 * while France and Spain sit outside the top ten. A sighted reader sees the big clouds; a screen
 * reader was being told about a ranking the picture does not carry.
 *
 * Measured in PLATE PIXELS rather than km², because pixels are what a reader's eye compares.
 * Mercator inflates area with latitude, so this ranking is not identical to a people-per-km² one —
 * it is the ranking of the thing actually drawn.
 
 *  @parity */
export function fillTightness<T extends { key: string; parts: Ring[][] }>(
  shapes: T[],
  dotsByKey: Map<string, number>,
): { key: string; dots: number; areaPx: number; dotsPerKilopixel: number }[] {
  return shapes
    .map((shape) => {
      const areaPx = drawnAreaPx(shape.parts);
      const dots = dotsByKey.get(shape.key) ?? 0;
      return {
        key: shape.key,
        dots,
        areaPx,
        dotsPerKilopixel: areaPx > 0 ? dots / (areaPx / 1000) : 0,
      };
    })
    .sort((a, b) => b.dotsPerKilopixel - a.dotsPerKilopixel);
}
