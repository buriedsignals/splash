/**
 * RFC 4180 row tokeniser, inlined here rather than imported — no cross-skill runtime import, and
 * a proof/story workspace is not a skill either. A naive comma split corrupts a quoted thousands
 * separator ("1,234.5") or a quoted name carrying its own comma ("Netherlands, the"); this walks
 * the text one character at a time instead. Returns one array of raw field strings per row
 * (header included), quotes stripped, doubled quotes un-escaped, and a lone CR or CRLF closing a
 * row the same way LF does.
 */
function parseCsvRows(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  let i = 0;
  while (i < text.length) {
    const char = text[i];
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        quoted = false; i += 1; continue;
      }
      field += char; i += 1; continue;
    }
    if (char === '"') { quoted = true; i += 1; continue; }
    if (char === ",") { row.push(field); field = ""; i += 1; continue; }
    if (char === "\r") { row.push(field); rows.push(row); row = []; field = ""; i += (text[i + 1] === "\n") ? 2 : 1; continue; }
    if (char === "\n") { row.push(field); rows.push(row); row = []; field = ""; i += 1; continue; }
    field += char; i += 1;
  }
  if (field !== "" || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

/**
 * THE PURE CORE OF A CHOROPLETH × WEB BEAT: the join, the classes, the ramp, the two surfaces that
 * are not the data, and the ring arithmetic. No browser, no rasteriser — which is what makes the
 * join testable at all, and what lets the bake (node), the SSR and a test import it without any of
 * them dragging a browser's runtime behind them.
 *
 * WHY THIS FILE EXISTS AT ALL, said plainly because for a whole chantier it did not. `SKILL.md` used
 * to state that "a choropleth's own web beat is the next one to write, importing this skill's OWN
 * copy of `map-beat/assets/geo.ts`'s join/ramp logic" — while `proof/mapgen-choropleth-web` had
 * been a complete, shipped, worked choropleth web beat for weeks. There was no `geo.ts` here to
 * import, only `geo-symbol.ts`, which says in its own header that a symbol map has no polygon join.
 * So the documented path for THE CELL A JOURNALIST ACTUALLY ASKS FOR — shade the countries by a rate
 * — pointed at a file that did not exist, and the one person who needed it built their beat by
 * copying out of `proof/` instead. Measured on a real story, 2026-08-22.
 *
 * This is that file: this skill's OWN copy of the polygon core, carried rather than imported (a
 * skill has to build after being copied alone into a journalist's root —
 * `splash/test/no-cross-skill-imports.test.ts`), byte-identical to the worked beat's own copy for
 * everything that is format mechanics rather than one story's numbers.
 *
 * Trimmed the same way that beat's copy is: no `revealOrder` (that is `geo-discipline.md` rule 10's
 * answer for a VIDEO's time axis; a web page has no frames to reveal across). Kept `scalePosition`,
 * because a choropleth's legend still places named marks on one continuous scale beside the
 * discrete class bar.
 */

export type Ring = [number, number][];
export type Frame = { width: number; height: number };

/** A shape as it comes out of the bake: pixel-space rings, ready to be a path. */
export type BakedShape = {
  key: string;
  name: string;
  rings: Ring[];
};

/** One row of the join: a shape, and the value it did or did not find. */
export type JoinedRow = { key: string; value: number | null };

const HEX = /^#[0-9a-fA-F]{6}$/;

// ── The beat's own data ────────────────────────────────────────────────────────────────────────

/**
 * REPLACE ME. Do not parameterise me.
 *
 * A BEAT'S STUDY SET IS ITS OWN DECLARED CLAIM, and declaring it as a LIST is the whole of what
 * makes the join checkable. Read it back out of the shapefile the shapes come from and it can never
 * disagree with it, and `joinValues`/`unmatchedValues` below are then measuring nothing.
 *
 * `ADM0_A3`, never `ISO_A3` (`doctrine/references/geo-discipline.md` rule 5). In Natural Earth's
 * 1:50m file eight features carry `ISO_A3 = "-99"` — France, Norway, Kosovo, Northern Cyprus,
 * Somaliland, Kashmir and two Australian territories — so a join on that field drops France and
 * Norway off a world map without a word. Measured, on a real 241-region beat.
 *
 * These eight keys are the seed's own: enough to render, and obviously not a beat.
 */
export const SEED_STUDY = ["FRA", "DEU", "ESP", "ITA", "POL", "SWE", "GRC", "PRT"] as const;

/** REPLACE ME. Class boundaries in the beat's own unit — six classes from five boundaries.
 *
 *  ROUND NUMBERS A READER ALREADY THINKS IN, not quantiles, unless the beat's own claim is about a
 *  quantile. A quantile scale moves the boundary the title names to wherever this year's data put
 *  it, which is exactly the boundary a reader cannot read off a legend. Check the distribution
 *  across whatever you choose: a class holding half the study set, or none of it, is not a class. */
export const SEED_BREAKS = [2, 4, 6, 8, 10];

// ── Reading the source ─────────────────────────────────────────────────────────────────────────

/** This beat's own frozen csv: `Code,Entity,Year,value`, already filtered to 2023 and the 41
 *  declared codes (see `co2-per-capita-2023.csv` in this folder — produced once, by a script, from
 *  the real OWID source this project already carries, never hand-typed). 
 *  @parity-exempt: takes a `year` where the beat animates one and does not where it does not; the frozen CSVs differ in shape, not the join. */
// A number a human wrote, and nothing else — mirrors `skills/intake/scripts/profile.mjs`'s own
// NUMERIC_RE/THOUSANDS_RE discipline for the same reason: `Number("0x1F")` is 31, and
// `Number("1,234.5")` is NaN, silently dropped by a bare `Number.isFinite` guard as if the country
// had no reading at all. Not imported — no cross-skill runtime import — a plain copy.
const NUMERIC_RE = /^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i;
const THOUSANDS_RE = /^[+-]?\d{1,3}(,\d{3})+(\.\d+)?$/;

function readHonestNumber(raw: string): number | null {
  if (NUMERIC_RE.test(raw)) return Number(raw);
  if (THOUSANDS_RE.test(raw)) return Number(raw.replace(/,/g, ""));
  return null;
}

export function valuesFromCsv(csv: string): Map<string, number> {
  const [header, ...rows] = parseCsvRows(csv.trim());
  const columns = (header ?? []);
  const codeAt = columns.indexOf("Code");
  const valueAt = columns.indexOf("value");
  if (codeAt < 0 || valueAt < 0)
    throw new Error(`csv has no Code / value column, got: ${header}`);

  const values = new Map<string, number>();
  for (const row of rows) {
    if (!row) continue;
    const cells = row;
    if (!cells[codeAt]) continue;
    const raw = cells[valueAt] ?? "";
    if (raw === "") continue;
    const value = readHonestNumber(raw);
    if (value === null)
      throw new Error(
        `${cells[codeAt]}: "${raw}" is not a value this join can read honestly — neither a plain number nor a thousands-grouped one`,
      );
    values.set(cells[codeAt]!, value);
  }
  return values;
}

// ── The join ───────────────────────────────────────────────────────────────────────────────────

/**
 * Every VALUE key the source carries that no shape claims — the mirror of the miss `joinValues`
 * already refuses, one level down so it can be measured on its own. A stray value renders as
 * NOTHING AT ALL (no shape to paint it on), which the doctrine's own argument for the loud join
 * calls worse than a bad join rendering as no-data and looking legitimate: at least a no-data shape
 * is visible on the map, wrong-coloured; a value with no shape leaves no mark anywhere to be wrong.
 *
 * `expectedExtraValues` is how a beat tells this function apart from the case it must NOT refuse: a
 * source that legitimately covers more ground than the study set — OWID's global CO2 csv joined
 * against a European study, say — has hundreds of values no European shape will ever claim, and
 * that is normal, not a defect. There is no COUNT that tells "Atlantis" (one stray key in an
 * otherwise-matching source) apart from "the rest of the world" (hundreds of stray keys, all real
 * countries, none of them wrong) — both are just "keys not in the study set" from where this
 * function sits. So the line is not measured, it is DECLARED: `"any"` is the beat's own explicit,
 * visible-in-the-call-site statement that its source is known to be broader than its study, checked
 * against nothing further; a short array is the same declaration for a FEW known extras, checked by
 * name so a typo in the array itself still leaves the real stray one refused. Neither softens into
 * a warning — the default, with nothing declared, refuses every stray key it finds, by name.
 
 *  @parity */
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

/**
 * Join every shape key to a value, and FAIL LOUD on both kinds of silence
 * (`geo-discipline.md` rule 5, made real): a country whose key does not match renders as no-data
 * and looks like a legitimate value — nothing throws, nothing warns. So an undeclared miss is an
 * error naming the country, and a declared no-data that turns out to HAVE a value is an error too
 * (the declaration has gone stale — the same defect arriving from the other side).
 
 *  @parity */
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

/**
 * Join every declared shape KEY to its own SHAPE, and fail loud on a miss — the shape-side twin of
 * `joinValues`. `geo-discipline.md` rule 5 is written about a value that fails to find a shape, but
 * a shape that fails to find a declared key is the same silent-wrongness risk from the other
 * direction: a declared country this beat claims to draw that the bake would otherwise just skip.
 */
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

/** Which class a VALUE falls in, where a class INCLUDES its own lower break: class i+1 starts AT
 *  `breaks[i]`. That is what this beat's own legend prints — the tick row `[0, ...breaks]` labels
 *  each break as the foot of the class above it. The hex family bins the other way and says so in
 *  its own name. @parity */
export function binIndexLowerInclusive(value: number, breaks: number[]): number {
  let index = 0;
  while (index < breaks.length && value >= breaks[index]!) index++;
  return index;
}

/**
 * Where a value sits on the class legend, 0 at the foot of the first class and 1 at the head of the
 * last — so a marker lands INSIDE its class rather than on a boundary, and two values in the same
 * class are still drawn apart. The top class is open-ended, so a value past it clamps rather than
 * running off the legend.
 */
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

// ── Colour: the ramp is a quantity, not a palette ──────────────────────────────────────────────

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

// ── ONE ANSWER FOR THE WHOLE SURFACE SET: ground, water, no-data, and every class ───────────────
//
// WHAT THE OWNER SAW, on the first draft, before anything was measured: *"the no-data grey and the
// low class read the same."* A world choropleth of rabies deaths REPORTED to WHO — 94 countries
// filed nothing and 44 filed a real zero, opposite facts — drew the two silences so a reader could
// not tell them apart. The map contradicted its own headline.
//
// Measured on that page and on three more palettes, in CONTRAST rather than in luminance:
//
//   ground   accent     no-data vs class 1     water vs no-data
//   #16191B  #D4A853         1.28:1                1.02:1
//   #FFFFFF  #B2182B         1.32:1                1.00:1
//   #FFFFFF  #1A6B8A         1.27:1                1.00:1
//   #0B0B0B  #E8E8E8         1.31:1                1.00:1
//
// TWO MECHANISMS PRODUCED THAT, and neither is a tuning slip.
//
// 1. THE MIDPOINT RULE CAPPED THE SEPARATION AT 2:1 BY CONSTRUCTION. Both surfaces were placed at
//    the ARITHMETIC midpoint of the band between the ground and the first class. A midpoint's
//    contrast against the upper end is (L1 + 0.05) / ((Lg + L1) / 2 + 0.05), which climbs toward
//    2.00:1 as L1 grows and is under it everywhere. No ground, no ramp low end and no class count
//    could ever have bought this case more — it is a property of the placement, not of any beat.
//    And "the point furthest from both things it must not be confused with" was never true in the
//    unit a reader sees: the point equidistant in CONTRAST is the geometric mean, not the mean.
//
// 2. THE MEASUREMENT WAS IN THE WRONG UNIT, so nothing could see it. `SURFACE_CLEARANCE` held each
//    surface `0.02` of relative LUMINANCE clear of the nearest class. A luminance gap is not a
//    contrast, and the same gap does not mean the same thing twice: 0.02 beside a `#16191B` ground
//    is 1.34:1, and 0.02 beside white is 1.019:1 — a floor seventeen times stricter on the dark
//    ground than on the light one. That is the whole of the "short by 0.0015, fourteen times out of
//    fourteen" refusal this newsroom's own charter used to collect: the dark ground was held to
//    1.34:1 and missed it by 7.5%, while the WHITE ground passed the same rule at 1.19:1 — the
//    WORSE of the two pictures, admitted, because 0.02 buys nothing up there. **The 0.0015 was
//    never real. The comparison was wrong, and it was wrong in a direction that flattered white.**
//
// SO THE FOUR SURFACES ARE ONE QUESTION, NOT FOUR. A reader looking at this map sees the page
// ground, the sea, the countries that filed nothing, and six classes of countries that filed
// something. Every pair of those a reader must tell apart is measured here, in contrast, against
// two floors — and both floors are DERIVED from a rule this family already holds rather than typed:
//
//   · `KIND_FLOOR` — 3:1, WCAG 2.2 SC 1.4.11, the floor `assertRampReads` already sets for the top
//     class against the ground. It applies between things that differ in KIND: a surface carrying
//     no reading against a surface carrying one. Nothing orders them, so nothing but contrast
//     tells a reader they are different sorts of fact.
//   · `stepFloorFor(classes)` — `KIND_FLOOR ** (1 / classes)`. Between things of the SAME kind
//     that a reader orders — two adjacent classes, or a surface against the page it sits on. It is
//     what one step is worth in the smallest ramp this family permits: a ramp whose top class only
//     just clears 3:1 against the ground, with its `classes` gaps evenly spent. A step under it is
//     a step the ramp gave away.
//
// WHY `assertRampReads` IS REPLACED HERE RATHER THAN WIDENED. Its own step rule is the same wrong
// unit: `0.02` of luminance between neighbours. On the ramp this file now derives for a `#FFFFFF`
// ground and a `#B2182B` accent the smallest step is 0.0188 of luminance and **1.221:1** of
// contrast — legible, and refused; while `0.02` at the light end of that same ramp would pass a
// step of 1.02:1 that nobody can see. Widening the number cannot fix a quantity that means two
// different things at two ends of one ramp. `assertRampReads` is left byte-identical because
// sixteen files carry it under `@parity` and the symbol, hex and forest cores still call it; a
// choropleth calls `assertSurfacesRead`, which measures the same three things about the ramp
// (fold-back, step, top against the ground) in the unit the eye works in, and the surfaces too.

/** The neutral axis a no-data surface travels: black through this family's own mid-grey to white. */
export const NO_DATA_AXIS = ["#000000", "#B9B9B9", "#FFFFFF"] as const;

/** The blue axis a water tint travels. Rule 7 is a rule about HUE ("water is a blue tint, never
 *  grey"), so the hue is what stays fixed here while the luminance is what the palette moves.
 *
 *  THE DARK POLE IS A NAVY, NOT BLACK, and that is measured rather than chosen: a sea derived on a
 *  `#16191B` ground now lands at 0.0215 relative luminance, and the old `#000000 → #AAC9E0` axis
 *  carries only 0.043 of chroma down there — under `MIN_CHROMA`, which is this file's own floor for
 *  "does this read as a hue at all". The same slot on `#001B33 → #AAC9E0` carries 0.200. The old
 *  axis could not paint a dark sea that was still blue, so it painted a grey one. */
export const WATER_AXIS = ["#001B33", "#AAC9E0", "#FFFFFF"] as const;

/** The floor between two surfaces that differ in KIND — a region with a reading against a region
 *  with none, or either of them against the sea. WCAG 2.2 SC 1.4.11 Non-text Contrast, the same
 *  3:1 `assertRampReads` holds the top class to against the ground. */
export const KIND_FLOOR = 3;

/** The floor between two surfaces of the same kind that a reader ORDERS — two adjacent classes, or
 *  a surface against the page ground behind it. DERIVED, not typed: it is one step of the smallest
 *  ramp this family permits, the one whose top class only just reaches `KIND_FLOOR` against the
 *  ground with its `classes` gaps spent evenly. Six classes → 1.2009:1; four → 1.3161:1; eight →
 *  1.1472:1. A ramp with more classes may take smaller steps because it has more of them, which is
 *  the relationship a typed constant could not have expressed. */
export function stepFloorFor(classes: number): number {
  return KIND_FLOOR ** (1 / classes);
}

/** The smallest channel spread that reads as a HUE rather than as a printing artefact. Measured on
 *  the two colours this decision is about: this family's own water blue `#AAC9E0` carries 0.212, and
 *  any neutral grey carries exactly 0. */
export const MIN_CHROMA = 0.05;

/** How far a colour's channels spread — 0 for any grey, 0.212 for `#AAC9E0`. The cheap, exact
 *  measure of "does this read as a hue at all", which is the only question asked of it here. */
export function chromaOf(hex: string): number {
  const rgb = channels(hex);
  return (Math.max(...rgb) - Math.min(...rgb)) / 255;
}

/** The colour on `axis` whose relative luminance is `target`, found by bisection.
 *
 *  Bisection rather than an inverse formula because the axis is a mix of two REAL colours and its
 *  luminance is not linear in the mix ratio. Forty halvings is far past the precision of an 8-bit
 *  channel. */
export function alongAxis(axis: readonly string[], target: number): string {
  const [dark, mid, light] = axis;
  const [from, to] = target <= luminanceOf(mid!) ? [dark!, mid!] : [mid!, light!];
  let low = 0;
  let high = 1;
  for (let i = 0; i < 40; i++) {
    const at = (low + high) / 2;
    if (luminanceOf(mixHex(from, to, at)) < target) low = at;
    else high = at;
  }
  return mixHex(from, to, (low + high) / 2);
}

/** A neutral surface at this luminance. */
export function greyAt(luminance: number): string {
  return alongAxis(NO_DATA_AXIS, luminance);
}

/** A blue surface at this luminance. */
export function blueAt(luminance: number): string {
  return alongAxis(WATER_AXIS, luminance);
}

/** The luminance that measures exactly `ratio` against `from`, on the side `away` points to.
 *  `away` is +1 to move lighter and -1 to move darker; the answer can fall outside 0..1, which is
 *  how a caller learns there is no room left on that side. */
export function luminanceAtContrast(from: number, ratio: number, away: number): number {
  return away > 0 ? (from + 0.05) * ratio - 0.05 : (from + 0.05) / ratio - 0.05;
}

/** EVERY DISTINCT 8-BIT COLOUR an axis can actually paint, darkest first.
 *
 *  The arithmetic answer and the paintable answer are not the same thing: a channel is eight bits,
 *  and a colour that lands one step the wrong side of a floor is a promise a derivation made and did
 *  not keep. So nothing here computes a target luminance and trusts it — the derivation picks from
 *  the colours that exist, and every floor below is measured on the finished hex. */
function paintable(mix: (at: number) => string): string[] {
  const seen: string[] = [];
  for (let i = 0; i <= 1024; i++) {
    const hex = mix(i / 1024);
    if (hex !== seen[seen.length - 1]) seen.push(hex);
  }
  return seen.sort((a, b) => luminanceOf(a) - luminanceOf(b));
}

/** THE NEAREST REAL COLOUR ON `axis` THAT CLEARS `ratio` AGAINST `from`, walking away from it in
 *  the direction `away` (+1 lighter, -1 darker) and stopping at the first one that holds.
 *
 *  Nearest, not furthest: every scrap of range this surface does not spend is range the next floor
 *  below it gets to spend. `null` when the axis runs out before the floor is reached — a refusal for
 *  the caller to report with its own number, never a colour to fall back to. */
function firstBeyond(
  axis: readonly string[],
  from: string,
  ratio: number,
  away: number,
  minChroma = 0,
): string | null {
  const rungs = paintable((at) => alongAxis(axis, at));
  const walk = away > 0 ? rungs : [...rungs].reverse();
  for (const hex of walk) {
    if (away > 0 ? luminanceOf(hex) <= luminanceOf(from) : luminanceOf(hex) >= luminanceOf(from))
      continue;
    if (contrastOf(hex, from) >= ratio && chromaOf(hex) >= minChroma) return hex;
  }
  return null;
}

/** The same walk along the ramp's OWN axis — the mix from the ground to the far end this beat's
 *  accent reaches — rather than along a neutral or blue one. It cannot walk past the far end,
 *  because the mix that produced the rungs stops there. */
function firstBeyondOnRamp(
  ground: string,
  end: string,
  from: string,
  ratio: number,
  away: number,
): string | null {
  const rungs = paintable((at) => mixHex(ground, end, at));
  const walk = away > 0 ? rungs : [...rungs].reverse();
  for (const hex of walk) {
    if (away > 0 ? luminanceOf(hex) <= luminanceOf(from) : luminanceOf(hex) >= luminanceOf(from))
      continue;
    if (contrastOf(hex, from) >= ratio) return hex;
  }
  return null;
}

/** The colour on the ground→end mix whose relative luminance is `target`. Bisection, for the same
 *  reason `alongAxis` uses it: `mixHex` is linear in the channels and luminance is not. */
function alongMix(ground: string, end: string, target: number): string {
  const rising = luminanceOf(end) > luminanceOf(ground);
  let low = 0;
  let high = 1;
  for (let i = 0; i < 40; i++) {
    const at = (low + high) / 2;
    const value = luminanceOf(mixHex(ground, end, at));
    if (rising ? value < target : value > target) low = at;
    else high = at;
  }
  return mixHex(ground, end, (low + high) / 2);
}

/** The direction, away from the ground, that this beat's data travels in. */
function awayFromGround(ground: string, end: string): number {
  return luminanceOf(end) > luminanceOf(ground) ? 1 : -1;
}

/** The sea, given only the page and how many classes the ramp will have. */
function waterAt(ground: string, classes: number, away: number): string {
  const hex = firstBeyond(WATER_AXIS, ground, stepFloorFor(classes), away, MIN_CHROMA);
  if (hex === null)
    throw new Error(
      `no sea can be derived on the ground ${ground}: the water axis runs out before a tint that is ` +
        `both ${stepFloorFor(classes).toFixed(3)}:1 clear of this page and still carries ` +
        `${MIN_CHROMA} of chroma.`,
    );
  return hex;
}

/** The no-data fill, one step past the sea. */
function noDataAt(ground: string, classes: number, away: number): string {
  const hex = firstBeyond(
    NO_DATA_AXIS,
    waterAt(ground, classes, away),
    stepFloorFor(classes),
    away,
  );
  if (hex === null)
    throw new Error(
      `no no-data fill can be derived on the ground ${ground}: the neutral axis runs out before a ` +
        `grey ${stepFloorFor(classes).toFixed(3)}:1 clear of the sea derived for it.`,
    );
  return hex;
}

/** THE SEA, the first surface off the page.
 *
 *  It recedes toward the page ground rather than standing between the no-data fill and the classes,
 *  because the sea is the thing on this map a reader least needs to look at and the argument should
 *  keep the room. One step of this ramp's own kind clear of the page — enough that it is a surface
 *  and not the page showing through, and not one rung more, because every rung it does not spend is
 *  a rung the surfaces above it get.
 *
 *  It must still read as WATER — `MIN_CHROMA` of blue, which is rule 7 ("water is a blue tint,
 *  never grey") measured rather than asserted, and the reason `WATER_AXIS` carries a navy at its
 *  dark pole rather than black. */
export function waterFor(ramp: string[], ground: string): string {
  return waterAt(ground, ramp.length, awayFromGround(ground, ramp[ramp.length - 1]!));
}

/** THE FILL FOR A REGION WITH NO READING: one step past the sea, on the neutral axis.
 *
 *  Below the first class, because a region with no value is nearer to bare ground than to any
 *  reading, and every class above the first is further still. Neutral always: the sea carries the
 *  hue and this carries none, so the two differ in KIND as well as in luminance, and a reader who
 *  cannot use hue still has the step between them. */
export function noDataFor(ramp: string[], ground: string): string {
  return noDataAt(ground, ramp.length, awayFromGround(ground, ramp[ramp.length - 1]!));
}

/** WHAT A SCALE OF `classes` CLASSES COSTS, end to end: one step from the page to the sea, one from
 *  the sea to the no-data fill, `KIND_FLOOR` from there to the first class, and `classes - 1` steps
 *  between the classes. `stepFloorFor` shrinks as classes are added, so this FALLS as the ramp gets
 *  longer — a two-class map has to hold its two classes 1.732:1 apart and needs 15.6:1 of range,
 *  where nine classes need 10.1:1. Fewer classes is the harder ask, not the easier one, and the
 *  refusals below say so with the count that would fit. */
export function rangeOwedFor(classes: number): number {
  const floor = stepFloorFor(classes);
  return floor * floor * KIND_FLOOR * floor ** (classes - 1);
}

/** The shortest scale this much range can pay for, or null when none up to twelve classes can. */
export function classesThatFit(available: number): number | null {
  for (let n = 2; n <= 12; n++) if (rangeOwedFor(n) <= available) return n;
  return null;
}

/** THE RAMP, SPACED IN THE UNIT A READER SEES, AND STARTED WHERE THE SILENCES LEAVE OFF.
 *
 *  `sequentialRamp` spaces its classes evenly in the MIX RATIO, and a mix ratio is linear in the
 *  channels while contrast is not: on a `#16191B` ground with a `#D4A853` accent it spends 1.53:1
 *  on its first step and 1.28:1 on its last, and its low end crowds against the ground — which is
 *  exactly the band the two surfaces that are NOT the data have to live in. Its low end was
 *  therefore a typed constant (`0.20`, raised once from `0.10`, and short of the old rule by 0.0015
 *  on this newsroom's own ground). Nothing here is typed.
 *
 *  The walk goes UP, from the page: sea, then no-data fill, then the FIRST CLASS at `KIND_FLOOR`
 *  above the no-data fill — so the gap the owner saw fail is a floor the ramp is built on rather
 *  than a leftover it inherits — then each class the smallest step that still clears
 *  `stepFloorFor(classes)`, and the last class is the far end the accent actually reaches, so the
 *  newsroom's own colour is spent at full strength on the class the argument is made with.
 *
 *  Every floor is met on the FINISHED 8-BIT HEX, never on an arithmetic target, so the leftover of
 *  a palette's range gathers in one place: the last step, into the accent's own end. It cannot fold
 *  back — each class is derived from the last in one direction — and it refuses rather than
 *  crowding, with the bill itemised. */
export function contrastRamp(
  ground: string,
  end: string,
  classes: number,
  where = "this ramp",
): string[] {
  if (classes < 2)
    throw new Error(`${where}: a ramp needs at least two classes, got ${classes}`);
  const floor = stepFloorFor(classes);
  // THE WHOLE BILL, BEFORE THE FIRST CLASS IS PLACED. Between the page ground and the far end this
  // accent reaches, this beat has to fit: one step from the page to the sea, one from the sea to
  // the no-data fill, `KIND_FLOOR` from there to the first class, then `classes - 1` steps of the
  // ramp itself. A palette that cannot pay it is told what it has and what it costs, here, rather
  // than being handed a scale a reader cannot read.
  const available = contrastOf(end, ground);
  const owed = rangeOwedFor(classes);
  const fits = classesThatFit(available);
  const advice =
    fits === null
      ? `No class count up to twelve fits this range. Record an accent with more room against this ` +
        `ground, or change the ground.`
      : `${fits} classes would fit, at ${rangeOwedFor(fits).toFixed(3)}:1 — a longer ramp is the ` +
        `CHEAPER ask here, because one step of it is worth less.`;
  if (available < owed)
    throw new Error(
      `${where}: the ground ${ground} and this accent's far end ${end} are ${available.toFixed(3)}:1 ` +
        `apart, and a ${classes}-class choropleth needs ${owed.toFixed(3)}:1 — short by ` +
        `${(owed / available).toFixed(3)}x. The bill: ${floor.toFixed(3)}:1 from the page to the sea, ` +
        `${floor.toFixed(3)}:1 from the sea to a region that filed nothing, ${KIND_FLOOR}:1 from there ` +
        `to the first class, ${(floor ** (classes - 1)).toFixed(3)}:1 for the ${classes - 1} steps ` +
        `between classes. ${advice}`,
    );
  const away = awayFromGround(ground, end);
  const first = firstBeyondOnRamp(ground, end, noDataAt(ground, classes, away), KIND_FLOOR, away);
  if (first === null)
    throw new Error(
      `${where}: no first class can be derived. The ground ${ground} and the far end ${end} are ` +
        `${available.toFixed(3)}:1 apart and this scale owes ${owed.toFixed(3)}:1; the shortfall is ` +
        `what 8-bit colour costs on top of the arithmetic.`,
    );
  // The two ends are now pinned — the first class by what the silences below it need, the last by
  // the colour the accent actually reaches — so the classes between them are spread EVENLY IN
  // CONTRAST rather than taken greedily. A greedy walk leaves all of a palette's leftover range in
  // whichever step happens to be last: on a `#0B0B0B` ground with an `#E8E8E8` accent that was
  // 1.20:1 for four steps and 1.84:1 for the fifth, one visible jump in a scale that is supposed to
  // read as one quantity.
  // TWO WAYS TO SPEND WHAT IS LEFT, and the roomier one is tried first.
  //
  //   EVENLY. The two ends are pinned — the first class by what the silences below it need, the
  //   last by the colour the accent actually reaches — so the classes between them go at even
  //   ratios. A ramp is one quantity, and a step that is twice its neighbour reads as a break in it.
  //
  //   PACKED. When a palette has so little range that 8-bit rounding eats the surplus, every class
  //   takes the SMALLEST step that still clears the floor, from the bottom up. Greedy-minimum is
  //   not a nicer ramp; it is the one that exists. Each class placed as low as it may be leaves the
  //   most room for every class above it, so if any arrangement clears the floors this one does.
  //
  // Both are measured on the finished 8-bit hexes, and the packed one is only reached when the even
  // one comes back short. A palette that fails both is refused with the number it failed by.
  const evenly = (): string[] => {
    const each = contrastOf(end, first) ** (1 / (classes - 1));
    const ramp: string[] = new Array(classes);
    ramp[0] = first;
    ramp[classes - 1] = end;
    for (let i = classes - 2; i >= 1; i--) {
      const target = luminanceAtContrast(luminanceOf(first), each ** i, away);
      const hex = alongMix(ground, end, target);
      ramp[i] =
        contrastOf(hex, ramp[i + 1]!) >= floor
          ? hex
          : (firstBeyondOnRamp(ground, end, ramp[i + 1]!, floor, -away) ?? hex);
    }
    return ramp;
  };
  const packed = (): string[] => {
    const ramp = [first];
    for (let i = 1; i < classes - 1; i++) {
      const next = firstBeyondOnRamp(ground, end, ramp[i - 1]!, floor, away);
      if (next === null) return ramp.concat(end);
      ramp.push(next);
    }
    return ramp.concat(end);
  };
  const shortSteps = (ramp: string[]) =>
    ramp
      .slice(1)
      .map((hex, i) => [i + 1, contrastOf(hex, ramp[i]!)] as const)
      .filter(([, seen]) => seen < floor);
  let ramp = evenly();
  let short = shortSteps(ramp);
  if (short.length > 0) {
    ramp = packed();
    short = shortSteps(ramp);
  }
  if (ramp.length !== classes || short.length > 0)
    throw new Error(
      `${where}: ${short
        .map(([i, seen]) => `the step from class ${i} to class ${i + 1} measures ${seen.toFixed(3)}:1`)
        .join(", ")}, under the ${floor.toFixed(3)}:1 one step of a ${classes}-class ramp is worth. ` +
        `The ground ${ground} and the far end ${end} are ${available.toFixed(3)}:1 apart against the ` +
        `${owed.toFixed(3)}:1 this scale owes — the arithmetic fits and 8-bit colour does not. ` +
        `${classes < 12 ? `Ask for ${classes + 1} classes: one step of a longer ramp is worth less, so the same range pays for more of them.` : "Record an accent with more room against this ground."}`,
    );
  return ramp;
}

/** CAN A READER TELL THESE FOUR KINDS OF SURFACE APART? Every pair of them, measured in contrast.
 *
 *  The readings, each returned with the number that failed and what it needed:
 *
 *   1. the ramp never folds back — two classes at one lightness are one class to a reader;
 *   2. two adjacent classes clear `stepFloorFor(classes)` — they are ordered, and read against a
 *      legend, so they need a step rather than a kind;
 *   3. the top class clears `KIND_FLOOR` against the ground — the class the argument is made with;
 *   4. the no-data fill clears `KIND_FLOOR` against EVERY class, not only the nearest. This is the
 *      reading the old luminance-gap rule could not make, and the one the owner made by eye;
 *   5. the sea clears `KIND_FLOOR` against every class, for the same reason one level down: a
 *      coastal country in the lowest class must not dissolve into the water beside it;
 *   6. each surface clears `stepFloorFor(classes)` against the page ground — a surface a reader
 *      cannot tell from the page is not a surface;
 *   7. the sea and the no-data fill clear `stepFloorFor(classes)` against EACH OTHER, or one of
 *      them carries a hue and the other does not. Which of the two carried it is named in the
 *      reading, so a page separated by hue alone is visible in the verdict rather than silent.
 *
 *  Returns every failure rather than the first, because a palette that fails one of these usually
 *  fails three, and a journalist who is shown them one at a time changes their ground three times. */
export function surfaceReadings(
  ramp: string[],
  ground: string,
  surfaces: { noData: string; water: string },
): string[] {
  const out: string[] = [];
  const step = stepFloorFor(ramp.length);
  const lightness = ramp.map(luminanceOf);
  const rising = lightness[lightness.length - 1]! > lightness[0]!;
  for (let i = 1; i < ramp.length; i++) {
    if (rising !== lightness[i]! - lightness[i - 1]! > 0) {
      out.push(
        `class ${i + 1} (${ramp[i]}) turns back on class ${i} (${ramp[i - 1]}) — the ramp runs ` +
          `${rising ? "lighter" : "darker"} everywhere else, so a reader has no ordering here.`,
      );
      continue;
    }
    const seen = contrastOf(ramp[i]!, ramp[i - 1]!);
    if (seen < step)
      out.push(
        `classes ${i} (${ramp[i - 1]}) and ${i + 1} (${ramp[i]}) measure ${seen.toFixed(3)}:1 ` +
          `against each other, under the ${step.toFixed(3)}:1 one step of a ${ramp.length}-class ` +
          `ramp is worth. They will read as one class.`,
      );
  }
  const top = contrastOf(ramp[ramp.length - 1]!, ground);
  if (top < KIND_FLOOR)
    out.push(
      `the top class ${ramp[ramp.length - 1]} measures ${top.toFixed(2)}:1 against the ground ` +
        `${ground}, under the ${KIND_FLOOR}:1 floor WCAG 2.2 SC 1.4.11 sets for a graphical object. ` +
        `The class carrying this map's argument cannot be seen.`,
    );
  const named: [string, string][] = [
    ["the no-data fill", surfaces.noData],
    ["the sea", surfaces.water],
  ];
  for (const [name, hex] of named) {
    let worst = Infinity;
    let worstAt = 0;
    ramp.forEach((klass, index) => {
      const seen = contrastOf(hex, klass);
      if (seen < worst) {
        worst = seen;
        worstAt = index;
      }
    });
    if (worst < KIND_FLOOR)
      out.push(
        `${name} ${hex} measures ${worst.toFixed(2)}:1 against class ${worstAt + 1} ` +
          `(${ramp[worstAt]}), under the ${KIND_FLOOR}:1 floor WCAG 2.2 SC 1.4.11 sets for a ` +
          `graphical object. A reader has to be able to see that this is not a reading — it is the ` +
          `opposite of one. Derive it with noDataFor/waterFor from a ramp derived with contrastRamp, ` +
          `which leaves the band below the first class wide enough for both.`,
      );
    const page = contrastOf(hex, ground);
    if (page < step)
      out.push(
        `${name} ${hex} measures ${page.toFixed(3)}:1 against the ground ${ground}, under the ` +
          `${step.toFixed(3)}:1 a surface needs to be a surface rather than the page showing through.`,
      );
  }
  const apart = contrastOf(surfaces.noData, surfaces.water);
  const hues = [chromaOf(surfaces.noData), chromaOf(surfaces.water)];
  if (apart < step && Math.abs(hues[0]! - hues[1]!) < MIN_CHROMA)
    out.push(
      `the no-data fill ${surfaces.noData} and the sea ${surfaces.water} measure ${apart.toFixed(3)}:1 ` +
        `against each other — under the ${step.toFixed(3)}:1 two surfaces of one kind need — and ` +
        `${Math.abs(hues[0]! - hues[1]!).toFixed(3)} apart in chroma, under the ${MIN_CHROMA} that ` +
        `reads as a hue. A reader cannot tell a country with no reading from the sea by either ` +
        `channel (rule 7: water is a blue tint, never grey).`,
    );
  return out;
}

/** The one decision a choropleth asks about its colours, and it throws with every failed reading at
 *  once. `assertRampReads` is NOT called here and is not called by a choropleth at all — see the
 *  note at the head of this section for the measurement that replaced it. */
export function assertSurfacesRead(
  ramp: string[],
  ground: string,
  surfaces: { noData: string; water: string },
  where = "this beat",
): { noData: string; water: string } {
  const readings = surfaceReadings(ramp, ground, surfaces);
  if (readings.length > 0)
    throw new Error(`${where}: ${readings.join("\n  · ")}`);
  return surfaces;
}

// ── Can a reader actually POINT at the marks this beat gives a pointer target to? ──────────────

/** THE POINTER TARGET'S OWN DIAMETER, in CSS pixels — `ChoroplethWeb.tsx`'s `HIT_TARGET_PX`, stated
 *  here rather than imported because this file imports nothing. If it changes there, it changes
 *  here, deliberately. */
export const POINTER_TARGET_PX = 28;

/**
 * EVERY POINTER-ACTIVE MARK WHOSE OWN TARGET IS COVERED BY A NEIGHBOUR'S, at a given drawn width.
 *
 * THE DEFECT THIS NAMES, measured live on a 241-region world choropleth (2026-08-22) by the driver
 * that could finally reach it: 143 of the 241 marks fall under the small-region threshold and so
 * keep a pointer-active `.pt` button, and at 1600x900 — where the map draws 898px wide — **82 of
 * those 143 have another mark's 28px disc on top of their own centre**. `document.elementFromPoint`
 * at Monaco's centre returns Vatican City's button; at Lithuania's, Latvia's. At 375px it is worse
 * still. A reader with JavaScript off cannot point at them, and nothing measured it: the format's
 * own driver asserted the SYMBOL seed's invariant, whose thirteen points are nowhere near each
 * other.
 *
 * IT IS NOT FIXED BY REMOVING THE BUTTON, and that is why this decision REPORTS rather than filters.
 * The `.pt` button is also the KEYBOARD target and the carrier of the `aria-label` — the two
 * channels this format's accessibility answer actually rests on, and both are complete on that beat
 * (Tab reaches all 241, and the table carries all 241). Dropping a colliding button would trade a
 * partial pointer path for a broken keyboard path, which is the wrong trade for the reader who has
 * the least.
 *
 * So the honest answer is the one this project's own rule prescribes for a limit that cannot be
 * removed: the beat SAYS SO. The producer prints this count at render time, at the widths the beat
 * will be read at, and a reader who cannot land a pointer on Monaco is told the table and the
 * keyboard carry it. `x`/`y` are FRAME units; `drawnWidthPx` is what the map is actually drawn at,
 * because the same map at 375px and at 1600px is not the same question.
 */
export function collidingPointerTargets(
  targets: { key: string; x: number; y: number }[],
  frame: Frame,
  drawnWidthPx: number,
  targetPx: number = POINTER_TARGET_PX,
): string[] {
  if (!(drawnWidthPx > 0) || !(frame.width > 0)) return [];
  // The target's own radius, expressed in the frame's units — a fixed CSS size seen from the
  // geometry's side. This is the whole reason the answer changes with the container.
  const radius = ((targetPx / 2) * frame.width) / drawnWidthPx;
  const covered: string[] = [];
  for (const one of targets) {
    const over = targets.some(
      (other) => other.key !== one.key && Math.hypot(other.x - one.x, other.y - one.y) < radius,
    );
    if (over) covered.push(one.key);
  }
  return covered;
}

// ── The marks this camera draws SMALLER THAN A PIXEL, which no pointer can reach at all ────────

/**
 * EVERY MARK THIS CAMERA DRAWS NO PIXEL OF ITS OWN FOR, at a given drawn width.
 *
 * THE MEASUREMENT THIS EXISTS FOR, and it overturned the decision above rather than extending it.
 * `collidingPointerTargets` answers "whose 28px button is buried under a neighbour's", and a ruling
 * was written to replace it with a live invariant about `queryRenderedFeatures`. Driven with a real
 * key against the committed 241-region world beat, that invariant was red for 90 of 241 marks at
 * 1600x900 and 149 of 241 at 375x667, and no layout, bake or camera change this format can make
 * turns it green. The reason is not collision:
 *
 *     at 1600x900 the live map draws 896px for 360° of longitude, so ONE PIXEL IS ABOUT 26 KM AND
 *     MONACO IS ABOUT A THIRTEENTH OF ONE.
 *
 * A mark smaller than a pixel has NO pointer path and no target engineering creates one — not a
 * colliding path, none. Of the 105 marks a neighbour's button covers on that beat, 46 are not served
 * by the live pointer either. So the collision was never the problem, and this is the fact the beat
 * is owed instead: a count, and the names, at the widths it will be read at.
 *
 * THE READING IS THE LIVE PROBE'S OWN, done in arithmetic instead of in a browser. A mark is
 * reachable when the map draws it a pixel it OWNS WITH A PIXEL TO SPARE — that pixel plus its four
 * neighbours — which is exactly the discipline `scripts/verify-live-map.mjs` walks its own grid
 * under, and for the same reason: a probe whose own rounding decides the verdict measures rounding,
 * not the map. The scan is a scanline over integer pixel rows, even-odd across the rings, which is
 * the rule the delivered `<path class="region" fill-rule="evenodd">` is painted under.
 *
 * MEASURED AGAINST THE LIVE PROBE, on that beat, at the three canvas widths the browser actually
 * gave it (896 / 640 / 263 px, from containers of 1600x900, 1024x768 and 375x667):
 *
 *     this function   85    96   147
 *     the live map    90    99   149
 *
 * — 6, 5 and 3 marks apart out of 241. What it cannot see is DRAW ORDER: `queryRenderedFeatures`
 * answers with the TOPMOST feature, so the Netherlands and New Zealand read as reachable here and as
 * unreachable live. The live probe is the authority; this is the same answer without a browser, so a
 * producer gets it at render time rather than after a run they may never make.
 *
 * IT REPORTS, IT DOES NOT FILTER, for the reason `collidingPointerTargets` gives above and one more:
 * the marks it names are exactly the ones whose only remaining paths are the KEYBOARD and the
 * ACCESSIBLE TABLE. `scripts/detect-stranded-marks.mjs` is where that becomes a refusal.
 *
 * `rings` are FRAME units; `drawnWidthPx` is what the map is actually drawn at, because the same map
 * at 375px and at 1600px is not the same question.
 */
export function marksWithNoPointerPath(
  shapes: { key: string; rings: Ring[] }[],
  frame: Frame,
  drawnWidthPx: number,
): string[] {
  if (!(drawnWidthPx > 0) || !(frame.width > 0)) return [];
  const scale = drawnWidthPx / frame.width;
  return shapes.filter((shape) => !ownsAPixelWithASpare(shape.rings, scale)).map((shape) => shape.key);
}

/** The x-coordinates, in drawn pixels, where a scanline at `y` crosses this shape's rings, paired
 *  into the spans that are INSIDE it under the even-odd rule. A half-open vertical test
 *  (`y >= from`, `y < to`) so a vertex shared by two edges is counted once, not twice. */
function spansAcross(rings: Ring[], y: number, scale: number): [number, number][] {
  const crossings: number[] = [];
  for (const ring of rings)
    for (let i = 0; i < ring.length; i++) {
      const from = ring[i]!;
      const to = ring[(i + 1) % ring.length]!;
      const fromY = from[1] * scale;
      const toY = to[1] * scale;
      if (fromY === toY) continue;
      if (y < Math.min(fromY, toY) || y >= Math.max(fromY, toY)) continue;
      const along = (y - fromY) / (toY - fromY);
      crossings.push(from[0] * scale + along * (to[0] * scale - from[0] * scale));
    }
  crossings.sort((one, other) => one - other);
  const spans: [number, number][] = [];
  for (let i = 0; i + 1 < crossings.length; i += 2) spans.push([crossings[i]!, crossings[i + 1]!]);
  return spans;
}

/** Does this shape own one whole pixel AND its four neighbours? Walked row by row over the shape's
 *  own bounding box, one row further out on every side so a shape that rounds outward is not cut
 *  off by the box that describes it. */
function ownsAPixelWithASpare(rings: Ring[], scale: number): boolean {
  const box = boundingBoxOf(rings);
  if (!Number.isFinite(box.minX)) return false;
  const rows = new Map<number, [number, number][]>();
  const rowAt = (y: number): [number, number][] => {
    let spans = rows.get(y);
    if (!spans) {
      spans = spansAcross(rings, y, scale);
      rows.set(y, spans);
    }
    return spans;
  };
  const inside = (spans: [number, number][], x: number) =>
    spans.some(([from, to]) => x >= from && x <= to);
  const firstX = Math.floor(box.minX * scale) - 1;
  const lastX = Math.ceil(box.maxX * scale) + 1;
  for (let y = Math.floor(box.minY * scale) - 1; y <= Math.ceil(box.maxY * scale) + 1; y++) {
    const row = rowAt(y);
    if (row.length === 0) continue;
    for (let x = firstX; x <= lastX; x++) {
      if (!inside(row, x)) continue;
      if (
        inside(row, x - 1) &&
        inside(row, x + 1) &&
        inside(rowAt(y - 1), x) &&
        inside(rowAt(y + 1), x)
      )
        return true;
    }
  }
  return false;
}

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
// ── Geometry: baked pixel rings become one path ────────────────────────────────────────────────

/** Every ring closed, holes as further subpaths for `fill-rule="evenodd"` to cut out. 
 *  @parity */
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

/**
 * Thin a projected ring to the resolution it will actually be drawn at: keep a point only once it
 * is `minGap` pixels from the last one kept, and always keep the last. Never below three points — a
 * ring thinned into a sliver is worse than a ring left alone.
 */
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

/**
 * Whether a projected ring is worth drawing at all. `geo-discipline.md` rule 11: drop what never
 * enters the frame, and distrust what is several times wider than it — that is not a big country,
 * it is two coordinates either side of ±180° joined into a streak across the map.
 *
 * This function decides per-RING, never after flattening a shape's rings across different
 * MultiPolygon PARTS into one undifferentiated list ahead of that decision — the trap named in
 * `geo-discipline.md` rule 11's own warning (a flattened ring list can misread one island's own
 * outer boundary as a hole of another part). This beat avoids that trap the same way
 * `map-beat/scripts/bake-plate.mjs`'s own `ringsOf` and `mapmore-flow-danube/geo-flow.ts`'s
 * own `pointInGeometry` do: `bake-plate.mjs` in THIS folder keeps every shape's rings — flattened
 * across a MultiPolygon's own parts, but never across two DIFFERENT shapes — because the drawing
 * path below fills with `fill-rule="evenodd"`, which sums ray-crossings across every subpath
 * regardless of which part it came from and therefore does not need outer/hole GROUPING preserved
 * to fill correctly; only an algorithm that explicitly decomposes `[outer, ...holes]` per part (a
 * true point-in-polygon test, which this beat does not need — hit-testing here is the browser's own
 * native `<path>` hit-test, not a hand-rolled ray cast) would misread an island for a hole if it
 * flattened first.
 
 *  @parity */
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

// ── Reading order / hit targets ───────────────────────────────────────────────────────────────

/** Highest value first — the one order this beat's map (DOM order, so Tab/Home/End reach it in
 *  this order too), the accessible table, and the keyboard all share
 *  (`references/map-web-discipline.md`, "The accessibility question": "nobody gets a DIFFERENT map
 *  depending on how they read it, only a different medium for the same one"). 
 *  @parity-exempt: each beat reads its own data in its own order — value on a choropleth, population on a dot map, ascending priority on a locator. Four sorts, four beats, not four drifts. */
export function readingOrder<T extends { value: number }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => b.value - a.value);
}

export type BBox = { minX: number; maxX: number; minY: number; maxY: number };

/** The bounding box across every ring of a shape — used only to decide whether a shape's own
 *  filled path is a fair pointer target, never to decide outer-vs-hole (see `keepRing`'s own
 *  doc-comment for that distinction). */
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

/** English number formatting — one decimal place by default, this beat's own single formatter
 *  (called by the map, the legend and the accessible table alike, never re-derived a second time —
 *  the same "one formatting, in one place" rule `references/map-web-discipline.md` states for
 *  `pointDetail` in the symbol-map seed). 
 *  @parity */
export function en(value: number, decimals = 1): string {
  return new Intl.NumberFormat("en-GB", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}
