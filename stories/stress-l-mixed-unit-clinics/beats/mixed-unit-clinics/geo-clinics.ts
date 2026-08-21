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
 *  `geo-discipline.md` rule 5.
 *  @parity-exempt: takes this panel's own `ClinicsRow[]` and joins one unit group at a time, never
 *  a value `Map` with `alias`/`expectedNoData`/`expectedExtraValues` declarations — the two study
 *  sets (COUNT, RATE) are joined separately, on purpose, and never share the tagged join's options. */
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
/** The other panel's own countries, shown as neutral land here — never the no-data grey, which
 *  would falsely claim the source is silent about them. Named in this panel's own legend instead. */
export const OTHER_UNIT_FILL = "#EDEDED";

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

// ── Geometry: value-label placement ────────────────────────────────────────────────────────────
//
// FINDING 10 (stress round three): a choropleth that labels every shape's own value at once — two
// panels of four countries each, `stress-l-mixed-unit-clinics/beats/mixed-unit-clinics/
// ClinicsMapStill.tsx` — hand-nudged three of its eight labels in the BEAT's own component:
// Belgium and the Netherlands sit close enough at that plate's own scale that their centroid
// labels collided, and Germany's own centroid sits close enough to its own accent outline to clip
// against it. Fixed HERE, where labels are placed, so the next beat that draws several value
// labels at once never has to reinvent the fix by hand.
//
// Measured across every choropleth this project has delivered (every `proof/`/`stories/` file
// using `pathFromRings`, 2026-08-21): `forest-loss`'s own ForestMapStill/Video draw one subject
// label plus a ranked list beside the map rather than a label per shape; both `ChoroplethWeb`
// beats (mapgen-choropleth-web, stress-f-housing-pressure) draw geometry only, with every value
// read from HTML on hover; `mapscrolly-one-map-europe-carbon`'s own MapFrame drives its labels
// through a leader-line system rather than baked text. `mixed-unit-clinics` is the only delivered
// choropleth that bakes a static value label for every shape at once, and it is the only one that
// collided — one beat today, not the placement's population, but the mechanism did not exist for
// it to reuse, so the same defect was one multi-label beat away from repeating.

type LabelBox = { minX: number; maxX: number; minY: number; maxY: number };

/** A label's own box, centred on `(x, y)` — the same anchor convention every seed and beat in this
 *  format already draws a `textAnchor="middle"` value label with. */
function boxOf(x: number, y: number, width: number, height: number): LabelBox {
  return {
    minX: x - width / 2,
    maxX: x + width / 2,
    minY: y - height / 2,
    maxY: y + height / 2,
  };
}

function boxesOverlap(a: LabelBox, b: LabelBox, margin = 0): boolean {
  return (
    a.minX - margin < b.maxX &&
    a.maxX + margin > b.minX &&
    a.minY - margin < b.maxY &&
    a.maxY + margin > b.minY
  );
}

function ringsBox(rings: Ring[]): LabelBox | null {
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
  return Number.isFinite(minX) ? { minX, maxX, minY, maxY } : null;
}

function boxWithin(inner: LabelBox, outer: LabelBox): boolean {
  return (
    inner.minX >= outer.minX &&
    inner.maxX <= outer.maxX &&
    inner.minY >= outer.minY &&
    inner.maxY <= outer.maxY
  );
}

export type LabelPlacement = {
  key: string;
  x: number;
  y: number;
  width: number;
  height: number;
  /** The shape this label names, in the same coordinate space as `x`/`y` — when given, a label
   *  whose own box spills outside it is reported as clipping that shape's own outline. */
  rings?: Ring[];
};

/**
 * DECIDES: does any of these labels' own measured box overlap another label's, or spill outside
 * the shape it names? Pure — takes measurements the beat already has (a centroid, a measured text
 * box, the shape's own rings), never a page. Refuses nothing on its own; returns one string per
 * offending pair or shape, empty when every label clears both checks.
 *
 * @parity */
