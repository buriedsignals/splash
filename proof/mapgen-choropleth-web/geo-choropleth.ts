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
 * The pure half of THIS beat: the join, the classes, the ramp, the ring arithmetic. No browser, no
 * rasteriser — this is what makes the join testable at all, and what lets the bake step (node) and
 * a test import it without either dragging a browser's runtime behind it.
 *
 * This is this beat's OWN physical copy of the relevant pieces of `map-beat/assets/geo.ts`
 * (`references/geo-discipline.md` rule 3's own header note: a beat carries its own copy, never an
 * import across proof/ beats or out of a skill — see `mapmore-flow-danube/geo-flow.ts`'s header for
 * the same rule stated there). Trimmed to what a WEB beat needs: no `revealOrder` (that is this
 * project's own answer to `geo-discipline.md` rule 10, "a choropleth's reveal order is the value
 * order" — a rule about a VIDEO's time axis; a static SVG has no frames to reveal across). Kept:
 * `scalePosition`, because this beat's own legend still places two named marks (the subject and the
 * comparison) on one continuous scale beside the discrete class bar, the same way
 * `map-beat/assets/Co2MapStill.tsx` does.
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
 * This beat's declared study set — Natural Earth's `ADM0_A3` keys, not `ISO_A3`
 * (`geo-discipline.md` rule 5: France, Norway and Kosovo carry `ISO_A3 = "-99"` in that field;
 * `countries.geojson` in this folder does not even carry an `ISO_A3` property, so the trap is
 * structurally absent here, but the join below still names the field it uses, on purpose).
 *
 * Kosovo is deliberately NOT in this list. `countries.geojson` (copied verbatim from
 * `proof/mapmore-dot-population`) carries a `KOS` shape, and Our World in Data's own alias would be
 * `OWID_KOS`, but this beat's own declared study set simply never claims to include Kosovo — the
 * task this file was written against called that "honest": a beat's study set is its own declared
 * claim, and leaving a region out of the declared set entirely is a different, cleaner thing from
 * joining it via an alias.
 */
export const CO2_2023_STUDY = [
  "ALB",
  "AND",
  "AUT",
  "BEL",
  "BGR",
  "BIH",
  "BLR",
  "CHE",
  "CZE",
  "DEU",
  "DNK",
  "ESP",
  "EST",
  "FIN",
  "FRA",
  "FRO",
  "GBR",
  "GRC",
  "HRV",
  "HUN",
  "IRL",
  "ISL",
  "ITA",
  "LIE",
  "LTU",
  "LUX",
  "LVA",
  "MDA",
  "MKD",
  "MLT",
  "MNE",
  "NLD",
  "NOR",
  "POL",
  "PRT",
  "ROU",
  "SRB",
  "SVK",
  "SVN",
  "SWE",
  "UKR",
] as const;

/** Class boundaries in tonnes per person — the same six-class split
 *  `map-beat/assets/geo.ts`'s own `CO2_BREAKS` uses for the same quantity (CO₂ per capita):
 *  under 2, then 2s, then 10 and over. Reused deliberately, not re-derived, because it is the same
 *  measured quantity and there is no reason for two different beats to draw two different class
 *  boundaries for it. */
export const CO2_BREAKS = [2, 4, 6, 8, 10];

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
  return [...values.keys()].filter((key) => !reachable.has(key) && !declared.has(key));
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

// ── The two surfaces that are NOT the data, derived from the same palette the ramp is ──────────
//
// THE DEFECT THIS CLOSES, and it is the owner's own words: *"it has to adapt to the palette."*
//
// These two used to be fixed hexes, with a docstring arguing that fixing them is what makes a
// no-data reading "stay recognisable across every newsroom's own ground colour". Measured on this
// format's OWN two shipped grounds, that claim is false in both directions:
//
//   light ground `#FFFFFF`, accent `#B2182B` — ramp 0.815 0.598 0.421 0.283 0.177 0.101
//     the fixed no-data grey `#B9B9B9` is 0.485 → between class 2 and class 3
//     the fixed water tint  `#AAC9E0` is 0.557 → between class 2 and class 3
//   dark ground `#16191B`, accent `#D4A853` — ramp 0.052 0.109 0.191 0.300 0.442 0.616
//     `#B9B9B9` 0.485 → between class 5 and class 6
//     `#AAC9E0` 0.557 → brighter than five of the six classes, on a map whose ocean is most of the
//     picture, so the SEA was the loudest thing on a map about land
//
// A country with NO READING was therefore painted at the luminance of a real class, on every beat
// this format has shipped. `assertRampReads` measures the ramp against the GROUND and has never
// measured these two against the RAMP.
//
// THE TWO OLD CONSTANTS ARE NOT DELETED — they become the MIDPOINT of the axis each colour now
// travels along, so the derivation passes through the value this family already used and the
// palette decides where on that axis it lands. `greyAt(0.485)` is `#B9B9B9`; `blueAt(0.557)` is
// `#AAC9E0`.

/** The neutral axis a no-data surface travels: black through this family's own mid-grey to white. */
export const NO_DATA_AXIS = ["#000000", "#B9B9B9", "#FFFFFF"] as const;

/** The blue axis a water tint travels: black through this family's own water blue to white. Rule 7
 *  is a rule about HUE ("water is a blue tint, never grey"), and the hue is what stays fixed here
 *  while the luminance is what the palette moves. */
export const WATER_AXIS = ["#000000", "#AAC9E0", "#FFFFFF"] as const;

