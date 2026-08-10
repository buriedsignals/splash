/**
 * The pure half of the hex-grid beat: csv parsing, axial hex binning (pointy-top, cube-rounded —
 * Red Blob Games' standard formulas), cell-size selection, and quantile class breaks. No browser,
 * no rasteriser. See `map-beat/references/types/hex-grid.md`.
 *
 * Binning is done PER POINT via `pixelToAxial` + cube rounding, not by pre-building a fixed
 * tessellation and testing point-in-cell membership — every real coordinate maps to exactly one
 * hex under axial rounding, so there is no bbox-edge gap for a boundary point to fall into and be
 * silently dropped (`references/types/hex-grid.md`'s "skip that padding and points... land in the
 * gap"). The padding this file DOES keep is around the drawn frame, not the binning itself.
 */

export type QuakePoint = {
  lon: number;
  lat: number;
  mag: number;
  /** The catalogue's own place string, kept so a cell's region can be derived rather than typed. */
  place: string;
};

/** @parity */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") {
        row.push(field);
        field = "";
      } else if (c === "\n") {
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
      } else if (c === "\r") {
        // skip
      } else field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/**
 * The rows this beat keeps, with their `time` carried alongside.
 *
 * `quakePointsFromCsv` below is unchanged in behaviour and still the only thing the bake calls;
 * it now delegates here so that `quakeTimesFromCsv` cannot drift out of step with it. That
 * alignment is load-bearing rather than cosmetic: the bake writes each surviving point's own index
 * `i` into the plate, and this beat reads the event's DATE back out of the frozen CSV at that same
 * index. One filter, used twice, is the only way that index means the same row in both places —
 * two filters written separately would agree today and diverge the first time either is touched,
 * and the failure would be silent (a cell's events dated by other events).
 */
function keptRows(
  csv: string,
): { lon: number; lat: number; mag: number; place: string; time: string }[] {
  const rows = parseCsv(csv.trim() + "\n");
  const header = rows[0]!;
  const at = (name: string) => {
    const i = header.indexOf(name);
    if (i < 0)
      throw new Error(`csv has no "${name}" column, got: ${header.join(",")}`);
    return i;
  };
  const lonAt = at("longitude");
  const latAt = at("latitude");
  const magAt = at("mag");
  const placeAt = at("place");
  const timeAt = at("time");
  return rows
    .slice(1)
    .filter((r) => r.length === header.length)
    .map((r) => ({
      lon: Number(r[lonAt]),
      lat: Number(r[latAt]),
      mag: Number(r[magAt]),
      place: r[placeAt]!,
      time: r[timeAt]!,
    }))
    .filter(
      (p) =>
        Number.isFinite(p.lon) &&
        Number.isFinite(p.lat) &&
        Number.isFinite(p.mag),
    );
}

/** @parity-exempt: delegates to `keptRows` in the beat that also needs the kept rows for its own claim check; the other two read the CSV once. */
export function quakePointsFromCsv(csv: string): QuakePoint[] {
  return keptRows(csv).map(({ lon, lat, mag, place }) => ({
    lon,
    lat,
    mag,
    place,
  }));
}

export type Axial = { q: number; r: number };

/** Pointy-top axial coordinate of the pixel (x, y), before rounding — Red Blob Games' formula. 
 *  @parity */
function pixelToAxialFractional(
  x: number,
  y: number,
  size: number,
): { q: number; r: number } {
  return {
    q: ((Math.sqrt(3) / 3) * x - (1 / 3) * y) / size,
    r: ((2 / 3) * y) / size,
  };
}

/** Cube-coordinate rounding: rounds q, r, s independently, then fixes whichever drifted most. 
 *  @parity */
function axialRound(qf: number, rf: number): Axial {
  const sf = -qf - rf;
  let q = Math.round(qf);
  let r = Math.round(rf);
  let s = Math.round(sf);
  const qDiff = Math.abs(q - qf);
  const rDiff = Math.abs(r - rf);
  const sDiff = Math.abs(s - sf);
  if (qDiff > rDiff && qDiff > sDiff) q = -r - s;
  else if (rDiff > sDiff) r = -q - s;
  return { q, r };
}

