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
 * This beat's declared study set: every ADM0_A3 key in `countries.geojson`, which is Natural Earth
 * 1:50m Admin 0 minus Antarctica. Declared as a LIST rather than derived from the file at run time,
 * because declaring is the whole of what makes the join checkable — a study set read back out of
 * the same file the shapes come from can never disagree with it, and `joinValues` below would then
 * be measuring nothing.
 *
 * `ADM0_A3`, never `ISO_A3` (`geo-discipline.md` rule 5). In the 1:50m file eight features carry
 * `ISO_A3 = "-99"` — France, Norway, Kosovo, Northern Cyprus, Somaliland, Kashmir, and two Australian
 * territories — so a join on that field would drop France and Norway off a world map without a word.
 * `prepare-inputs.mjs` strips every property but this one on the way in.
 *
 * 241 keys. 241 shapes are drawn; what each one is joined to, aliased to, or
 * declared silent about is the three declarations immediately below.
 */
export const LIFE_EXPECTANCY_STUDY = [
  "ABW",
  "AFG",
  "AGO",
  "AIA",
  "ALB",
  "ALD",
  "AND",
  "ARE",
  "ARG",
  "ARM",
  "ASM",
  "ATC",
  "ATF",
  "ATG",
  "AUS",
  "AUT",
  "AZE",
  "BDI",
  "BEL",
  "BEN",
  "BFA",
  "BGD",
  "BGR",
  "BHR",
  "BHS",
  "BIH",
  "BLM",
  "BLR",
  "BLZ",
  "BMU",
  "BOL",
  "BRA",
  "BRB",
  "BRN",
  "BTN",
  "BWA",
  "CAF",
  "CAN",
  "CHE",
  "CHL",
  "CHN",
  "CIV",
  "CMR",
  "COD",
  "COG",
  "COK",
  "COL",
  "COM",
  "CPV",
  "CRI",
  "CUB",
  "CUW",
  "CYM",
  "CYN",
  "CYP",
  "CZE",
  "DEU",
  "DJI",
  "DMA",
  "DNK",
  "DOM",
  "DZA",
  "ECU",
  "EGY",
  "ERI",
  "ESP",
  "EST",
  "ETH",
  "FIN",
  "FJI",
  "FLK",
  "FRA",
  "FRO",
  "FSM",
  "GAB",
  "GBR",
  "GEO",
  "GGY",
  "GHA",
  "GIN",
  "GMB",
  "GNB",
  "GNQ",
  "GRC",
  "GRD",
  "GRL",
  "GTM",
  "GUM",
  "GUY",
  "HKG",
  "HMD",
  "HND",
  "HRV",
  "HTI",
  "HUN",
  "IDN",
  "IMN",
  "IND",
  "IOA",
  "IOT",
  "IRL",
  "IRN",
  "IRQ",
  "ISL",
  "ISR",
  "ITA",
  "JAM",
  "JEY",
  "JOR",
  "JPN",
  "KAS",
  "KAZ",
  "KEN",
  "KGZ",
  "KHM",
  "KIR",
  "KNA",
  "KOR",
  "KOS",
  "KWT",
  "LAO",
  "LBN",
  "LBR",
  "LBY",
  "LCA",
  "LIE",
  "LKA",
  "LSO",
  "LTU",
  "LUX",
  "LVA",
  "MAC",
  "MAF",
  "MAR",
  "MCO",
  "MDA",
  "MDG",
  "MDV",
  "MEX",
  "MHL",
  "MKD",
  "MLI",
  "MLT",
  "MMR",
  "MNE",
  "MNG",
  "MNP",
  "MOZ",
  "MRT",
  "MSR",
  "MUS",
  "MWI",
  "MYS",
  "NAM",
  "NCL",
  "NER",
  "NFK",
  "NGA",
  "NIC",
  "NIU",
  "NLD",
  "NOR",
  "NPL",
  "NRU",
  "NZL",
  "OMN",
  "PAK",
  "PAN",
  "PCN",
  "PER",
  "PHL",
  "PLW",
  "PNG",
  "POL",
  "PRI",
  "PRK",
  "PRT",
  "PRY",
  "PSX",
  "PYF",
  "QAT",
  "ROU",
  "RUS",
  "RWA",
  "SAH",
  "SAU",
  "SDN",
  "SDS",
  "SEN",
  "SGP",
  "SGS",
  "SHN",
  "SLB",
  "SLE",
  "SLV",
  "SMR",
  "SOL",
  "SOM",
  "SPM",
  "SRB",
  "STP",
  "SUR",
  "SVK",
  "SVN",
  "SWE",
  "SWZ",
  "SXM",
  "SYC",
  "SYR",
  "TCA",
  "TCD",
  "TGO",
  "THA",
  "TJK",
  "TKM",
  "TLS",
  "TON",
  "TTO",
  "TUN",
  "TUR",
  "TUV",
  "TWN",
  "TZA",
  "UGA",
  "UKR",
  "URY",
  "USA",
  "UZB",
  "VAT",
  "VCT",
  "VEN",
  "VGB",
  "VIR",
  "VNM",
  "VUT",
  "WLF",
  "WSM",
  "YEM",
  "ZAF",
  "ZMB",
  "ZWE",
] as const;