export function labelPlacementIssues(labels: LabelPlacement[]): string[] {
  const issues: string[] = [];
  const boxes = labels.map((label) =>
    boxOf(label.x, label.y, label.width, label.height),
  );
  for (let i = 0; i < labels.length; i++) {
    for (let j = i + 1; j < labels.length; j++) {
      if (boxesOverlap(boxes[i]!, boxes[j]!))
        issues.push(
          `${labels[i]!.key}/${labels[j]!.key}: value labels overlap`,
        );
    }
  }
  labels.forEach((label, i) => {
    if (!label.rings) return;
    const shapeBox = ringsBox(label.rings);
    if (shapeBox && !boxWithin(boxes[i]!, shapeBox))
      issues.push(`${label.key}: value label clips its own shape's outline`);
  });
  return issues;
}

// A ring of candidate offsets around a label's own preferred anchor, at increasing radii — the
// automatic version of `ClinicsMapStill.tsx`'s own hand-picked `nudge: Record<string, [number,
// number]>`. Eight compass directions per radius keeps the search small and its order deterministic
// (closest to the anchor wins first), which is what makes `placeValueLabels` reproducible run to
// run rather than dependent on iteration order.
const CANDIDATE_RADII = [0, 6, 12, 20, 30, 42];
const CANDIDATE_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315].map(
  (deg) => (deg * Math.PI) / 180,
);

/**
 * REPAIRS: chooses a final `(x, y)` for every label that clears both `labelPlacementIssues` checks
 * against every label already placed, by walking the ring of candidate offsets above outward from
 * each label's own preferred anchor until one clears both, or — failing that — clears the
 * COLLISION check alone, even if it still clips its own shape. The two are not interchangeable: a
 * label overlapping another makes BOTH illegible, while a label spilling slightly past its own
 * small country's edge is still readable on its own, so a candidate is never chosen for merely
 * tying an EARLIER candidate's total issue count — measured on Belgium/the Netherlands, two
 * countries small enough that every candidate outside either one's own bbox also clips it: scoring
 * "collides" and "clips" as one combined count left the search unable to tell a candidate that
 * traded a collision for a clip from one that fixed nothing, and it kept the original, still-
 * colliding anchor. Deterministic: labels are placed in the given order, and a label already
 * placed never moves for one placed after it. Never throws: three labels stacked on one point (an
 * extreme no real beat has shipped, exercised by this format's own test) still return one
 * placement each, at whichever candidate collided with the fewest already-placed labels, because a
 * placement function that refuses to finish a page is worse than one small remaining overlap a
 * reader can still read every number from.
 *
 * @parity */
export function placeValueLabels(
  labels: LabelPlacement[],
): { key: string; x: number; y: number }[] {
  const placed: LabelPlacement[] = [];
  const result: { key: string; x: number; y: number }[] = [];
  for (const label of labels) {
    const shapeBox = label.rings ? ringsBox(label.rings) : null;
    let freeOfBoth: { x: number; y: number } | null = null;
    let freeOfCollision: { x: number; y: number } | null = null;
    let fewestCollisions: { x: number; y: number; collisions: number } = {
      x: label.x,
      y: label.y,
      collisions: Infinity,
    };
    outer: for (const radius of CANDIDATE_RADII) {
      const angles = radius === 0 ? [0] : CANDIDATE_ANGLES;
      for (const angle of angles) {
        const x = label.x + radius * Math.cos(angle);
        const y = label.y + radius * Math.sin(angle);
        const box = boxOf(x, y, label.width, label.height);
        const collisions = placed.filter((p) =>
          boxesOverlap(box, boxOf(p.x, p.y, p.width, p.height)),
        ).length;
        const clips = shapeBox !== null && !boxWithin(box, shapeBox);
        if (collisions === 0 && !clips) {
          freeOfBoth = { x, y };
          break outer;
        }
        if (collisions === 0 && !freeOfCollision) freeOfCollision = { x, y };
        if (collisions < fewestCollisions.collisions)
          fewestCollisions = { x, y, collisions };
      }
    }
    const chosen = freeOfBoth ?? freeOfCollision ?? fewestCollisions;
    placed.push({ ...label, x: chosen.x, y: chosen.y });
    result.push({ key: label.key, x: chosen.x, y: chosen.y });
  }
  return result;
}


// ── Language ───────────────────────────────────────────────────────────────────────────────────

/** @parity */
export function en(value: number, decimals = 1): string {
  return new Intl.NumberFormat("en-GB", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}
