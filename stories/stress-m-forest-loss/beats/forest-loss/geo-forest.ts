/**
 * The pure core of THIS beat: the join (run twice, once naively per the article's own claim about
 * country codes and once against this project's own rule-5 convention, so both outcomes are on the
 * record — see BRIEF.md "The join, both directions"), the reveal order, the ring arithmetic. No
 * browser, no rasteriser. A physical copy of the relevant pieces of `map-beat/assets/geo.ts`.
 */

export type Ring = [number, number][];
export type Frame = { width: number; height: number };
export type BakedShape = { key: string; name: string; rings: Ring[] };
export type JoinedRow = { key: string; value: number | null };

const HEX = /^#[0-9a-fA-F]{6}$/;

/** The ministry's own seven codes, exactly as `source/data.csv` carries them — including `SDS` for
 *  South Sudan, unaliased. Whether this needs translating before it can find a shape is the
 *  question this beat's own bake answers by trying, not by assuming (see BRIEF.md). */
export const FOREST_STUDY = [
  "BRA",
  "COD",
  "IDN",
  "BOL",
  "PER",
  "SOM",
  "SDS",
] as const;

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

export type ForestRow = {
  code: string;
  country: string;
  loss_ha: number;
  year: number;
};

export function rowsFromCsv(csv: string): ForestRow[] {
  const [header, ...rows] = parseCsvRows(csv.trim());
  const columns = header ?? [];
  const codeAt = columns.indexOf("code");
  const countryAt = columns.indexOf("country");
  const valueAt = columns.indexOf("loss_ha");
  const yearAt = columns.indexOf("year");
  if (codeAt < 0 || valueAt < 0)
    throw new Error(`csv has no code / loss_ha column, got: ${header}`);
  const out: ForestRow[] = [];
  for (const cells of rows) {
    if (!cells || !cells[codeAt]) continue;
    const value = Number(cells[valueAt]);
    if (!Number.isFinite(value))
      throw new Error(`${cells[codeAt]}: "${cells[valueAt]}" is not a number`);
    out.push({
      code: cells[codeAt]!,
      country: cells[countryAt] ?? "",
      loss_ha: value,
      year: Number(cells[yearAt] ?? 0),
    });
  }
  return out;
}

// ── The join, exactly as `map-beat/assets/geo.ts` states it: fails loud both ways ───────────────

/** @parity */
export function unmatchedValues(
  keys: readonly string[],
  values: Map<string, number>,
  {
    alias = {},
    expectedExtraValues = [],
  }: {
    alias?: Record<string, string>;
    expectedExtraValues?: readonly string[] | "any";
  } = {},
): string[] {
  if (expectedExtraValues === "any") return [];
  const reachable = new Set(keys.map((key) => alias[key] ?? key));
  const declared = new Set(expectedExtraValues);
  return [...values.keys()].filter(
    (key) => !reachable.has(key) && !declared.has(key),
  );
}

/** @parity */
export function joinValues(
  keys: readonly string[],
  values: Map<string, number>,
  {
    alias = {},
    expectedNoData = [],
    expectedExtraValues = [],
  }: {
    alias?: Record<string, string>;
    expectedNoData?: readonly string[];
    expectedExtraValues?: readonly string[] | "any";
  } = {},
): { rows: JoinedRow[]; noData: string[]; matched: number } {
  const rows: JoinedRow[] = [];
  const noData: string[] = [];
  const unmatched: string[] = [];
  const wronglyDeclared: string[] = [];

  for (const key of keys) {
    const value = values.get(alias[key] ?? key);
    const declared = expectedNoData.includes(key);
    if (value === undefined) {
      if (!declared) unmatched.push(key);
      noData.push(key);
      rows.push({ key, value: null });
    } else {
      if (declared) wronglyDeclared.push(key);
      rows.push({ key, value });
    }
  }

  if (unmatched.length > 0)
    throw new Error(
      `${unmatched.length} of ${keys.length} shapes found no value and were not declared as no-data: ${unmatched.join(", ")}. ` +
        `Either the source really is silent about them (declare them), or the key is wrong (alias it) — a bad join renders as no-data and looks legitimate.`,
    );
  if (wronglyDeclared.length > 0)
    throw new Error(
      `declared as no-data but the source reports them: ${wronglyDeclared.join(", ")}. The declaration is stale.`,
    );

  const stray = unmatchedValues(keys, values, { alias, expectedExtraValues });
  if (stray.length > 0)
    throw new Error(
      `${stray.length} value${stray.length === 1 ? "" : "s"} found no shape and were not declared out of scope: ${stray.join(", ")}. ` +
        `Either the source really does cover ground the study set does not (pass expectedExtraValues: "any", or name them), or the key is wrong (alias it) — a value with no shape renders as nothing at all, which is worse than looking legitimate.`,
    );

  return { rows, noData, matched: rows.length - noData.length };
}

