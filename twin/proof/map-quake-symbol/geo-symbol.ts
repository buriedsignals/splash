/**
 * The pure half of the proportional-symbol beat: csv parsing, the sqrt radius scale, draw order,
 * edge-aware label placement, and the claim check. No browser, no rasteriser — testable, and
 * importable by both the still and the video (`twin-map-beat/references/types/proportional-symbol.md`).
 */

import { scaleSqrt } from "d3-scale";

export type QuakeRow = {
  key: string;
  time: string;
  mag: number;
  lon: number;
  lat: number;
  place: string;
};

/** Minimal RFC4180-ish CSV parse: handles quoted fields with embedded commas, no embedded newlines. */
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

export function quakesFromCsv(csv: string): QuakeRow[] {
  const rows = parseCsv(csv.trim() + "\n");
  const header = rows[0]!;
  const at = (name: string) => {
    const i = header.indexOf(name);
    if (i < 0)
      throw new Error(`csv has no "${name}" column, got: ${header.join(",")}`);
    return i;
  };
  const timeAt = at("time");
  const magAt = at("mag");
  const lonAt = at("longitude");
  const latAt = at("latitude");
  const placeAt = at("place");
  return rows
    .slice(1)
    .filter((r) => r.length === header.length)
    .map((r, i) => ({
      key: `q${i}`,
      time: r[timeAt]!,
      mag: Number(r[magAt]),
      lon: Number(r[lonAt]),
      lat: Number(r[latAt]),
      place: r[placeAt]!,
    }));
}

/**
 * The calendar-year window the rows actually cover, read out of their own ISO timestamps. Exists
 * because the source line and the alt text used to CREDIT a window ("2005–2024") seven years wider
 * than the frozen file, whose last event is 2017-01-22 — a credit no reader could have checked and
 * no test could have caught, since nothing compared the sentence to the data. Anything the
 * furniture says about the period must come through here.
 */
export function yearWindow(rows: { time: string }[]): {
  first: number;
  last: number;
  span: number;
  label: string;
} {
  if (rows.length === 0) throw new Error("no rows to take a window from");
  const years = rows.map((r) => {
    const year = Number(r.time.slice(0, 4));
    if (!Number.isInteger(year))
      throw new Error(
        `row time "${r.time}" does not start with a four-digit year`,
      );
    return year;
  });
  const first = Math.min(...years);
  const last = Math.max(...years);
  return { first, last, span: last - first, label: `${first}–${last}` };
}

/**
 * The radius scale: rooted at zero, radius ∝ √magnitude — an equal-AREA encoding, per
 * `references/types/proportional-symbol.md`'s "don't linear-scale the radius". Magnitude itself is
 * already a logarithmic quantity (a step of 1.0 is ~32× the energy release), which this scale does
 * NOT correct for — it draws circles proportional to the reported magnitude number, the same
 * convention USGS's own event maps use, and the beat's caveat says so in words so a reader is not
 * left to assume the circles are proportional to energy.
 */
export function radiusScale(maxMag: number, maxRadiusPx: number) {
  const scale = scaleSqrt().domain([0, maxMag]).range([0, maxRadiusPx]);
  return (mag: number) => scale(mag);
}

/** Three round reference sizes for the legend, half-magnitude steps down from the rounded max.
 *
 *  NOT what this beat's legend uses any more — see `spanReferenceValues` below. Kept because this
 *  file is one of several trimmed copies of the same module and a helper deleted from one copy is
 *  the silent divergence this project duplicates deliberately to avoid; a beat whose values genuinely
 *  are round-numbered still wants it. */
export function niceReferenceValues(maxMag: number, count = 3): number[] {
  const top = Math.round(maxMag * 2) / 2;
  const values: number[] = [];
  for (let i = 0; i < count; i++) {
    const v = Math.round((top - i * 0.5) * 10) / 10;
    if (v > 0) values.push(v);
  }
  return values;
}

/**
 * Reference sizes that BRACKET the values drawn: the smallest mark, the largest, and the value
 * halfway between, at the data's own one-decimal precision.
 *
 * `niceReferenceValues` rounded the top to the nearest half-magnitude, which for this file's
 * maximum of 9.1 gives 9.0 — so the legend's biggest key was SMALLER than the biggest circle on the
 * map, and its three keys (M8.0 / M8.5 / M9.0) sat outside the range at the bottom too: nothing in
 * the file is under 7.8, so the legend's own smallest key named an event size the map does not
 * contain while leaving four real magnitudes below it unkeyed. A size legend is a ruler, and a
 * ruler has to start and stop where the thing it measures does.
 *
 * What this does NOT fix, and must not be read as fixing: the three circles remain within about 6%
 * of each other, because that is what this beat's encoding says. Radius goes as √magnitude rooted
 * at zero over a file spanning 7.8 to 9.1, so every circle it draws is between 27.8 and 30 px. That
 * is a deliberate, written decision (`BRIEF.md`, "The claim was rewritten, not the encoding"): area
 * ∝ magnitude is USGS's own convention, magnitude is logarithmic, and the caveat in the frame says
 * so in words. Keying the legend to the extremes at least makes the flatness legible AS the range,
 * instead of hiding it behind three round numbers that bracket nothing.
 */