/** @parity */
export function pixelToAxial(x: number, y: number, size: number): Axial {
  const { q, r } = pixelToAxialFractional(x, y, size);
  return axialRound(q, r);
}

/** The centre pixel of an axial cell, pointy-top orientation. 
 *  @parity */
export function axialToPixel(a: Axial, size: number): [number, number] {
  const x = size * (Math.sqrt(3) * a.q + (Math.sqrt(3) / 2) * a.r);
  const y = size * ((3 / 2) * a.r);
  return [x, y];
}

/** The six corners of a pointy-top hexagon centred at (cx, cy). 
 *  @parity */
export function hexCorners(
  cx: number,
  cy: number,
  size: number,
): [number, number][] {
  return Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 180) * (60 * i - 30);
    return [cx + size * Math.cos(angle), cy + size * Math.sin(angle)] as [
      number,
      number,
    ];
  });
}

export type HexCell = {
  key: string;
  q: number;
  r: number;
  cx: number;
  cy: number;
  count: number;
};

/**
 * Bin projected points into hex cells at the given size, keyed by axial coordinate. Points outside
 * the frame (already culled by the caller) never reach here.
 
 *  @parity */
export function binHex(
  points: { px: number; py: number }[],
  size: number,
): HexCell[] {
  const cells = new Map<string, HexCell>();
  for (const p of points) {
    const a = pixelToAxial(p.px, p.py, size);
    const key = `${a.q},${a.r}`;
    const existing = cells.get(key);
    if (existing) existing.count++;
    else {
      const [cx, cy] = axialToPixel(a, size);
      cells.set(key, { key, q: a.q, r: a.r, cx, cy, count: 1 });
    }
  }
  return [...cells.values()];
}

/**
 * Grow the cell size until the cell count clears under `maxCells` — `references/types/hex-grid.md`:
 * "growing the cell size until the grid fits under a hard cap rather than rendering an unbounded
 * number of tiny cells on a dense dataset". Starts from a size that targets `targetCells` over the
 * frame's own area, then doubles until the cap is met — checked against the ACTUAL binned count,
 * never assumed from the formula alone, because the formula's estimate and the real bin count can
 * differ once points cluster unevenly (exactly this dataset: quakes cluster on plate boundaries,
 * not uniformly across the frame).
 
 *  @parity */
export function chooseHexSize(
  points: { px: number; py: number }[],
  frame: { width: number; height: number },
  {
    targetCells = 220,
    maxCells = 400,
  }: { targetCells?: number; maxCells?: number } = {},
): { size: number; cells: HexCell[] } {
  const hexArea = (frame.width * frame.height) / targetCells;
  let size = Math.sqrt((2 * hexArea) / (3 * Math.sqrt(3)));
  for (let attempt = 0; attempt < 24; attempt++) {
    const cells = binHex(points, size);
    if (cells.length <= maxCells) return { size, cells };
    size *= 1.15;
  }
  return { size, cells: binHex(points, size) };
}

/** Which class a COUNT falls in, where a class INCLUDES its own upper break: class i is
 *  `breaks[i-1]+1 … breaks[i]`. That is what this beat's own legend prints
 *  (`classRangeLabel`), and the two must not drift apart. The choropleth family bins the other
 *  way and says so in its own name. @parity */
export function countBreaks(counts: number[]): number[] {
  const sorted = [...counts].sort((a, b) => a - b);
  const at = (p: number) =>
    sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))]!;
  const raw = [at(0.5), at(0.75), at(0.9), at(0.97)];
  // De-duplicate (a sparse dataset can tie at low percentiles) and keep strictly increasing.
  const breaks: number[] = [];
  for (const v of raw) {
    const candidate = Math.max(v, (breaks[breaks.length - 1] ?? 0) + 1);
    breaks.push(candidate);
  }
  return breaks;
}

export function binIndexUpperInclusive(value: number, breaks: number[]): number {
  let index = 0;
  while (index < breaks.length && value > breaks[index]!) index++;
  return index;
}

const HEX = /^#[0-9a-fA-F]{6}$/;

/** @parity */
function channels(hex: string): number[] {
  if (!HEX.test(hex))
    throw new Error(`expected #rrggbb, got ${JSON.stringify(hex)}`);
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
}

