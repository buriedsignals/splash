/**
 * The pure half of the proportional-symbol beat: csv parsing, the sqrt radius scale, draw order,
 * edge-aware label placement, and the claim check. No browser, no rasteriser — testable, and
 * importable by both the still and the video (`twin-map-beat/references/types/proportional-symbol.md`).
 */


export type QuakeRow = {
  key: string;
  time: string;
  mag: number;
  lon: number;
  lat: number;
  place: string;
};

/** Minimal RFC4180-ish CSV parse: handles quoted fields with embedded commas, no embedded newlines. 
 *  @parity */
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

/** @parity */
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
 
 *  @parity */
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
 
 *  @parity */
export function radiusScale(maxValue: number, maxRadiusPx: number) {
  return (value: number) =>
    maxRadiusPx * Math.sqrt(Math.max(0, value) / maxValue);
}

/** Three round reference sizes for the legend, half-magnitude steps down from the rounded max.
 *
 *  NOT what this beat's legend uses any more — see `spanReferenceValues` below. Kept because this
 *  file is one of several trimmed copies of the same module and a helper deleted from one copy is
 *  the silent divergence this project duplicates deliberately to avoid; a beat whose values genuinely
 *  are round-numbered still wants it. 
 *  @parity */
export function halfMagnitudeReferenceValues(maxMag: number, count = 3): number[] {
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
 * `halfMagnitudeReferenceValues` rounded the top to the nearest half-magnitude, which for this file's
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
  // Largest first, matching `halfMagnitudeReferenceValues`' own order, so the callers' `[...legend].reverse()`
  // still puts the smallest circle first in the drawn row.
  return [...new Set(values)];
}

/** Largest first, so later (smaller) circles are drawn on top and stay hoverable/visible. 
 *  @parity-exempt: sorts the field this beat's own points carry (`.mag` on a quake catalogue, `.value` on the general seed); the invariant is small-on-top, not the field name. */
export function drawOrder<T extends { mag: number }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => b.mag - a.mag);
}

export type LabelPlacement = { side: "left" | "right"; dy: number };

/**
 * Edge-aware label side, computed from the symbol's PROJECTED screen position, not from the data —
 * `references/types/proportional-symbol.md`'s "the one thing that goes wrong": MapLibre's own
 * collision avoidance resolves label-vs-label overlap only, and has no idea where the canvas edge
 * is, so a symbol near the frame edge keeps its default side and overflows.
 
 *  @parity-exempt: the flip margin and the vertical nudge are pixel constants tuned per frame size, and deriving them is W5 task T7's own work — until then this records that they are known to disagree. */
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
 
 *  @parity */
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
 
 *  @parity */
export function energyRatio(subjectMag: number, comparisonMag: number): number {
  return 10 ** (1.5 * (subjectMag - comparisonMag));
}

/**
 * THE SIZE CHANNEL, ROOTED IN THE QUANTITY THE CIRCLES ACTUALLY STAND FOR (B6.17).
 *
 * `radiusScale` above is right about the shape of the rule — radius goes as the square root of the
 * value, rooted at zero, because the eye compares AREA — and it was pointed at the wrong value.
 * Measured on the committed still before this existed: over an M7.8→M9.1 span it drew every circle
 * on the map between **27.77 px and 30.00 px, a ratio of 1.080**. Seventeen marks, one apparent
 * size. The beat's own alt text said so out loud — *"It is the largest circle, but only just …
 * The accent outline, not the size, is what identifies it"* — which is a symbol map admitting its
 * one encoded channel encodes nothing.
 *
 * The cause is not the square root, it is the ROOT. Moment magnitude is a logarithm; M0 is not
 * "no earthquake", so zero on that axis is not a real zero, and a zero-rooted area scale over a
 * window that never comes near it flattens everything. Energy IS a ratio quantity with a true
 * zero, and magnitude is defined as its logarithm: E ∝ 10^(1.5 M). Encoding AREA ∝ ENERGY is the
 * type sheet's own rule applied to the variable that can carry it, and the same M7.8→M9.1 span
 * becomes a radius ratio of **9.44×** — 89 times the energy, drawn as 89 times the area, which is
 * what the caveat was previously reduced to explaining in words because the picture would not.
 *
 * THE MAXIMUM RADIUS IS DERIVED, NOT TYPED. It was three constants — 30 in the still, 46 in the
 * video, 30 in the runner — none of which knew the frame it was drawn into. Here the largest mark
 * is a fraction of the plate's own width, RAISED if that would drop the smallest mark below the
 * size a reader can still resolve, and the whole thing THROWS if holding the smallest legible
 * makes the largest swallow the map. Every number that decides a size is either measured from the
 * frame or refused.
 *
 *  @parity */