/** How far a surface that is not part of the ramp must sit from the nearest class before a reader
 *  can be sure it is not one. The SAME 0.02 relative luminance `assertRampReads` holds two adjacent
 *  classes apart by — one number for one question, rather than a second one tuned here. */
export const SURFACE_CLEARANCE = 0.02;

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

/**
 * THE ONE PLACE A SURFACE THAT IS NOT THE DATA CAN SIT: between the ground and the ramp's first
 * class.
 *
 * Everything from the first class to the last is the data, and a reader orders it. Everything past
 * the last class is further from the ground than the argument's own colour, which reads as more
 * than the maximum. What is left is the band the ramp deliberately does not start in — and that
 * band is exactly where "this is not a reading" belongs, because a region with no value is nearer
 * to bare ground than to any class.
 *
 * Both surfaces land at its MIDPOINT, which is the point furthest from both things they must not be
 * confused with, and they are told apart from each other by HUE — the channel that still has room
 * when the band is narrow. That is not a compromise: a grey country among tinted ones and a blue sea
 * are different in KIND, which is what rule 7 asks for.
 */
export function offRampLuminance(ramp: string[], ground: string): number {
  return (luminanceOf(ground) + luminanceOf(ramp[0]!)) / 2;
}

/** The no-data fill this ground and this ramp leave room for. */
export function noDataFor(ramp: string[], ground: string): string {
  return greyAt(offRampLuminance(ramp, ground));
}

/** The water tint this ground and this ramp leave room for. */
export function waterFor(ramp: string[], ground: string): string {
  return blueAt(offRampLuminance(ramp, ground));
}

/**
 * CAN A READER TELL THESE TWO FROM THE DATA, AND FROM EACH OTHER? The sibling `assertRampReads`
 * never had, and the reason it never had is that it measures the ramp against the GROUND while this
 * measures two surfaces against the RAMP.
 *
 * Three refusals, each with the number that failed:
 *   1. neither surface may sit inside the ramp's own luminance range, nor within `SURFACE_CLEARANCE`
 *      of either end — a no-data country painted at a class's luminance is a country a reader reads
 *      a value off, and that is worse than a bad join because nothing about it looks wrong;
 *   2. neither may sit within `SURFACE_CLEARANCE` of the ground, or it is not a surface at all;
 *   3. the two may not be confusable with each other: either `SURFACE_CLEARANCE` apart in luminance,
 *      or one of them carrying a real hue while the other does not.
 *
 * The band between the ground and the first class is what all three depend on, so a beat whose ramp
 * starts too close to its ground fails here and is told to raise the ramp's own low end — which is
 * the fix, and it is the fix the one beat that hit this made by hand before there was a guard.
 */
export function assertSurfacesRead(
  ramp: string[],
  ground: string,
  surfaces: { noData: string; water: string },
  where = "this beat",
): { noData: string; water: string } {
  const classes = ramp.map(luminanceOf);
  const low = Math.min(...classes);
  const high = Math.max(...classes);
  const groundLuminance = luminanceOf(ground);
  const named: [string, string][] = [
    ["the no-data fill", surfaces.noData],
    ["the water tint", surfaces.water],
  ];
  for (const [name, hex] of named) {
    const value = luminanceOf(hex);
    if (value > low - SURFACE_CLEARANCE && value < high + SURFACE_CLEARANCE) {
      const nearest = classes.reduce(
        (best, at, index) => (Math.abs(at - value) < Math.abs(classes[best]! - value) ? index : best),
        0,
      );
      throw new Error(
        `${where}: ${name} ${hex} measures ${value.toFixed(3)} relative luminance, inside this ramp's ` +
          `own range ${low.toFixed(3)}–${high.toFixed(3)} (nearest: class ${nearest + 1}, ${ramp[nearest]} ` +
          `at ${classes[nearest]!.toFixed(3)}). A reader would read it as a value. Derive it from the ` +
          `ground with noDataFor/waterFor, and if there is no room, raise the ramp's own low end so ` +
          `there is.`,
      );
    }
    if (Math.abs(value - groundLuminance) < SURFACE_CLEARANCE)
      throw new Error(
        `${where}: ${name} ${hex} is ${Math.abs(value - groundLuminance).toFixed(4)} from the ground ` +
          `${ground} in relative luminance, under the ${SURFACE_CLEARANCE} this family holds two ` +
          `surfaces apart by — it is not a surface, it is the ground. The band between this ground ` +
          `and the first class is ${Math.abs(luminanceOf(ramp[0]!) - groundLuminance).toFixed(4)} wide; ` +
          `it needs ${(SURFACE_CLEARANCE * 2).toFixed(2)}.`,
      );
  }
  const apart = Math.abs(luminanceOf(surfaces.noData) - luminanceOf(surfaces.water));
  const hues = named.map(([, hex]) => chromaOf(hex));
  if (apart < SURFACE_CLEARANCE && Math.abs(hues[0]! - hues[1]!) < MIN_CHROMA)
    throw new Error(
      `${where}: the no-data fill ${surfaces.noData} and the water tint ${surfaces.water} are ` +
        `${apart.toFixed(4)} apart in relative luminance and ${Math.abs(hues[0]! - hues[1]!).toFixed(3)} ` +
        `apart in chroma — a reader cannot tell a country with no reading from the sea. One of them ` +
        `has to carry a hue (rule 7: water is a blue tint, never grey).`,
    );
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