/** @parity */
function mixHex(from: string, to: string, ratio: number): string {
  const target = channels(to);
  return (
    "#" +
    channels(from)
      .map((v, i) =>
        Math.round(v + (target[i]! - v) * ratio)
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}

/** A sequential ramp of `steps` colours from the newsroom's own ground toward its ink — the one
 *  legitimate gradient on a map (geo-discipline rule 8), derived rather than picked so it works on
 *  any ground.
 *
 *  `from` and `to` are the ramp's own ends as a fraction of ground→ink, and they are ARGUMENTS
 *  rather than constants because two beat families measurably need different ends and this function
 *  used to carry one family's numbers under a docstring claiming they were the other's. Measured
 *  against white ground and #1A1A1A ink: at 0.10 the low end sits 5.24 ΔE76 from bare land and
 *  16.85 from the #b9b9b9 no-data grey; at 0.14 it sits 8.41 from land and 13.68 from no-data. A
 *  choropleth has a no-data colour to stay clear of; a hex field has none but must keep its
 *  lowest-count cell readable as a cell. Each beat states its own ends beside its own ground. @parity */
export function sequentialRamp(
  ground: string,
  ink: string,
  steps: number,
  from: number,
  to: number,
): string[] {
  return Array.from({ length: steps }, (_, i) =>
    mixHex(ground, ink, from + ((to - from) * i) / (steps - 1)),
  );
}

/** WCAG 2.x relative luminance — exported so a test can assert a ramp actually darkens, and so
 *  `dataRampEnd` and `assertRampReads` below can measure without importing anything. @parity */
export function luminanceOf(hex: string): number {
  const [r, g, b] = channels(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

/** WCAG contrast ratio, 1..21 — the same arithmetic `render-still.mjs` measures furniture with,
 *  duplicated here because a geometry core imports nothing. @parity */
export function contrastOf(a: string, b: string): number {
  const [hi, lo] = [luminanceOf(a), luminanceOf(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

/** THE FAR END OF A RAMP THAT CARRIES THE NEWSROOM'S OWN COLOUR INTO THE DATA.
 *
 *  A choropleth's shading IS the data — it is the only thing on the plate the reader reads a
 *  quantity from. Running it ground→ink meant the one mark a reader actually looks at was the one
 *  place the house accent never reached. This walks the ACCENT 40% of the way to the pole the
 *  ground is not, so the ramp keeps the newsroom's hue all the way up and still ends somewhere
 *  clearly darker (on a light ground) or clearly lighter (on a dark one) than where it started.
 *
 *  The pole is chosen the way `deriveFurniture` chooses `ink` — by which one MEASURES higher
 *  against this ground, not by the obvious luminance-over-0.5 rule, which picks wrong on the
 *  mid-grey band. The two are the same test: black wins exactly when the ground's relative
 *  luminance is at or above 0.179.
 *
 *  It does not check anything. `assertRampReads` does, on the finished ramp, because a ramp is
 *  only legible as a whole. @parity */
export function dataRampEnd(accent: string, ground: string): string {
  return mixHex(
    accent,
    luminanceOf(ground) >= 0.179 ? "#000000" : "#FFFFFF",
    0.4,
  );
}

/** CAN THIS RAMP BE READ AS A QUANTITY? Three things, measured on the finished classes.
 *
 *  1. It never folds back. A ramp derived between two arbitrary colours can rise and then fall —
 *     two classes at the same lightness read as the same class, and the reader's ordering is gone.
 *  2. No two neighbours sit closer than 0.02 relative luminance, which is the separation
 *     `geo.test.ts` has held this family to since it was written.
 *  3. The TOP class — the one the argument is made with — clears 3:1 against the ground, the floor
 *     WCAG 2.2 SC 1.4.11 sets for a graphical object. The low classes deliberately do NOT carry
 *     that floor: they are read against their neighbours and the legend, and holding a choropleth's
 *     lightest class to 3:1 would mean starting the ramp in the middle of its own range.
 *
 *  The case this catches in practice is a DARK ground: a ramp toward a house accent that is itself
 *  dark has nowhere to go, and the low end disappears into the plate. `parsePalette` refuses an
 *  accent under 3:1 against its ground before this is ever reached; this is the second half of the
 *  same guarantee, for the colours DERIVED from it. @parity */
export function assertRampReads(
  ramp: string[],
  ground: string,
  where = "the ramp",
): string[] {
  if (ramp.length < 2)
    throw new Error(
      `${where}: a ramp needs at least two classes, got ${ramp.length}`,
    );
  const lightness = ramp.map(luminanceOf);
  const rising = lightness[lightness.length - 1]! > lightness[0]!;
  for (let i = 1; i < ramp.length; i++) {
    const step = lightness[i]! - lightness[i - 1]!;
    if (rising !== step > 0)
      throw new Error(
        `${where}: class ${i + 1} (${ramp[i]}) turns back on class ${i} (${ramp[i - 1]}) — ` +
          `the ramp runs ${rising ? "lighter" : "darker"} everywhere else, so a reader has no ` +
          `ordering here. Derive the far end from a colour that sits on the other side of the ground.`,
      );
    if (Math.abs(step) < 0.02)
      throw new Error(
        `${where}: classes ${i} (${ramp[i - 1]}) and ${i + 1} (${ramp[i]}) are ` +
          `${Math.abs(step).toFixed(4)} apart in relative luminance, under the 0.02 this family ` +
          `holds two classes apart by. They will read as one class.`,
      );
  }
  const top = ramp[ramp.length - 1]!;
  const ratio = contrastOf(top, ground);
  if (ratio < 3)
    throw new Error(
      `${where}: the ramp's top class ${top} measures ${ratio.toFixed(2)}:1 against the ground ` +
        `${ground} — under the 3:1 floor WCAG 2.2 SC 1.4.11 Non-text Contrast sets for a graphical ` +
        `object. The class carrying this map's argument cannot be seen. Record an accent with more ` +
        `room against this ground, or change the ground.`,
    );
  return ramp;
}

// ── Where a cell IS, read out of the file rather than typed ──────────────────────────────────────

/**
 * Which events landed in each cell, keyed the same way `binHex` keys them, valued by each point's
 * own `i` — its row index in the frozen CSV. The bake carries `i` through the projection precisely
 * so a cell can be asked what it holds.
 */
export function cellMembers(
  points: { px: number; py: number; i?: number }[],
  size: number,
): Map<string, number[]> {
  const members = new Map<string, number[]>();
  points.forEach((p, fallbackIndex) => {
    const a = pixelToAxial(p.px, p.py, size);
    const key = `${a.q},${a.r}`;
    const list = members.get(key);
    const index = p.i ?? fallbackIndex;
    if (list) list.push(index);
    else members.set(key, [index]);
  });
  return members;
}

/** Leading bearing phrases USGS puts in front of a place: "86 km ENE of", "south of the". */
const BEARING =
  /^(north|south|east|west|northeast|northwest|southeast|southwest|[NSEW]{1,3})(ern)?\s+of\s+(the\s+)?/i;

/**
 * The region a USGS place string names. Two shapes appear in this catalogue:
 * "86 km ENE of Kinablangan, Philippines" (the region is what follows the last comma) and bare
 * strings like "Fiji region" or "south of the Fiji Islands" (the whole string, minus the bearing
 * phrase and the trailing word "region").
 
 *  @parity */
export function regionOf(place: string): string {
  const tail = place.includes(",")
    ? place.slice(place.lastIndexOf(",") + 1)
    : place;
  return tail
    .trim()
    .replace(BEARING, "")
    .replace(/\s+region$/i, "")
    .trim();
}

/**
 * The regions a set of events is catalogued under, commonest first, with each one's share.
 *
 * Labels that begin with the same word are ONE region under three spellings — this catalogue writes
 * "Fiji", "Fiji region" and "south of the Fiji Islands" for the same seismic zone — so they are
 * merged and reported under the shortest of them. That merge is why this returns "Fiji 48%,
 * Tonga 42%" for the densest cell rather than four splinters of 15–17% each.
 *
 * It exists because the alt text used to TYPE a place name beside a derived coordinate. On the web
 * sibling that put "the Tonga-Kermadec trench" ~700 km east of where its own events average, and on
 * the static sibling it left "around Indonesia and the Philippines" standing after a re-bake moved
 * the densest cell to the Fiji–Tonga zone entirely.
 
 *  @parity */
export function dominantRegions(
  places: string[],
  max = 2,
): { label: string; count: number; share: number }[] {
  if (places.length === 0) return [];
  const counts = new Map<string, number>();
  for (const place of places) {
    const region = regionOf(place);
    counts.set(region, (counts.get(region) ?? 0) + 1);
  }
  const groups = new Map<string, { label: string; count: number }>();
  for (const [label, n] of counts) {
    const key = label.split(/\s+/)[0]!.toLowerCase();
    const group = groups.get(key) ?? { label, count: 0 };
    if (label.length < group.label.length) group.label = label;
    group.count += n;
    groups.set(key, group);
  }
  return [...groups.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, max)
    .map((g) => ({ ...g, share: g.count / places.length }));
}

// ── WHEN a cell filled up, which is the only question this beat's genre can answer ───────────────

/**
 * Every kept row's `time` string, in the same order — and therefore at the same index — as
 * `quakePointsFromCsv`. See `keptRows` for why that alignment is structural and not a convention.
 */
export function quakeTimesFromCsv(csv: string): string[] {
  return keptRows(csv).map((row) => row.time);
}

/**
 * The 0-based day of `year` an ISO-8601 UTC instant falls on, or `null` if it falls in another
 * year. UTC throughout, because the catalogue is: reading a timestamp in a local zone would move
 * events across midnight and, once a year, across the year boundary.
 */
export function dayIndexInYear(iso: string, year: number): number | null {
  const at = Date.parse(iso);
  if (!Number.isFinite(at)) return null;
  const date = new Date(at);
  if (date.getUTCFullYear() !== year) return null;
  const startOfYear = Date.UTC(year, 0, 1);
  return Math.floor((Date.UTC(year, date.getUTCMonth(), date.getUTCDate()) - startOfYear) / 86400000);
}

/** How many days `year` has — 366 in 2024, and never assumed. */
export function daysInYear(year: number): number {
  return Math.round((Date.UTC(year + 1, 0, 1) - Date.UTC(year, 0, 1)) / 86400000);
}

/**
 * For each cell, its RUNNING count at the end of every day of the year: `series[key][d]` is how
 * many of that cell's events had happened by the end of day `d`.
 *
 * Cumulative, never per-day: this beat's whole argument is that a cell's darkness is built up over
 * the year rather than delivered by one swarm, and a per-day series drawn on a map would show a
 * flickering scatter of that day's events — a different picture making a different claim.
 */
export function cumulativeByDay(
  members: Map<string, number[]>,
  dayOf: (eventIndex: number) => number | null,
  days: number,
): Map<string, number[]> {
  const series = new Map<string, number[]>();
  for (const [key, indices] of members) {
    const perDay = new Array<number>(days).fill(0);
    for (const index of indices) {
      const day = dayOf(index);
      if (day === null || day < 0 || day >= days) continue;
      perDay[day]!++;
    }
    let running = 0;
    for (let d = 0; d < days; d++) {
      running += perDay[d]!;
      perDay[d] = running;
    }
    series.set(key, perDay);
  }
  return series;
}

/**
 * How a cell's events are spread through the year: how many distinct days carry at least one, and
 * the single busiest day's own count and share.
 *
 * This is the measurement the beat's claim rests on, and it is the one a static map cannot make:
 * 1,724 events delivered on one afternoon and 1,724 events delivered across a whole year shade a
 * hexagon exactly the same.
 */
export function spreadOverDays(
  indices: number[],
  dayOf: (eventIndex: number) => number | null,
  days: number,
): { events: number; activeDays: number; busiestDay: number; busiestDayCount: number } {
  const perDay = new Array<number>(days).fill(0);
  let events = 0;
  for (const index of indices) {
    const day = dayOf(index);
    if (day === null || day < 0 || day >= days) continue;
    perDay[day]!++;
    events++;
  }
  let busiestDay = 0;
  for (let d = 1; d < days; d++) if (perDay[d]! > perDay[busiestDay]!) busiestDay = d;
  return {
    events,
    activeDays: perDay.filter((n) => n > 0).length,
    busiestDay,
    busiestDayCount: perDay[busiestDay]!,
  };
}