export function energyOfMagnitude(magnitude: number): number {
  return 10 ** (1.5 * magnitude);
}

/** @parity */
export function energyRadiusScale(
  magnitudes: number[],
  {
    frameWidth,
    maxRadiusFraction,
    minLegibleRadiusPx,
    maxRadiusCeilingFraction,
  }: {
    frameWidth: number;
    maxRadiusFraction: number;
    minLegibleRadiusPx: number;
    maxRadiusCeilingFraction: number;
  },
): {
  radiusOf: (magnitude: number) => number;
  maxRadiusPx: number;
  minRadiusPx: number;
} {
  if (magnitudes.length === 0)
    throw new Error("no magnitudes to build a size scale from");
  const energies = magnitudes.map(energyOfMagnitude);
  const maxEnergy = Math.max(...energies);
  const minEnergy = Math.min(...energies);
  // What the smallest mark is worth as a share of the largest, once area carries energy.
  const smallestShare = Math.sqrt(minEnergy / maxEnergy);
  let maxRadiusPx = frameWidth * maxRadiusFraction;
  if (maxRadiusPx * smallestShare < minLegibleRadiusPx)
    maxRadiusPx = minLegibleRadiusPx / smallestShare;
  if (maxRadiusPx > frameWidth * maxRadiusCeilingFraction)
    throw new Error(
      `keeping the smallest mark at ${minLegibleRadiusPx}px forces the largest to ` +
        `${maxRadiusPx.toFixed(1)}px, which is over ${(maxRadiusCeilingFraction * 100).toFixed(0)}% of an ` +
        `${frameWidth}px plate. This value set spans ${(1 / smallestShare).toFixed(1)}x in radius — too much ` +
        `for one frame. Split the story, or key the legend to a bracket and say what is off it.`,
    );
  return {
    radiusOf: (magnitude: number) =>
      maxRadiusPx * Math.sqrt(energyOfMagnitude(magnitude) / maxEnergy),
    maxRadiusPx,
    minRadiusPx: maxRadiusPx * smallestShare,
  };
}

/**
 * How much of this point set draws on top of itself. Counted rather than felt: the owner's report
 * was "watch overlap and the size of symbols close together — it becomes unreadable fast", and
 * before the scale above was fixed **21 of 136 pairs sat closer than two radii and 15 of the 17
 * marks shared ink with at least one neighbour**.
 *
 * Some of it is irreducible and the number is the honest way to say so: two of these events are
 * catalogued 1.8 px apart at this camera, so no radius makes them two marks. The type sheet's
 * answer to that is draw order (smaller on top, which `drawOrder` already does); this function's
 * answer is that the beat COUNTS what remains and puts the count in its own caveat, the way the
 * hex beat states the events its frame crops.
 *
 *  @parity */
export function overlapReport<T extends { key: string; mag: number; px: number; py: number }>(
  points: T[],
  radiusOf: (magnitude: number) => number,
): { pairs: number; overlappingPairs: number; marksTouched: number } {
  let pairs = 0;
  let overlappingPairs = 0;
  const touched = new Set<string>();
  for (let i = 0; i < points.length; i++)
    for (let j = i + 1; j < points.length; j++) {
      const a = points[i]!;
      const b = points[j]!;
      pairs++;
      const distance = Math.hypot(a.px - b.px, a.py - b.py);
      if (distance < radiusOf(a.mag) + radiusOf(b.mag)) {
        overlappingPairs++;
        touched.add(a.key);
        touched.add(b.key);
      }
    }
  return { pairs, overlappingPairs, marksTouched: touched.size };
}

/**
 * Check the confirmed superlative against the source: the subject must exceed every other point in
 * the study set, or the claim check throws naming which one it does not exceed.
 
 *  @parity */
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