/** Join every declared shape KEY to its own SHAPE, and fail loud on a miss — the shape-side twin of
 *  `joinValues`, and the direction that actually catches the SDS/SSD trap in this tree (see
 *  BRIEF.md): a code aliased toward `SSD` finds no `ADM0_A3` shape at all, because Natural Earth's
 *  own `ADM0_A3` for South Sudan IS `SDS`. */
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

/** @parity */
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

// ── Reveal order: the article's own words, "country by country" ──────────────────────────────────

/** `geo-discipline.md` rule 10 — a map has no time axis, so the reveal takes the argument's own
 *  order. The article says "the animation should build country by country"; this beat's own
 *  argument is "Brazil leads", so the order runs LOWEST to HIGHEST, landing on Brazil last, the
 *  same "distribution builds toward the subject" shape the CO2 seed uses.
 *  @parity */
export function revealOrder(rows: JoinedRow[]): string[] {
  const missing = rows.filter((r) => r.value === null).map((r) => r.key);
  const present = rows
    .filter((r) => r.value !== null)
    .sort((a, b) => a.value! - b.value!)
    .map((r) => r.key);
  return [...missing, ...present];
}

// ── Colour ─────────────────────────────────────────────────────────────────────────────────────

/** @parity */
function channels(hex: string): number[] {
  if (!HEX.test(hex))
    throw new Error(`expected #rrggbb, got ${JSON.stringify(hex)}`);
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
}
/** @parity */
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
/** @parity */
export function luminanceOf(hex: string): number {
  const [r, g, b] = channels(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}
/** @parity */
export function contrastOf(a: string, b: string): number {
  const [hi, lo] = [luminanceOf(a), luminanceOf(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}
/** @parity */
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
/** @parity */
export function dataRampEnd(accent: string, ground: string): string {
  return mixHex(
    accent,
    luminanceOf(ground) >= 0.179 ? "#000000" : "#FFFFFF",
    0.4,
  );
}
/** @parity */
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

export const NO_DATA_FILL = "#B9B9B9";
export const WATER_FILL = "#AAC9E0";

// ── Geometry ───────────────────────────────────────────────────────────────────────────────────

/** @parity */
export function pathFromRings(rings: Ring[]): string {
  return rings
    .filter((ring) => ring.length >= 3)
    .map(
      (ring) =>
        "M" + ring.map(([x, y]) => `${round(x)} ${round(y)}`).join("L") + "Z",
    )
    .join("");
}
/** @parity */
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
/** @parity */
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

/** @parity-exempt: this beat's own source reports whole hectares (`source/data.csv`'s `loss_ha`
 *  column, six and seven figures) and both callers (`ForestMapStill.tsx`, `ForestMapVideo.tsx`)
 *  print it with the default; the tagged copies format a percentage-scale figure, where a decimal
 *  place is real precision rather than false precision on a number this large. */
export function en(value: number, decimals = 0): string {
  return new Intl.NumberFormat("en-GB", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}