/** Class boundaries in YEARS of period life expectancy at birth — six classes: under 60, then five
 *  years at a time, then 80 and over.
 *
 *  Round numbers a reader already thinks in, not quantiles: the beat's own claim is about a
 *  threshold ("fewer than sixty years"), and a quantile scale would move that threshold to wherever
 *  the twentieth percentile happened to land this year, which is exactly the boundary a reader
 *  cannot read off a legend. The 2023 file falls 6 / 22 / 38 / 49 / 65 / 57 across them, so no class
 *  is empty and none holds half the world. */
export const LIFE_EXPECTANCY_BREAKS = [60, 65, 70, 75, 80];

// ── Reading the source ─────────────────────────────────────────────────────────────────────────

/** This beat's own frozen csv: `Code,Entity,Year,value`, cut to 2023 out of the story's frozen
 *  long-form panel by `prepare-inputs.mjs` in this folder — produced once, by a script, never
 *  hand-typed, and never re-derived at render time. 
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

/** `geo-discipline.md` rule 7: no-data is its OWN colour, outside the ramp — never a shade the ramp
 *  itself could have produced, and never a texture (the rule's own account of why a hatch reads
 *  illegibly at the size a no-data region is actually drawn on a newsroom map).
 *
 *  THIS BEAT OVERRIDES THE SHARED VALUE, and the reason is measurable rather than a taste. The
 *  format ships `#B9B9B9`, whose relative luminance is 0.485, on the stated reasoning that it is
 *  "fixed, not derived from the ground … so a no-data reading stays recognisable across every
 *  newsroom's own ground colour". That holds on a LIGHT ground, where a mid-grey is darker than a
 *  ramp running toward the ink. On this story's recorded ground (`#16191B`) the ramp runs the other
 *  way — 0.052 up to 0.616 — and 0.485 lands between its fifth and sixth class: a country with NO
 *  reading would be painted as one of the highest readings on the map. Measured, not guessed.
 *  `#2B3236` sits at 0.031, below the whole ramp, and is cool where every class is warm. */
export const NO_DATA_FILL = "#2B3236";

/** `geo-discipline.md` rule 7: water is a blue tint, never grey.
 *
 *  OVERRIDDEN FOR THE SAME REASON, one colour over. The shared `#AAC9E0` is 0.557 — brighter than
 *  five of this ramp's six classes, so on a dark-ground world map the ocean, which is most of the
 *  picture, would be the brightest thing in it and would read as the top class. `#12293B` is 0.023:
 *  unmistakably blue, unmistakably not land, and below every class. */
export const WATER_FILL = "#12293B";

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
