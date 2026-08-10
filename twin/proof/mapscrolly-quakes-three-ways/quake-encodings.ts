/**
 * This beat's own layer on top of `geo-hex.ts` — the part that is about THIS beat's argument rather
 * than about hexagons.
 *
 * `geo-hex.ts` beside it is a byte-identical copy of `proof/mapgen-hexgrid-web/geo-hex.ts`
 * (md5 `dec30d19e135e46d1356cd269097dc09`), copied rather than imported, the way every beat in this
 * tree carries its own geometry core. Everything here is NEW work: the same 156 cells asked a second
 * question (how STRONG, not how MANY), the energy-rooted symbol radius, and the facts every step's
 * prose is a function of.
 *
 * Nothing here draws. Nothing that draws computes a fact.
 */

import {
  binHex,
  cellMembers,
  chooseHexSize,
  countBreaks,
  dominantRegions,
  pixelToLonLat,
  type HexCell,
  type QuakePoint,
} from "./geo-hex.ts";

/** A projected point as the bake wrote it: pixel on the plate, plus its row index in the CSV. */
export type PlatePoint = { px: number; py: number; i: number };

/** A cell that has been asked both questions. */
export type QuakeCell = HexCell & {
  /** The strongest single event inside the cell. */
  maxMag: number;
  /** Row indices into the frozen CSV. */
  members: number[];
};

export type Frame = { width: number; height: number };
export type Corners = {
  west: number;
  north: number;
  east: number;
  south: number;
};

/**
 * The radius a magnitude is drawn at.
 *
 * **Rooted in ENERGY, not in the magnitude number.** The proportional-symbol rule is that AREA is
 * proportional to the value (`map-beat/references/types/proportional-symbol.md`, "don't
 * linear-scale the radius"), so `r ∝ √value`. The trap here is choosing what "value" means: the
 * magnitude NUMBER is logarithmic, so `√m` over a 6.5–7.5 window varies by 4% and every circle
 * comes out the same size — an encoding that draws a magnitude 7.5 as if it were a 6.5. The value a
 * reader actually means by "bigger earthquake" is the energy released, which goes as `10^(1.5·m)`,
 * so an equal-AREA encoding of it is `r ∝ 10^(0.75·m)`. Over the same window that is a 5.6× range,
 * which is what the reader sees.
 *
 * Normalised on the largest event drawn, so the biggest circle is exactly `maxRadius` whatever the
 * year's strongest event happened to be.
 */
export function energyRadius(mag: number, maxMag: number, maxRadius: number) {
  return maxRadius * Math.pow(10, 0.75 * (mag - maxMag));
}

export type QuakeFacts = {
  /** Rows in the frozen CSV. */
  catalogued: number;
  /** Rows the bake projected onto the plate — the ones every frame draws. */
  onFrame: number;
  /** Rows poleward of the plate's own frame, dropped by the bake. */
  offFrame: number;
  latRange: { south: number; north: number };
  minMag: number;
  maxMag: number;
  hexSize: number;
  cells: QuakeCell[];
  /** Cells, busiest first. */
  byCount: QuakeCell[];
  /** Cells, strongest single event first. */
  byStrength: QuakeCell[];
  /** How many of the busiest cells it takes to hold half of all on-frame events. */
  cellsHoldingHalf: number;
  /** The busiest cell, its regions, and the margin over the runner-up. */
  busiest: { cell: QuakeCell; regions: string; marginOverSecond: number };
  /** The cell holding the year's strongest event, and where it ranks by COUNT. */
  strongest: { cell: QuakeCell; regions: string; rankByCount: number };
  /** The single strongest event in the catalogue. */
  strongestEvent: QuakePoint;
  /** Events at or above the symbol threshold, strongest first. */
  bigEvents: { point: QuakePoint; px: number; py: number }[];
  bigThreshold: number;
  countBreaks: number[];
  magBreaks: number[];
};

const NAMES = (idx: number[], quakes: QuakePoint[]) =>
  dominantRegions(
    idx.map((i) => quakes[i]!.place),
    2,
  )
    .map((r) => r.label)
    .join(" and ");

