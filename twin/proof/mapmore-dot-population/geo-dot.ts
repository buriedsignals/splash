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

// ── The study area's own colour, and the two things it has to stay apart from ────────────────────

/** The blue tint `bake.mjs` forces onto the basemap's water layers, because `dataviz-light` paints
 *  water GREY and grey water is indistinguishable from a no-data grey (`geo-discipline.md` rule 7). */
export const WATER_TINT = "#AAC9E0";

/** The basemap's own land under the study fill. `dataviz-light` at this camera paints 40% of the
 *  plate this exact value (the other 59% is sea), so it is what a study fill composites over — and
 *  it is also, unpainted, what every country OUTSIDE the study looks like. */
export const LAND_TINT = "#F7F7F7";

/**
 * How much ink the study area is tinted with, as a fill-opacity over the plate.
 *
 * TWO DEFECTS IN ONE NUMBER, and it is why this is an opacity rather than a flat colour.
 *
 * The beat shipped an OPAQUE `#F0F0F0` over every study country. Against the plate's own
 * unpainted land that is ΔE76 2.44 and a 1.064:1 luminance ratio — so "counted in this map's
 * 596,770,599" and "not in this map at all" (Russia, Belarus, Turkey, north Africa) were the same
 * colour, and a country with too few people to show a dot was indistinguishable from a country
 * that was never in the total. At 0.16 the same two read 13.94 ΔE76 and 1.447:1 apart.
 *
 * And because it is now a TINT rather than a lid, the basemap's water survives underneath it:
 * opaque paint had swallowed nine inland lakes whole — Vänern, Vättern, Mälaren, Saimaa, Päijänne,
 * Balaton, the IJsselmeer, Lough Neagh and Lake Geneva all sampled as study land with zero water
 * pixels, and Lake Peipus was drawn half land (Estonian side) and half water (Russian side) in one
 * frame. A tinted lake stays 20.6 ΔE76 away from the land it sits in and reads as water.
 *
 * WHAT IT COSTS, measured rather than waved at: the dots are `#0072B2` on this fill, and darkening
 * the fill costs dot contrast — 4.55:1 at the old opaque fill, 3.34:1 at 0.16. The floor is WCAG
 * 2.2 SC 1.4.11's 3:1 for a non-text graphical object, which the dots clear; 0.18 would read 15.71
 * ΔE76 apart but push the dots to 3.18:1, and the data has to win that trade.
 */
export const STUDY_AREA_TINT_OPACITY = 0.16;

function srgbChannels(hex: string): [number, number, number] {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
}