export function spanReferenceValues(mags: number[], count = 3): number[] {
  if (mags.length === 0) throw new Error("no magnitudes to key a legend to");
  if (count < 2)
    throw new Error(
      `a bracketing legend needs at least two keys, got ${count}`,
    );
  const min = Math.min(...mags);
  const max = Math.max(...mags);
  const round = (v: number) => Math.round(v * 10) / 10;
  const values: number[] = [];
  for (let i = 0; i < count; i++)
    values.push(round(max - ((max - min) * i) / (count - 1)));
  // Largest first, matching `niceReferenceValues`' own order, so the callers' `[...legend].reverse()`
  // still puts the smallest circle first in the drawn row.
  return [...new Set(values)];
}

/** Largest first, so later (smaller) circles are drawn on top and stay hoverable/visible. */
export function drawOrder<T extends { mag: number }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => b.mag - a.mag);
}

export type LabelPlacement = { side: "left" | "right"; dy: number };

/**
 * Edge-aware label side, computed from the symbol's PROJECTED screen position, not from the data —
 * `references/types/proportional-symbol.md`'s "the one thing that goes wrong": MapLibre's own
 * collision avoidance resolves label-vs-label overlap only, and has no idea where the canvas edge
 * is, so a symbol near the frame edge keeps its default side and overflows.
 */
export function labelPlacement(
  px: number,
  py: number,
  frame: { width: number; height: number },
  margin = 130,
): LabelPlacement {
  const side = px > frame.width - margin ? "left" : "right";
  const dy = py < 26 ? 20 : py > frame.height - 20 ? -12 : 5;
  return { side, dy };
}

/**
 * How far point `index` of `count` (in the reveal's own order) has arrived, given the reveal's
 * progress. Same windowed-overlap shape as the choropleth's `arrivalProgress` — the field builds
 * continuously rather than blinking one point at a time.
 */
export function arrivalProgress(
  index: number,
  count: number,
  reveal: number,
): number {
  const WINDOW = 0.16;
  const start = count <= 1 ? 0 : (index / (count - 1)) * (1 - WINDOW);
  return Math.max(0, Math.min(1, (reveal - start) / WINDOW));
}

export type LabelBox = { x: number; y: number; width: number; height: number };

/**
 * Highest priority (lowest number) places first; a lower-priority label whose box would overlap an
 * already-placed one is dropped. A physical copy of `map-geneva-locator/geo-locator.ts`'s own
 * `declutterLabels` (same shape, not an import — a beat under `proof/` never reaches into a sibling
 * beat at runtime), needed here because this beat's static genre labels EVERY point unconditionally
 * (`QuakeSymbolStill.tsx`'s first version) while the video genre only ever labels its one subject —
 * fine with 1 label, not with the 17 this study set actually has. Three real clusters (Kuril
 * Islands, Sumatra, Solomon Islands/PNG) sit close enough that every point's own "M7.8"/"M7.9"-style
 * label collided into an illegible stack, caught by looking at the rendered PNG. Same input always
 * produces the same shown/hidden set, for the same reason the locator beat's own copy states it.
 */
export function declutterLabels<T extends { key: string; priority: number }>(
  points: T[],
  boxOf: (point: T) => LabelBox,
): Set<string> {
  const ordered = [...points].sort((a, b) => a.priority - b.priority);
  const placed: LabelBox[] = [];
  const shown = new Set<string>();
  const overlaps = (a: LabelBox, b: LabelBox) =>
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y;

  for (const point of ordered) {
    const box = boxOf(point);
    if (placed.some((p) => overlaps(p, box))) continue;
    placed.push(box);
    shown.add(point.key);
  }
  return shown;
}

/**
 * How many times more energy the subject released than a comparison event, from the moment
 * magnitude scale's own definition (each whole step is 10^1.5× the energy). Used to turn the
 * beat's log-scale caveat into one checkable number instead of leaving it as a warning only.
 */
export function energyRatio(subjectMag: number, comparisonMag: number): number {
  return 10 ** (1.5 * (subjectMag - comparisonMag));
}

/**
 * Check the confirmed superlative against the source: the subject must exceed every other point in
 * the study set, or the claim check throws naming which one it does not exceed.
 */
export function symbolClaimViolations({
  rows,
  subjectKey,
}: {
  rows: QuakeRow[];
  subjectKey: string;
}): string[] {
  const subject = rows.find((r) => r.key === subjectKey);
  if (!subject) throw new Error(`no row for subject ${subjectKey}`);
  const violations: string[] = [];
  for (const row of rows) {
    if (row.key === subject.key) continue;
    if (row.mag >= subject.mag)
      violations.push(
        `${row.place} (M${row.mag}) is not below the subject ${subject.place} (M${subject.mag})`,
      );
  }
  return violations;
}