export function deriveQuakeFacts({
  quakes,
  points,
  frame,
  corners,
  bigThreshold,
}: {
  quakes: QuakePoint[];
  points: PlatePoint[];
  frame: Frame;
  corners: Corners;
  bigThreshold: number;
}): QuakeFacts {
  if (!points.length)
    throw new Error("the bake projected no points onto the plate");
  for (const p of points)
    if (quakes[p.i] === undefined)
      throw new Error(
        `plate/geometry.json carries a point indexed ${p.i}, which quakes-density.csv does not hold — the plate and the catalogue have drifted apart`,
      );

  const { size, cells: bare } = chooseHexSize(points, frame);
  const members = cellMembers(points, size);
  // `binHex` is called again by `chooseHexSize`, so the keys here are the ones it produced; asking
  // the members map for a key it does not hold would mean the two disagreed, which is a bug rather
  // than an empty cell.
  const cells: QuakeCell[] = bare.map((c) => {
    const idx = members.get(c.key);
    if (!idx || idx.length !== c.count)
      throw new Error(
        `cell ${c.key} counted ${c.count} events but ${idx?.length ?? 0} members were listed`,
      );
    return {
      ...c,
      members: idx,
      maxMag: Math.max(...idx.map((i) => quakes[i]!.mag)),
    };
  });

  const byCount = [...cells].sort(
    (a, b) => b.count - a.count || a.key.localeCompare(b.key),
  );
  const byStrength = [...cells].sort(
    (a, b) =>
      b.maxMag - a.maxMag || b.count - a.count || a.key.localeCompare(b.key),
  );

  const onFrame = points.length;
  let running = 0;
  let cellsHoldingHalf = 0;
  for (const c of byCount) {
    running += c.count;
    cellsHoldingHalf++;
    if (running * 2 >= onFrame) break;
  }

  const strongestEvent = quakes.reduce((a, b) => (b.mag > a.mag ? b : a));
  const strengthCell = byStrength[0]!;
  const rankByCount = byCount.findIndex((c) => c.key === strengthCell.key) + 1;

  // The beat's own third and fourth steps say that the map of HOW MANY and the map of HOW STRONG
  // are not the same map. If they ever became the same cell the sentence would be false, so it is
  // asserted rather than assumed.
  if (strengthCell.key === byCount[0]!.key)
    throw new Error(
      "the busiest cell and the cell holding the strongest event are now the same cell; this beat's closing claim says they are not",
    );

  const bigEvents = points
    .filter((p) => quakes[p.i]!.mag >= bigThreshold)
    .map((p) => ({ point: quakes[p.i]!, px: p.px, py: p.py }))
    .sort((a, b) => b.point.mag - a.point.mag);
  if (bigEvents.length < 2)
    throw new Error(
      `only ${bigEvents.length} event(s) reach magnitude ${bigThreshold}; the symbol step needs a field, not a single circle`,
    );

  const mags = cells.map((c) => c.maxMag);
  const sortedMags = [...mags].sort((a, b) => a - b);
  const at = (p: number) =>
    sortedMags[
      Math.min(sortedMags.length - 1, Math.floor(p * sortedMags.length))
    ]!;
  const magBreaks = [...new Set([at(0.5), at(0.75), at(0.9), at(0.97)])].filter(
    (v, i, all) => i === 0 || v > all[i - 1]!,
  );

  return {
    catalogued: quakes.length,
    onFrame,
    offFrame: quakes.length - onFrame,
    latRange: { south: corners.south, north: corners.north },
    minMag: Math.min(...quakes.map((q) => q.mag)),
    maxMag: Math.max(...quakes.map((q) => q.mag)),
    hexSize: size,
    cells,
    byCount,
    byStrength,
    cellsHoldingHalf,
    busiest: {
      cell: byCount[0]!,
      regions: NAMES(byCount[0]!.members, quakes),
      marginOverSecond: byCount[0]!.count - byCount[1]!.count,
    },
    strongest: {
      cell: strengthCell,
      regions: NAMES(strengthCell.members, quakes),
      rankByCount,
    },
    strongestEvent,
    bigEvents,
    bigThreshold,
    countBreaks: countBreaks(cells.map((c) => c.count)),
    magBreaks,
  };
}

/** Which class a value falls in, where a class INCLUDES its own upper break — the same convention
 *  `countBreaks` is written for, reused for the magnitude ramp so both legends read the same way. */
export function classOf(value: number, breaks: number[]): number {
  for (let i = 0; i < breaks.length; i++) if (value <= breaks[i]!) return i;
  return breaks.length;
}

/** Where a cell's own centre is on the globe, for the record kept in the brief. */
export function cellLonLat(cell: HexCell, corners: Corners, frame: Frame) {
  return pixelToLonLat(cell.cx, cell.cy, corners, frame);
}

/** Re-exported so the runner needs one import for the binning it does not do itself. */
export { binHex };

/** Ordinal, for the one place the prose states a rank. */
export function ordinal(n: number): string {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return `${n}th`;
  return `${n}${["th", "st", "nd", "rd"][n % 10] ?? "th"}`;
}