/** CIE L*a*b* (D65) from sRGB — the space the render audit measured this defect in. */
export function labOf(colour: string): [number, number, number] {
  const [r, g, b] = srgbChannels(colour).map((v) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  const x = (r * 0.4124564 + g * 0.3575761 + b * 0.1804375) / 0.95047;
  const y = r * 0.2126729 + g * 0.7151522 + b * 0.072175;
  const z = (r * 0.0193339 + g * 0.119192 + b * 0.9503041) / 1.08883;
  const f = (t: number) => (t > 216 / 24389 ? Math.cbrt(t) : (841 / 108) * t + 4 / 29);
  const [fx, fy, fz] = [f(x), f(y), f(z)];
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

/** ΔE76 — deliberately the metric the audit used, so numbers compare without a conversion. */
export function deltaE76(a: string, b: string): number {
  const [l1, a1, b1] = labOf(a);
  const [l2, a2, b2] = labOf(b);
  return Math.hypot(l1 - l2, a1 - a2, b1 - b2);
}

/** What a tint actually looks like once laid over the plate — SVG's `fill-opacity` composites in
 *  sRGB, so this is plain interpolation of the 0..255 channels. */
export function compositeOver(tint: string, backdrop: string, opacity: number): string {
  const t = srgbChannels(tint);
  const b = srgbChannels(backdrop);
  return (
    "#" +
    t
      .map((v, i) => Math.round(v * opacity + b[i]! * (1 - opacity)).toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase()
  );
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = srgbChannels(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2.x contrast ratio. Kept local rather than imported from `render-still.mjs` so this pure
 *  core stays free of the native rasteriser. */
export function wcagContrast(a: string, b: string): number {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * The study area has to be a different KIND of thing from the land around it, and the dots have to
 * stay readable on it. Both are checked at render, on the composited colours, because the tint, its
 * opacity and the basemap's own land only meet on the plate.
 *
 * `MIN_STUDY_SEPARATION` is not a taste threshold: 10 ΔE76 is roughly four times the ~2.3 ΔE76 that
 * is a just-noticeable difference between two adjacent patches, which is the least that can honestly
 * be called "a different kind of thing at a glance" for two large flat areas that meet along a
 * border. The shipped 2.44 was inside a JND of it.
 */
export const MIN_STUDY_SEPARATION = 10;
export const MIN_DOT_CONTRAST = 3; // WCAG 2.2 SC 1.4.11, non-text graphical object

export function assertStudyAreaReadsApart(
  tint: string,
  opacity: number = STUDY_AREA_TINT_OPACITY,
  dotColour: string = "#0072B2",
  outline?: string,
): {
  studyLand: string;
  studyWater: string;
  separation: number;
  dotContrast: number;
  coastSeparation: number;
} {
  const studyLand = compositeOver(tint, LAND_TINT, opacity);
  const studyWater = compositeOver(tint, WATER_TINT, opacity);
  const separation = deltaE76(studyLand, LAND_TINT);
  const dotContrast = wcagContrast(dotColour, studyLand);
  const coastSeparation = deltaE76(studyLand, WATER_TINT);
  if (separation < MIN_STUDY_SEPARATION)
    throw new Error(
      `the study area does not read as the study area: tinting ${tint} at ${opacity} over the basemap's land ${LAND_TINT} gives ${studyLand}, only ${separation.toFixed(2)} ΔE76 from the land OUTSIDE the study — a reader cannot tell a country counted in this map's total from one that was never in it.`,
    );
  if (dotContrast < MIN_DOT_CONTRAST)
    throw new Error(
      `the dots stop reading on their own study area: ${dotColour} on ${studyLand} measures ${dotContrast.toFixed(2)}:1, under the ${MIN_DOT_CONTRAST}:1 floor for a non-text graphical object (WCAG 2.2 SC 1.4.11). Lighten the tint.`,
    );
  if (deltaE76(studyWater, WATER_TINT) > separation)
    throw new Error(
      `the tint moves the water further than it moves the land (${deltaE76(studyWater, WATER_TINT).toFixed(2)} vs ${separation.toFixed(2)} ΔE76): an inland lake inside a study country would read as a third category rather than as water.`,
    );
  // The other half of the same rule, and the reason this beat is allowed a tint the flow-map beat
  // would reject. Darkening the study area moves it TOWARD the water: the coastline separation
  // falls from the bare plate's own 23.77 ΔE76 to 16.18. That is legal only because this beat draws
  // its coast as a LINE rather than leaving it to tone — so the line has to measure, on both sides.
  if (outline !== undefined) {
    const onLand = wcagContrast(outline, studyLand);
    const onWater = wcagContrast(outline, WATER_TINT);
    if (coastSeparation < deltaE76(LAND_TINT, WATER_TINT) && Math.min(onLand, onWater) < MIN_DOT_CONTRAST)
      throw new Error(
        `the coastline is carried by neither tone nor line: the study fill ${studyLand} sits ${coastSeparation.toFixed(2)} ΔE76 from the water, nearer than the bare land's own ${deltaE76(LAND_TINT, WATER_TINT).toFixed(2)}, and the outline ${outline} measures ${onLand.toFixed(2)}:1 against the fill and ${onWater.toFixed(2)}:1 against the water — under the ${MIN_DOT_CONTRAST}:1 floor.`,
      );
  }
  return { studyLand, studyWater, separation, dotContrast, coastSeparation };
}
