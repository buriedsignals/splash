/**
 * The pure core of THIS beat: the join (run TWICE, once per unit group, on purpose — never merged
 * into one scale), the classes, the ramp, the ring arithmetic. No browser, no rasteriser.
 *
 * A physical copy of the relevant pieces of `map-beat/assets/geo.ts` and
 * `stress-f-housing-pressure/beats/housing-pressure-choropleth/geo-choropleth.ts`, trimmed to what
 * a two-panel STATIC choropleth pair needs — no `revealOrder` (no video genre here).
 */

export type Ring = [number, number][];
export type Frame = { width: number; height: number };
export type BakedShape = { key: string; name: string; rings: Ring[] };
export type JoinedRow = { key: string; value: number | null };

const HEX = /^#[0-9a-fA-F]{6}$/;

/** The two study sets. Deliberately never merged into one array — the whole point of this beat is
 *  that COUNT and RATE never sit on one scale together. */
export const COUNT_STUDY = ["FRA", "DEU", "ESP", "ITA"] as const;
export const RATE_STUDY = ["POL", "SWE", "NLD", "BEL"] as const;

// ── Reading the source ─────────────────────────────────────────────────────────────────────────

function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  let i = 0;
  while (i < text.length) {
    const char = text[i]!;
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        quoted = false;
        i += 1;
        continue;
      }
      field += char;
      i += 1;
      continue;
    }
    if (char === '"') {
      quoted = true;
      i += 1;
      continue;
    }
    if (char === ",") {
      row.push(field);
      field = "";
      i += 1;
      continue;
    }
    if (char === "\n" || char === "\r") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      i += char === "\r" && text[i + 1] === "\n" ? 2 : 1;
      continue;
    }
    field += char;
    i += 1;
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/** One row of the frozen source: a country code, its own value, and the unit that value is IN.
 *  Reading `unit` here is the whole decision this beat makes: the column is read as two separate
 *  measures, never coerced into one. */
export type ClinicsRow = {
  code: string;
  country: string;
  value: number;
  unit: string;
};

export function rowsFromCsv(csv: string): ClinicsRow[] {
  const [header, ...rows] = parseCsvRows(csv.trim());
  const columns = header ?? [];
  const codeAt = columns.indexOf("code");
  const countryAt = columns.indexOf("country");
  const valueAt = columns.indexOf("value");
  const unitAt = columns.indexOf("unit");
  if (codeAt < 0 || valueAt < 0 || unitAt < 0)
    throw new Error(`csv has no code / value / unit column, got: ${header}`);
  const out: ClinicsRow[] = [];
  for (const cells of rows) {
    if (!cells || !cells[codeAt]) continue;
    const raw = cells[valueAt] ?? "";
    const value = Number(raw);
    if (!Number.isFinite(value))
      throw new Error(
        `${cells[codeAt]}: "${raw}" is not a number this join can read`,
      );
    out.push({
      code: cells[codeAt]!,
      country: cells[countryAt] ?? "",
      value,
      unit: cells[unitAt] ?? "",
    });
  }
  return out;
}

// ── The join, run once per study set ──────────────────────────────────────────────────────────

/** Join every declared KEY to a value from ONE group's own rows, and fail loud both ways —
 *  `geo-discipline.md` rule 5. */
export function joinValues(
  keys: readonly string[],
  rows: ClinicsRow[],
): { rows: JoinedRow[]; matched: number } {
  const values = new Map(rows.map((r) => [r.code, r.value]));
  const out: JoinedRow[] = [];
  const unmatched: string[] = [];
  for (const key of keys) {
    const value = values.get(key);
    if (value === undefined) unmatched.push(key);
    out.push({ key, value: value ?? null });
  }
  if (unmatched.length > 0)
    throw new Error(
      `${unmatched.length} of ${keys.length} declared countries found no value: ${unmatched.join(", ")}.`,
    );
  return { rows: out, matched: out.length };
}

/** Join every declared shape KEY to its own SHAPE, and fail loud on a miss. */
export function joinShapes<T extends { key: string }>(
  keys: readonly string[],
  shapes: readonly T[],
): T[] {
  const byKey = new Map(shapes.map((s) => [s.key, s]));
  const missing = keys.filter((k) => !byKey.has(k));
  if (missing.length > 0)
    throw new Error(
      `${missing.length} declared countries have no shape in countries.geojson: ${missing.join(", ")}`,
    );
  return keys.map((k) => byKey.get(k)!);
}

