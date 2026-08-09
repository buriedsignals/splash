/**
 * The pure half of the dot-density beat: population csv parsing, the loud join (same discipline as
 * `twin-map-beat/assets/geo.ts`'s choropleth join — dot-density reuses it, per
 * `references/types/dot-density.md`'s own "one thing that goes wrong"), the dot-value derivation,
 * and the seeded, deterministic scatter itself. No browser, no rasteriser.
 */

export type Pt = [number, number];
export type Ring = Pt[];

// ── Reading the source ─────────────────────────────────────────────────────────────────────────

export type PopulationRow = { code: string; name: string; population: number };

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
 * Bank, the same class of mismatch `twin-map-beat/assets/geo.ts`'s own `CO2_ALIAS` documents for
 * Kosovo against OWID (`OWID_KOS` there, a third spelling again — three sources, three codes).
 */
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
 *  every other beat in this twin uses for a baked polygon's ring list. */
export function pointInRings(point: Pt, rings: Ring[]): boolean {
  const [outer, ...holes] = rings;
  if (!outer || !pointInRing(point, outer)) return false;
  return !holes.some((hole) => pointInRing(point, hole));
}

// ── The seeded, deterministic scatter (dot-density.md: "computed ONCE and seeded deterministically
//    per region... never re-randomised on each render") ──────────────────────────────────────────

/** FNV-1a, so a region's own key deterministically seeds its own scatter without depending on scan
 *  order or any global counter. */
function hashSeed(key: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32 — a small, deterministic PRNG: same seed, same sequence, every run. */
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
 */
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
 */
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

// ── What a reader actually SEES: fill tightness, which is not the same quantity as the title's ──

/** Signed shoelace area of one ring, in whatever units the ring's coordinates are in. */
function ringArea(ring: Ring): number {
  let a = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    a += ring[j]![0] * ring[i]![1] - ring[i]![0] * ring[j]![1];
  }
  return a / 2;
}

/** True drawn area of a MultiPolygon in plate pixels: every part's outer ring, its holes removed. */
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
 */
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
