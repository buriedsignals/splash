/**
 * The pure half of the map beat: the join, the classes, the ramp, the ring arithmetic.
 *
 * Nothing here knows about a browser, a tile, a key or a camera. That is deliberate on both sides:
 * it is what makes the join testable at all, and it is what lets BOTH formats import this file — the
 * still path (node + resvg) and the video path (Remotion + Chromium) — without either dragging the
 * other's runtime behind it. `chart-video`'s gotcha, one engine over: a module that reaches a
 * native rasteriser at import time cannot be bundled for a browser.
 *
 * It also means this file does NOT derive furniture colours. `deriveFurniture` owns the ink/muted/grid
 * rule and its contrast escalation, in this skill's own `scripts/render-still.mjs` (a copy of the
 * `chart-beat` original — a skill never imports another skill); the render scripts call it in
 * node and pass the result in. What lives here is the
 * ramp — a quantity encoding, which is a different thing — built on a plain hex mix.
 */

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
    if (char === "\r") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      i += text[i + 1] === "\n" ? 2 : 1;
      continue;
    }
    if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      i += 1;
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
 * The study set, as Natural Earth's `ADM0_A3` keys — the ISO A3 field is NOT the ISO A3 code
 * (`geo-discipline.md` rule 5: France, Norway and Kosovo carry `ISO_A3 = "-99"`).
 *
 * This is the beat DECLARING what it claims to show. Every key here must find a shape, and every
 * one must find a value or be declared below; both are checked, loudly.
 */
export const CO2_STUDY = [
  "ALB",
  "ALD",
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
  "GGY",
  "GRC",
  "HRV",
  "HUN",
  "IMN",
  "IRL",
  "ISL",
  "ITA",
  "JEY",
  "KOS",
  "LIE",
  "LTU",
  "LUX",
  "LVA",
  "MCO",
  "MDA",
  "MKD",
  "MLT",
  "MNE",
  "NLD",
  "NOR",
  "POL",
  "PRT",
  "ROU",
  "RUS",
  "SMR",
  "SRB",
  "SVK",
  "SVN",
  "SWE",
  "UKR",
  "VAT",
] as const;

/**
 * Shape key → data key, where the two sources disagree about a name.
 *
 * One entry, and it is the entry that matters: Our World in Data codes Kosovo `OWID_KOS`, Natural
 * Earth calls it `KOS`. Without this line Kosovo renders hatched on every European map, looks
 * entirely legitimate, and nobody notices.
 */
export const CO2_ALIAS: Record<string, string> = { KOS: "OWID_KOS" };

/**
 * The shapes this source genuinely does not report: Åland, the Channel Islands, the Isle of Man,
 * and the three micro-states. Declared, so that any OTHER shape arriving without a value is a bug
 * and throws.
 */
export const CO2_EXPECTED_NO_DATA = [
  "ALD",
  "GGY",
  "IMN",
  "JEY",
  "MCO",
  "SMR",
  "VAT",
] as const;

/** Class boundaries in tonnes per person. Six classes: under 2, then 2s, then 10 and over. */
export const CO2_BREAKS = [2, 4, 6, 8, 10];

// ── Reading the source ─────────────────────────────────────────────────────────────────────────

// A number a human wrote, and nothing else — mirrors `skills/intake/scripts/profile.mjs`'s own
// NUMERIC_RE/THOUSANDS_RE discipline for the same reason: `Number("0x1F")` is 31, and
// `Number("1,234.5")` is NaN, silently dropped by a bare `Number.isFinite` guard as if the country
// had no reading at all. Deliberately narrower than `Number()`, and never trusted before the
// regex. Not imported — no cross-skill runtime import — a plain copy of the same two shapes.
const NUMERIC_RE = /^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i;
const THOUSANDS_RE = /^[+-]?\d{1,3}(,\d{3})+(\.\d+)?$/;

/** `raw` read as the number a human wrote, or `null` when it is neither a plain decimal nor a
 *  thousands-grouped one — never a value `Number()` alone would accept on its own authority. */
function readHonestNumber(raw: string): number | null {
  if (NUMERIC_RE.test(raw)) return Number(raw);
  if (THOUSANDS_RE.test(raw)) return Number(raw.replace(/,/g, ""));
  return null;
}