// ── Classes / legend position ─────────────────────────────────────────────────────────────────

export function binIndexLowerInclusive(
  value: number,
  breaks: number[],
): number {
  let index = 0;
  while (index < breaks.length && value >= breaks[index]!) index++;
  return index;
}

export function scalePosition(value: number, breaks: number[]): number {
  const classes = breaks.length + 1;
  const index = binIndexLowerInclusive(value, breaks);
  const lower = index === 0 ? 0 : breaks[index - 1]!;
  const upper =
    index === breaks.length
      ? lower + (breaks[breaks.length - 1]! - (breaks[breaks.length - 2] ?? 0))
      : breaks[index]!;
  const fraction = Math.max(0, Math.min(1, (value - lower) / (upper - lower)));
  return (index + fraction) / classes;
}

// ── Colour ─────────────────────────────────────────────────────────────────────────────────────

function channels(hex: string): number[] {
  if (!HEX.test(hex))
    throw new Error(`expected #rrggbb, got ${JSON.stringify(hex)}`);
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
}

export function mixHex(from: string, to: string, ratio: number): string {
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

export function luminanceOf(hex: string): number {
  const [r, g, b] = channels(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

export function contrastOf(a: string, b: string): number {
  const [hi, lo] = [luminanceOf(a), luminanceOf(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

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

export function dataRampEnd(accent: string, ground: string): string {
  return mixHex(
    accent,
    luminanceOf(ground) >= 0.179 ? "#000000" : "#FFFFFF",
    0.4,
  );
}

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
        `${where}: class ${i + 1} (${ramp[i]}) turns back on class ${i} (${ramp[i - 1]}).`,
      );
    if (Math.abs(step) < 0.02)
      throw new Error(
        `${where}: classes ${i} and ${i + 1} are ${Math.abs(step).toFixed(4)} apart in luminance.`,
      );
  }
  const top = ramp[ramp.length - 1]!;
  const ratio = contrastOf(top, ground);
  if (ratio < 3)
    throw new Error(
      `${where}: top class ${top} measures ${ratio.toFixed(2)}:1 against ${ground}, under the 3:1 floor.`,
    );
  return ramp;
}

export const NO_DATA_FILL = "#B9B9B9";
export const WATER_FILL = "#AAC9E0";
/** The other panel's own countries, shown as neutral land here — never the no-data grey, which
 *  would falsely claim the source is silent about them. Named in this panel's own legend instead. */
export const OTHER_UNIT_FILL = "#EDEDED";

// ── Geometry ───────────────────────────────────────────────────────────────────────────────────

export function pathFromRings(rings: Ring[]): string {
  return rings
    .filter((ring) => ring.length >= 3)
    .map(
      (ring) =>
        "M" + ring.map(([x, y]) => `${round(x)} ${round(y)}`).join("L") + "Z",
    )
    .join("");
}

function round(n: number): number {
  return Math.round(n * 10) / 10;
}

export function simplifyRing(ring: Ring, minGap: number): Ring {
  if (ring.length <= 3) return ring;
  const kept: Ring = [ring[0]!];
  for (let i = 1; i < ring.length - 1; i++) {
    const last = kept[kept.length - 1]!;
    const point = ring[i]!;
    if (Math.hypot(point[0] - last[0], point[1] - last[1]) >= minGap)
      kept.push(point);
  }
  kept.push(ring[ring.length - 1]!);
  return kept.length >= 3 ? kept : ring.slice(0, 3);
}

export function keepRing(ring: Ring, frame: Frame, margin = 40): boolean {
  if (ring.length < 3) return false;
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;
  for (const [x, y] of ring) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  if (maxX - minX > frame.width * 3) return false;
  return (
    maxX >= -margin &&
    minX <= frame.width + margin &&
    maxY >= -margin &&
    minY <= frame.height + margin
  );
}

export type BBox = { minX: number; maxX: number; minY: number; maxY: number };

export function boundingBoxOf(rings: Ring[]): BBox {
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;
  for (const ring of rings)
    for (const [x, y] of ring) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  return { minX, maxX, minY, maxY };
}

export function bboxCenter(box: BBox): [number, number] {
  return [(box.minX + box.maxX) / 2, (box.minY + box.maxY) / 2];
}

// ── Language ───────────────────────────────────────────────────────────────────────────────────

export function en(value: number, decimals = 1): string {
  return new Intl.NumberFormat("en-GB", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}
