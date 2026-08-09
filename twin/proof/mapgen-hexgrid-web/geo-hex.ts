/**
 * The pure half of this beat: csv parsing, axial hex binning (pointy-top, cube-rounded — Red Blob
 * Games' standard formulas), cell-size selection, and quantile class breaks. No browser, no
 * rasteriser. See `twin-map-beat/references/types/hex-grid.md`.
 *
 * This is this beat's OWN physical copy of `proof/map-quake-density/geo-hex.ts` — never imported
 * across `proof/` beats. The math is identical because the type's own rules do not change between
 * genres: a hex-grid still bins per point via `pixelToAxial` + cube rounding (every real coordinate
 * maps to exactly one hex under axial rounding, so there is no bbox-edge gap for a boundary point to
 * fall into and be silently dropped — `references/types/hex-grid.md`'s "skip that padding and
 * points... land in the gap"), still grows cell size against the ACTUAL binned count rather than a
 * config guess, and still needs class breaks printed as numbers, not left to colour alone. What the
 * WEB genre adds on top of this pure core lives in `HexGridWeb.tsx` and `render-web.mjs`, not here.
 */

export type QuakePoint = {
  lon: number;
  lat: number;
  mag: number;
  /** The catalogue's own place string, kept so a cell's region can be derived rather than typed. */
  place: string;
};

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

export function quakePointsFromCsv(csv: string): QuakePoint[] {
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
  return rows
    .slice(1)
    .filter((r) => r.length === header.length)
    .map((r) => ({
      lon: Number(r[lonAt]),
      lat: Number(r[latAt]),
      mag: Number(r[magAt]),
      place: r[placeAt]!,
    }))
    .filter(
      (p) =>
        Number.isFinite(p.lon) &&
        Number.isFinite(p.lat) &&
        Number.isFinite(p.mag),
    );
}

export type Axial = { q: number; r: number };

/** Pointy-top axial coordinate of the pixel (x, y), before rounding — Red Blob Games' formula. */
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

/** Cube-coordinate rounding: rounds q, r, s independently, then fixes whichever drifted most. */
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

export function pixelToAxial(x: number, y: number, size: number): Axial {
  const { q, r } = pixelToAxialFractional(x, y, size);
  return axialRound(q, r);
}

/** The centre pixel of an axial cell, pointy-top orientation. */
export function axialToPixel(a: Axial, size: number): [number, number] {
  const x = size * (Math.sqrt(3) * a.q + (Math.sqrt(3) / 2) * a.r);
  const y = size * ((3 / 2) * a.r);
  return [x, y];
}

/** The six corners of a pointy-top hexagon centred at (cx, cy). */
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
 */
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
 */
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

/**
 * Five class breaks from the nonempty cells' own counts, at fixed percentiles — printed as numbers
 * next to each colour class in the legend, per the type's accessibility trap ("the printed number —
 * not the colour alone — is what lets a reader tell two adjacent classes apart").
 */
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

export function binIndex(value: number, breaks: number[]): number {
  let index = 0;
  while (index < breaks.length && value > breaks[index]!) index++;
  return index;
}

/** A cell's pixel centre back to real lon/lat, using the plate's own TRUE frame corners
 *  (`bake-plate.mjs`'s `frameCorners`, measured with `map.unproject()` after the camera settled —
 *  NOT the nominal `bounds` passed to `fitBounds`, which a render audit found `fitBounds` widens to
 *  preserve the frame's own aspect ratio). Longitude is linear in pixel-x under Web Mercator;
 *  latitude needs the inverse Mercator formula because pixel-y is linear in Mercator-y, not in
 *  latitude itself. Exists so a beat can name which real place its subject cell sits over, derived
 *  from the same projection the bake used, instead of a hand-typed place name that can drift out of
 *  sync with which cell the data actually makes the subject. */
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

const HEX_COLOUR = /^#[0-9a-fA-F]{6}$/;

function channels(hex: string): number[] {
  if (!HEX_COLOUR.test(hex))
    throw new Error(`expected #rrggbb, got ${JSON.stringify(hex)}`);
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
}

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

/** Same construction as the choropleth's ramp: `steps` shades from ground toward ink, never the
 *  poles themselves — neutral on any ground the newsroom picks. */
export function sequentialRamp(
  ground: string,
  ink: string,
  steps: number,
): string[] {
  const FROM = 0.14;
  const TO = 0.82;
  return Array.from({ length: steps }, (_, i) =>
    mixHex(ground, ink, FROM + ((TO - FROM) * i) / (steps - 1)),
  );
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
 */
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
 */
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