/**
 * One year out of the frozen OWID csv, keyed by the source's own code. Blank cells are absences,
 * not zeroes — a country with no reading must reach the join as missing so the join can decide. A
 * NON-blank cell that cannot be read honestly (not a plain number, not a thousands-grouped one) is
 * refused loudly, naming the code and the raw text — the mirror of the same "a decision nothing
 * calls is a decision that does not run" standard `joinValues`, immediately below, is already held
 * to: a cell silently dropped as if absent is a value that vanished, not one that was never there.
 
 *  @parity-exempt: takes a `year` where the beat animates one and does not where it does not; the frozen CSVs differ in shape, not the join. */
export function valuesFromCsv(csv: string, year: number): Map<string, number> {
  const [header, ...rows] = parseCsvRows(csv.trim());
  const columns = header ?? [];
  const codeAt = columns.indexOf("Code");
  const yearAt = columns.indexOf("Year");
  if (codeAt < 0 || yearAt < 0)
    throw new Error(`csv has no Code / Year column, got: ${header}`);
  const valueAt = columns.length - 1;

  const values = new Map<string, number>();
  for (const row of rows) {
    const cells = row;
    if (Number(cells[yearAt]) !== year) continue;
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
 * Join every shape key to a value, and FAIL LOUD on both kinds of silence.
 *
 * `geo-discipline.md` rule 5. A country whose key does not match renders as no-data and looks like
 * a legitimate value: nothing throws, nothing warns, and the map is wrong in a way that reads as
 * correct. So an undeclared miss is an error naming the country, and a declared no-data that turns
 * out to HAVE a value is an error too — that one means the declaration has gone stale, which is the
 * same defect arriving from the other side. `unmatchedValues`, immediately above, is the THIRD
 * refusal this makes: a value with no shape, which is silent in a way the other two are not — see
 * its own doc comment for how a legitimate wider-than-the-study source is told apart from a typo.
 
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

/** Which class a VALUE falls in, where a class INCLUDES its own lower break: class i+1 starts AT
 *  `breaks[i]`. That is what this beat's own legend prints — the tick row `[0, ...breaks]` labels
 *  each break as the foot of the class above it. The hex family bins the other way and says so in
 *  its own name. @parity */
export function binIndexLowerInclusive(
  value: number,
  breaks: number[],
): number {
  let index = 0;
  while (index < breaks.length && value >= breaks[index]!) index++;
  return index;
}

/**
 * Where a value sits on the class legend, 0 at the foot of the first class and 1 at the head of the
 * last — so a marker lands INSIDE its class rather than on a boundary, and two values in the same
 * class are still drawn apart.
 *
 * This is what makes the comparison legible rather than asserted: the subject and the average are
 * two marks on one scale the reader can see the distance between, instead of a sentence claiming
 * one is smaller. The top class is open-ended, so a value past it clamps rather than running off
 * the legend.
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

/**
 * Shapes sorted no-data first (absence is not a value), then the values from lowest to highest.
 *
 * NOT A REVEAL ORDER ANY MORE, whatever the name says. `geo-discipline.md` rule 10 used to hand this
 * list to a video build so the field could fill in one country at a time; it was rewritten when the
 * owner ruled on it, because a snapshot's shapes carry no order between them and a stagger over them
 * is `motion-grammar.md`'s "arbitrary order chosen for visual interest". What remains is an ordering
 * of ROWS — for a legend, a table, a ranked list beside the map — which is a reading order and not a
 * clock. The seed's own video no longer calls it.
 
 *  @parity */
export function revealOrder(rows: JoinedRow[]): string[] {
  const missing = rows.filter((r) => r.value === null).map((r) => r.key);
  const present = rows
    .filter((r) => r.value !== null)
    .sort((a, b) => a.value! - b.value!)
    .map((r) => r.key);
  return [...missing, ...present];
}

// ── Colour: the ramp is a quantity, not a palette ──────────────────────────────────────────────

/** @parity */
function channels(hex: string): number[] {
  if (!HEX.test(hex))
    throw new Error(`expected #rrggbb, got ${JSON.stringify(hex)}`);
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
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

/** A sequential ramp of `steps` colours from the newsroom's own ground toward `far` — the one
 *  legitimate gradient on a map (geo-discipline rule 8), derived rather than picked so it works on
 *  any ground.
 *
 *  `far` was the ink pole and nothing else until 2026-08-10, and that is the defect the owner
 *  reported: a choropleth ramp computed between the BACKGROUND and the INK never touches the house
 *  accent, so a newsroom could change its colour and its maps stayed grey (`AUDIT-W2-palette-credits.md`
 *  H3, seen in `assets/preview.png` — a grey Europe with one teal word on it). It is still the ink
 *  pole for a beat that wants a neutral quantity; a beat that wants the house hue in its DATA
 *  passes `dataRampEnd(accent, ground)` below. The parameter's meaning is "the far end", and the
 *  arithmetic never changed — which is why this docstring moved and the body did not.
 *
 *  `from` and `to` are the ramp's own ends as a fraction of ground→far, and they are ARGUMENTS
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

/**
 * Thin a projected ring to the resolution it will actually be drawn at: keep a point only once it
 * is `minGap` pixels from the last one kept, and always keep the last. Natural Earth at 1:50m holds
 * far more detail than a 620 px Europe can show, and the whole continent's coastline arrives as
 * ~200 000 points for a frame that can resolve about 3 000 of them.
 *
 * Never below three points — a ring thinned into a sliver is worse than a ring left alone.
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

// ── The camera, at any scale ───────────────────────────────────────────────────────────────────
//
// B4.1: "la production doit fonctionner pour N'IMPORTE QUELLE zone de cadrage — la planète entière,
// plusieurs continents ou pays, un continent, un pays, une région, une ville." B4.2: "une zone plus
// large demande un rendu différent."
//
// WHAT WAS MEASURED FIRST, because every choice below answers a number.
//
// Sixteen committed `plate/geometry.json` on 2026-08-11, sorted by the ground actually in frame:
//
//     39 693 km  planet      4 beats   quake hex ×4                 area bias 24.0-32.2
//      8 839 km  hemisphere  6 beats   quake symbol, Europe ×5      area bias  2.8- 6.8
//      1 873 km  continent   3 beats   the Danube corridor ×3       area bias  1.32
//          -     country     0 beats   ---- nothing has ever been produced here ----
//          -     region      0 beats   ---- nothing has ever been produced here ----
//         13 km  city        3 beats   the Geneva locator ×3        area bias  1.00
//
// So the tree spans 2 628x in longitude with a 138x hole in the middle of it, and the two rungs a
// local newsroom asks for most — one country, one region — had never been produced at all.
//
// And the fit is not neutral at either end. Measured against each beat's OWN STUDY SET (the frozen
// data's footprint, not the hand-typed `BEAT.bounds` box, which was tuned by eye until it matched
// and therefore reports ~1.00 by construction at 11 of 11 beats):
//
//     mapvid-locator-geneva   admits x2.46 of longitude and x2.86 of latitude
//     mapgen-symbol-web       admits x1.20              and x1.27
//     mapmore-flow-danube     admits x1.15              and x1.42
//     map-quake-density       admits x1.00              and x0.72   <- BELOW one: a crop, 104 events
//
// A ratio above 1 is ground the reader is shown that the sentence is not about; a ratio below 1 is
// ground the sentence is about that the reader is not shown. One number, both directions, and NO
// BEAT RECORDED IT — the W5 audit's T12, specified and never landed.

/** The Earth's equatorial circumference in kilometres — WGS84, the same figure `cameraFacts`
 *  divides to get `metresPerPixel`. The one physical constant this section is anchored on. */
export const EARTH_CIRCUMFERENCE_KM = 40075.016686;

/** Web-Mercator northing for a latitude, in world units where a full turn of longitude is 2π.
 *  A DUPLICATE of the bake's own `mercY` (`scripts/bake-plate.mjs`), not an import: a bake is a
 *  script and this is the pure half, and the pure half is what a test and a component can reach.
 *  @parity */
export function mercY(latDeg: number): number {
  return Math.log(Math.tan(Math.PI / 4 + (latDeg * Math.PI) / 360));
}

/** The extent ACTUALLY shown, as `geometry.json` records it. */
export type FrameCorners = {
  west: number;
  north: number;
  east: number;
  south: number;
};

/**
 * How much ground the frame's width covers, in kilometres, at the frame's own centre latitude.
 *
 * Degrees of longitude are not a scale: 59° across Europe is 4 152 km and 59° across the equator is
 * 6 568 km, and the render decisions below are about ground, not about degrees. This is the number
 * `metresPerPixel` has been recorded by twenty bakes and consumed by nothing — the same arithmetic,
 * expressed once so a caller does not need the pixel count. @parity
 */
export function groundWidthKm(corners: FrameCorners): number {
  const centreLat = (corners.north + corners.south) / 2;
  return (
    ((corners.east - corners.west) / 360) *
    EARTH_CIRCUMFERENCE_KM *
    Math.cos((centreLat * Math.PI) / 180)
  );
}

/** The six rungs of B4.1's own list, widest first. */
export type ExtentBand =
  | "planet"
  | "hemisphere"
  | "continent"
  | "country"
  | "region"
  | "city";

/**
 * The rung this camera sits on, and the floor of each rung — **powers of four of the Earth's own
 * circumference**, so every rung is exactly two zoom levels wide and the ladder has one anchor
 * (the planet) and no free parameter.
 *
 *     planet      >= C/4    = 10 019 km
 *     hemisphere  >= C/16   =  2 505 km
 *     continent   >= C/64   =    626 km
 *     country     >= C/256  =    156 km
 *     region      >= C/1024 =     39 km
 *     city                    below that
 *
 * THE NAMES ARE GROUND WIDTHS, NOT POLITICAL UNITS, and that has to be said plainly because it
 * reads as a mistake otherwise. Switzerland is 345 km across and lands in `country`; France is
 * 950 km and lands in `continent`; both are countries. A band is a statement about how much ground
 * a reader is looking at — which is what decides the label density, the mark size and whether
 * Mercator is lying — and not about what the ground is called. The names are B4.1's own vocabulary,
 * mapped onto the ladder at the rung where its examples actually fall. @parity
 */
export function extentBand(corners: FrameCorners): ExtentBand {
  const km = groundWidthKm(corners);
  if (km >= EARTH_CIRCUMFERENCE_KM / 4) return "planet";
  if (km >= EARTH_CIRCUMFERENCE_KM / 16) return "hemisphere";
  if (km >= EARTH_CIRCUMFERENCE_KM / 64) return "continent";
  if (km >= EARTH_CIRCUMFERENCE_KM / 256) return "country";
  if (km >= EARTH_CIRCUMFERENCE_KM / 1024) return "region";
  return "city";
}

/** The bounding box of everything the beat says it is about — the STUDY SET, in the frame's own
 *  wrapped longitude. Not `BEAT.bounds`, which is a box somebody typed. */
export type StudyExtent = {
  west: number;
  north: number;
  east: number;
  south: number;
};

/**
 * How much MORE geography the fit admitted than the study set asked for, on each axis.
 *
 * `fitBounds` fits on whichever axis binds first and lets the other overshoot, silently. Longitude
 * is compared in degrees and latitude in MERCATOR units, because a degree of latitude is not a
 * constant amount of frame and comparing degrees would report a ratio the picture does not have.
 *
 * Above 1: ground the reader is shown that the sentence is not about. Below 1: ground the sentence
 * IS about, cropped away — `map-quake-density`'s 0.716 is its 104 poleward events. Recording one
 * number that answers both directions is the point; a beat that only counted the crop would have
 * reported the Geneva locator as perfect while it showed 2.5x the city its claim names. @parity
 */
export function admittedRatios(
  corners: FrameCorners,
  study: StudyExtent,
): { lon: number; lat: number } {
  const studyLon = study.east - study.west;
  const studyLat = mercY(study.north) - mercY(study.south);
  return {
    lon: studyLon > 0 ? (corners.east - corners.west) / studyLon : 1,
    lat:
      studyLat > 0
        ? (mercY(corners.north) - mercY(corners.south)) / studyLat
        : 1,
  };
}

/**
 * THE WORLD-MAP-IN-PORTRAIT LIMIT, derived rather than discovered.
 *
 * Web Mercator's world is a SQUARE: a full turn of longitude and the whole ±85.05° of latitude are
 * the same length. So a camera showing `lonSpan` degrees across a frame `width` px wide draws the
 * world `S = 360 * width / lonSpan` px on a side, and that same S is the world's HEIGHT. MapLibre
 * refuses to zoom out past `S = frameHeight` — under it the canvas would show ground that does not
 * exist — so a frame taller than S never gets the longitude it asked for, however the fit is
 * called. It is not the fit's arithmetic and it cannot be patched in the fit.
 *
 * Measured, and this derivation predicts it to 0.7%: `proof/mapgen-hexgrid-web` at 375x812 draws
 * into a 343x461 canvas and shows **266°** of its 359.8°. The model says the world clamps at
 * S = 461 px, so the frame shows 360 * 343 / 461 = **267.8°** — the 1.8° difference is the fit's
 * own padding. The two axes wanting z_lon −0.865 against a map sitting at −0.16 = log2(461/512) is
 * the same fact read off the zoom (`map-web-discipline.md`).
 *
 * @parity
 */
export function maxStageHeightPx(
  frameWidthPx: number,
  studyLonSpanDeg: number,
): number {
  if (studyLonSpanDeg <= 0) return Infinity;
  return (frameWidthPx * 360) / studyLonSpanDeg;
}

/** What a frame can honestly give this geography, and what is left over. */
export type StageBox = {
  width: number;
  height: number;
  letterboxed: boolean;
  spareHeightPx: number;
  degreesIfForced: number;
};

/**
 * THE DECISION, stated once so every format inherits it:
 *
 *   **A map is never given more stage height than its own geography can fill. Where a frame is
 *   taller than the geography admits, the map takes the height the geography demands and the
 *   leftover goes to FURNITURE — never to a wider camera, and never to a crop.**
 *
 * This is `geo-discipline.md` rule 12's "text beside a square plate" clause read in the one
 * direction it had never been read: a planet-extent beat in a 1080x1920 portrait frame gets a
 * 1080x1080 stage and 840 px of furniture, instead of the 203° of world MapLibre would clamp it to.
 * The alternative — hand the beat the whole height — is what ships today, and what it ships is a
 * quarter of the planet missing with `maxBounds` then stopping the reader panning to it.
 *
 * `degreesIfForced` is what the reader would have been shown had the whole frame height been used;
 * it is carried so the refusal and the record can both name it instead of re-deriving it. @parity
 */
export function stageBoxFor(
  frameWidthPx: number,
  frameHeightPx: number,
  studyLonSpanDeg: number,
): StageBox {
  const ceiling = maxStageHeightPx(frameWidthPx, studyLonSpanDeg);
  const letterboxed = frameHeightPx > ceiling + 0.5;
  const height = letterboxed ? Math.floor(ceiling) : frameHeightPx;
  return {
    width: frameWidthPx,
    height,
    letterboxed,
    spareHeightPx: frameHeightPx - height,
    degreesIfForced: (360 * frameWidthPx) / frameHeightPx,
  };
}

/**
 * Refuse a frame that cannot show the study set, LOUDLY and with the two honest options — the shape
 * `assertCameraReachesBounds` already has, asked of the axis that one cannot see.
 *
 * The message names the stage that WOULD work, because a refusal a caller cannot act on is a
 * complaint. Stretching is not among the options: `map-web-discipline.md` rules a non-uniform scale
 * out in writing — this format would rather draw a smaller true map than a larger false one. @parity
 */
export function assertStageServesGeography(
  frameWidthPx: number,
  frameHeightPx: number,
  studyLonSpanDeg: number,
): void {
  const stage = stageBoxFor(frameWidthPx, frameHeightPx, studyLonSpanDeg);
  if (!stage.letterboxed) return;
  throw new Error(
    `this frame cannot hold ${studyLonSpanDeg.toFixed(1)}° of longitude: Web Mercator's world is ` +
      `square, so ${frameWidthPx}px of width caps the world at ${Math.round(maxStageHeightPx(frameWidthPx, studyLonSpanDeg))}px ` +
      `of height and a ${frameHeightPx}px frame would be clamped to ${stage.degreesIfForced.toFixed(1)}°. ` +
      `Two honest options: letterbox the stage to ${stage.width}x${stage.height} and give the ` +
      `remaining ${stage.spareHeightPx}px to furniture, or narrow the study set to ` +
      `${stage.degreesIfForced.toFixed(1)}° and say in the beat what was left out. Stretching is not one of them.`,
  );
}

/**
 * How much more ground one drawn pixel covers at the frame's most-distorted edge than at its
 * least-distorted one — Mercator's own area lie, as a number.
 *
 * Web Mercator's area scale is sec²(latitude). Within one frame the worst ratio is between the edge
 * furthest from the equator and the edge nearest it; a frame that STRADDLES the equator contains
 * latitude 0 itself, so its floor is 1. Measured against the tree and it reproduces the audit's
 * hand figures exactly: `mapgen-dot-web` at 34.5-71.5°N gives **6.75x**, `map-quake-density` at
 * −60.5..78.2° gives **24.0x**. @parity
 */
export function mercatorAreaBias(corners: FrameCorners): number {
  const clamp = (lat: number) => Math.min(Math.abs(lat), 85);
  const far = Math.max(clamp(corners.north), clamp(corners.south));
  const near =
    corners.north * corners.south <= 0
      ? 0
      : Math.min(clamp(corners.north), clamp(corners.south));
  const sec2 = (lat: number) => 1 / Math.cos((lat * Math.PI) / 180) ** 2;
  return sec2(far) / sec2(near);
}

/**
 * B4.2, made arithmetic for the one family where a wider extent does not merely look different but
 * says something FALSE: an AREA encoding — a dot standing for a fixed number of people in a fixed
 * piece of ground, a hex cell counting events per cell.
 *
 * How many of the beat's OWN legend bins the projection alone can move a cell, given its measured
 * area bias. No budget is typed: the budget is the beat's own scale. If two cells with identical
 * ground density can land in different bins because one is further from the equator, the legend is
 * comparing them as equals and the reader cannot tell.
 *
 * Measured on `map-quake-density`'s own breaks (1-13 / 14-51 / 52-284 / 285-663 / 664+): the
 * smallest step between adjacent breaks is x2.32, and the frame's bias is x24.0, so **the
 * projection alone moves a cell up to two bins**. Which is why the answer at that extent is not a
 * tuning knob but a caveat or a correction — see `assertAreaEncodingIsHonest`. @parity
 */
export function binsCrossedByProjection(
  areaBias: number,
  breaks: readonly number[],
): number {
  const positive = breaks.filter((b) => b > 0);
  if (positive.length < 2) return areaBias > 1 ? 1 : 0;
  let smallestStep = Infinity;
  for (let i = 1; i < positive.length; i++) {
    const step = positive[i]! / positive[i - 1]!;
    if (step > 1 && step < smallestStep) smallestStep = step;
  }
  if (!Number.isFinite(smallestStep)) return areaBias > 1 ? 1 : 0;
  return Math.floor(Math.log(areaBias) / Math.log(smallestStep));
}

/**
 * An area-encoding beat must either correct for the projection or SAY SO — the converse of
 * `geo-discipline.md`'s own rule that a reader must not be left to infer whether a sparse region
 * holds few people or was drawn small by the projection.
 *
 * `disclosed` is the beat's own caveat text. The check is not that the beat is undistorted — at
 * planet extent nothing can be — it is that the number is in front of the reader. @parity
 */
export function assertAreaEncodingIsHonest(
  corners: FrameCorners,
  breaks: readonly number[],
  disclosed: string,
): void {
  const bias = mercatorAreaBias(corners);
  const bins = binsCrossedByProjection(bias, breaks);
  if (bins < 1) return;
  const said = /mercator|projection|latitude/i.test(disclosed);
  if (said) return;
  throw new Error(
    `this camera spans ${extentBand(corners)} extent, where one drawn pixel covers ${bias.toFixed(1)}x ` +
      `more ground at ${corners.north.toFixed(1)}° than at the frame's least-distorted latitude — enough ` +
      `for the projection ALONE to move a cell ${bins} bin${bins === 1 ? "" : "s"} of this beat's own legend. ` +
      `An area encoding at this extent either carries a latitude correction or says so in its caveat; ` +
      `this beat's caveat mentions neither Mercator, the projection nor latitude.`,
  );
}

/**
 * The biggest a proportional mark may be drawn before the field stops reading as marks.
 *
 * Derived from the plate's own MEDIAN nearest-neighbour distance, not its minimum: one pathological
 * pair — the Geneva locator's is **0.57 px apart**, two organisations in the same building — would
 * otherwise shrink every mark on the map to nothing. At `medianNearestNeighbourPx / 2` the typical
 * pair of marks exactly TOUCHES and does not overlap; half the pairs are closer than the median by
 * construction, and those are the declutter step's business, disclosed with a count.
 *
 * The existing typed constant stays as the CEILING, so nothing gets bigger than it is today.
 * Measured: `mapgen-symbol-web`'s median nearest neighbour is 26.06 px, so the ceiling this returns
 * is 13.0 px against the 30 px the beat draws — **today's marks are 2.3x the size at which the
 * typical pair stops overlapping.** @parity
 */
export function markRadiusCeilingPx(
  medianNearestNeighbourPx: number,
  typedCeilingPx: number,
): number {
  if (!(medianNearestNeighbourPx > 0)) return typedCeilingPx;
  return Math.min(typedCeilingPx, medianNearestNeighbourPx / 2);
}

/** Distances from every point to its nearest other point, in drawn pixels, sorted ascending —
 *  the input `markRadiusCeilingPx` and every overlap question needs, measured on the plate rather
 *  than guessed from the frame width. @parity */
export function nearestNeighbourPx(
  points: readonly { px: number; py: number }[],
): number[] {
  const out: number[] = [];
  for (let i = 0; i < points.length; i++) {
    let best = Infinity;
    for (let j = 0; j < points.length; j++) {
      if (i === j) continue;
      const d = Math.hypot(
        points[i]!.px - points[j]!.px,
        points[i]!.py - points[j]!.py,
      );
      if (d < best) best = d;
    }
    if (Number.isFinite(best)) out.push(best);
  }
  return out.sort((a, b) => a - b);
}

/** What the camera knows about its own scale, recorded on the plate so nothing downstream has to
 *  re-guess it — the four keys `geometry.json` gained under T1, plus the four B4.1 needed. */
export type ExtentFacts = {
  band: ExtentBand;
  groundWidthKm: number;
  mercatorAreaBias: number;
  admittedLonRatio: number;
  admittedLatRatio: number;
  studyExtent: StudyExtent;
};

/** Everything the extent decides, in one record a bake writes into `geometry.json` and a guard
 *  recomputes from the same two committed files. @parity */
export function extentFacts(
  corners: FrameCorners,
  study: StudyExtent,
): ExtentFacts {
  const admitted = admittedRatios(corners, study);
  return {
    band: extentBand(corners),
    groundWidthKm: Number(groundWidthKm(corners).toPrecision(6)),
    mercatorAreaBias: Number(mercatorAreaBias(corners).toPrecision(4)),
    admittedLonRatio: Number(admitted.lon.toPrecision(4)),
    admittedLatRatio: Number(admitted.lat.toPrecision(4)),
    studyExtent: study,
  };
}

/** The study set's own footprint, in the frame's wrapped longitude — a Pacific-centred camera runs
 *  from −20° to 340°, so a point at 170°W is read one turn on before it is compared. @parity */
export function studyExtentOf(
  points: readonly { lon: number; lat: number }[],
  west: number,
): StudyExtent {
  if (points.length === 0)
    throw new Error(
      "cannot measure a study extent from no points — a camera fitted to nothing is a camera nobody chose",
    );
  let w = Infinity,
    e = -Infinity,
    s = Infinity,
    n = -Infinity;
  for (const { lon, lat } of points) {
    const wrapped = lon < west ? lon + 360 : lon;
    if (wrapped < w) w = wrapped;
    if (wrapped > e) e = wrapped;
    if (lat < s) s = lat;
    if (lat > n) n = lat;
  }
  return { west: w, east: e, south: s, north: n };
}

// ── The claim ──────────────────────────────────────────────────────────────────────────────────

/**
 * Check the confirmed takeaway against the source it is drawn from, and return the ways it is not
 * supported. `anti-patterns.md`, "a title that claims more than the source supports" — made
 * arithmetic, because a superlative is exactly the kind of claim that is true when it is written
 * and false when the data is refreshed.
 *
 * `quorum` names which claim the title is actually making about its neighbours: `"all"` (the
 * default — a superlative, and every neighbour on the wrong side of the subject is its own named
 * violation) or `"most"` — a strict majority, checked as one verdict rather than neighbour by
 * neighbour, because "most" is not falsified by a single exception the way "all" is.
 *
 * `direction` is which way the takeaway points, and it exists because ROUND FIVE found this
 * function knew exactly one claim — the CO2 seed's, "the subject is BELOW a comparison and below
 * its neighbours" — with no way to ask the opposite. `stress-t-europe-recycling`'s takeaway is a
 * MAXIMUM ("Germany recycles more of its waste than any country that reported") and its author had
 * to write the check again, by hand, in their own producer, against the same frozen values. A
 * mechanism that covers half the claims a journalist writes is a mechanism half of them re-implement.
 * `"below"` is the default and is the seed's claim unchanged; `"above"` is its mirror, and a
 * two-ended claim (a maximum AND a minimum, which is what a distribution beat usually says) is two
 * calls, one per end, each naming its own subject.
 *
 * It throws rather than passing when a code it was asked about is absent: a claim that cannot be
 * evaluated has not been checked, and silently returning "no violations" is the worse answer.
 */
export function claimViolations({
  values,
  subject,
  comparison,
  neighbours,
  quorum = "all",
  direction = "below",
}: {
  values: Map<string, number>;
  subject: string;
  comparison: string;
  neighbours: readonly string[];
  quorum?: "all" | "most";
  direction?: "below" | "above";
}): string[] {
  const need = [subject, comparison, ...neighbours];
  const absent = need.filter((code) => !values.has(code));
  if (absent.length > 0)
    throw new Error(
      `cannot check the claim: no value for ${absent.join(", ")}`,
    );

  // The two words the refusal is written in, and the two comparisons behind them. Naming them once
  // is what keeps the mirror claim from being a second copy of this function with `<` for `>`.
  const here = direction === "below" ? "below" : "above";
  const there = direction === "below" ? "above" : "below";
  const wrongSide = (a: number, b: number) => (direction === "below" ? a >= b : a <= b);

  const value = values.get(subject)!;
  const violations: string[] = [];
  if (wrongSide(value, values.get(comparison)!))
    violations.push(
      `${subject} (${value}) is not ${here} ${comparison} (${values.get(comparison)})`,
    );

  // Read it as "the neighbour is NOT on the side the title says": with the subject's own value as
  // the first argument, `wrongSide` answers that for both directions and a TIE counts as a
  // violation in both, which is what `>=`/`<=` already say.
  const notBeyond = neighbours.filter((n) => wrongSide(value, values.get(n)!));
  if (quorum === "all") {
    for (const neighbour of notBeyond)
      violations.push(
        `${neighbour} (${values.get(neighbour)}) is not ${there} ${subject} (${value}) — the title says all of its neighbours`,
      );
  } else if (neighbours.length > 0 && notBeyond.length * 2 >= neighbours.length)
    violations.push(
      `only ${neighbours.length - notBeyond.length} of ${neighbours.length} neighbours are ${there} ${subject} (${value}), not a strict majority — the title says most of its neighbours. ` +
        `Not ${there}: ${notBeyond.map((n) => `${n} (${values.get(n)})`).join(", ")}`,
    );
  return violations;
}

// ── Language ───────────────────────────────────────────────────────────────────────────────────

/** The newsroom's readers write a decimal comma. Furniture speaks the beat's language too.
 *  @parity */
export function fr(value: number, decimals = 1): string {
  return new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}
