/**
 * The pure half of this choropleth beat: the study set, the join, the classes, the ramp, the ring
 * arithmetic, the claim check. A physical copy of `twin-map-beat/assets/geo.ts`'s shape, adapted —
 * not an import — because a skill never reaches across another skill's boundary at runtime, and a
 * proof beat under `proof/` stays copy-pasteable on its own the same way.
 *
 * Nothing here knows about a browser, a tile, a key or a camera, which is what lets both the still
 * path (node + resvg) and the video path (Remotion + Chromium) import this file without either
 * dragging the other's runtime behind it.
 *
 * It also does not derive furniture colours — `deriveFurniture` lives beside a native rasteriser in
 * `render-still.mjs`, and `render.mjs` calls it in node and passes ink/muted/grid in as props.
 */

export type Ring = [number, number][];
export type Frame = { width: number; height: number };

/**
 * A country's geometry as it comes out of the bake: PARTS, not a flattened ring list. Each entry of
 * `parts` is one disjoint landmass's own `[outer, ...holes]` — `geo-discipline.md` rule 11's named
 * warning, paid for by a sibling beat in this project (`mapmore-dot-population`): flattening rings
 * across parts before deciding which is an outer boundary and which is a hole misreads a second
 * island's own outer ring as a hole cut from the first. This beat's countries are mostly
 * archipelagic (Greece, Croatia, Denmark, the UK, Italy's Sicily and Sardinia) and several are
 * genuinely multi-part, so the structure is kept nested all the way to the SVG path string below —
 * `pathFromParts` never needs to answer "is this ring a hole", because `fill-rule="evenodd"` never
 * needs that question answered either: it only needs every ring present as its own closed subpath.
 */
export type BakedShape = {
  key: string;
  name: string;
  parts: Ring[][];
};

/** One row of the join: a shape, and the value it did or did not find. */
export type JoinedRow = { key: string; value: number | null };

const HEX = /^#[0-9a-fA-F]{6}$/;

// ── The beat's own data ────────────────────────────────────────────────────────────────────────

/**
 * The study set, as Natural Earth's `ADM0_A3` keys — the ISO A3 field is NOT the ISO A3 code
 * (`geo-discipline.md` rule 5: France and Norway both carry `ISO_A3 = "-99"` in that field).
 *
 * Kosovo is deliberately absent: it is a genuine coding disagreement between Natural Earth (`KOS`)
 * and Our World in Data (`OWID_KOS`), and this beat's claim is about Poland and Sweden, not about
 * Kosovo — leaving it out of the DECLARATION is the honest move, not aliasing it through so the
 * join happens to pass. 41 countries, every one of them checked below to find both a shape in
 * `countries.geojson` and a 2023 value in `co2-per-capita-2023.csv`.
 */
export const CHOROPLETH_STUDY = [
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

/** Class boundaries in tonnes per person. Six classes: under 2, then 2s, then 10 and over. */
export const CHOROPLETH_BREAKS = [2, 4, 6, 8, 10];

// ── Reading the source ─────────────────────────────────────────────────────────────────────────

/**
 * One year out of the frozen OWID csv, keyed by the source's own ISO code. Blank cells are
 * absences, not zeroes — a country with no reading must reach the join as missing so the join can
 * decide.
 */
export function valuesFromCsv(csv: string, year: number): Map<string, number> {
  const [header, ...rows] = csv.trim().split(/\r?\n/);
  const columns = (header ?? "").split(",");
  const codeAt = columns.indexOf("Code");
  const yearAt = columns.indexOf("Year");
  if (codeAt < 0 || yearAt < 0)
    throw new Error(`csv has no Code / Year column, got: ${header}`);
  const valueAt = columns.length - 1;

  const values = new Map<string, number>();
  for (const row of rows) {
    const cells = row.split(",");
    if (Number(cells[yearAt]) !== year) continue;
    const value = Number(cells[valueAt]);
    if (!cells[codeAt] || cells[valueAt] === "" || !Number.isFinite(value))
      continue;
    values.set(cells[codeAt]!, value);
  }
  return values;
}

// ── The join ───────────────────────────────────────────────────────────────────────────────────

/**
 * Join every shape key to a value, and FAIL LOUD on both kinds of silence.
 *
 * `geo-discipline.md` rule 5. A country whose key does not match renders as no-data and looks like
 * a legitimate value: nothing throws, nothing warns, and the map is wrong in a way that reads as
 * correct. So an undeclared miss is an error naming the country, and a declared no-data that turns
 * out to HAVE a value is an error too — that one means the declaration has gone stale, which is the
 * same defect arriving from the other side. This beat declares zero expected no-data shapes: its
 * 41-country study set was chosen to be exactly the codes both `countries.geojson` and the frozen
 * csv agree on, so a genuine miss here is a real bug, never an expected absence.
 */
export function joinValues(
  keys: readonly string[],
  values: Map<string, number>,
  {
    alias = {},
    expectedNoData = [],
  }: {
    alias?: Record<string, string>;
    expectedNoData?: readonly string[];
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

  return { rows, noData, matched: rows.length - noData.length };
}

/** The class a value falls in. A value exactly on a break belongs to the class above it. */
export function binIndex(value: number, breaks: number[]): number {
  let index = 0;
  while (index < breaks.length && value >= breaks[index]!) index++;
  return index;
}

/**
 * Where a value sits on the class legend, 0 at the foot of the first class and 1 at the head of the
 * last — so a marker lands INSIDE its class rather than on a boundary, and two values in the same
 * class are still drawn apart.
 *
 * This is what makes the comparison legible rather than asserted: Sweden and Poland are two marks
 * on one scale the reader can see the distance between, instead of a sentence claiming a ratio. The
 * top class is open-ended, so a value past it clamps rather than running off the legend.
 */
export function scalePosition(value: number, breaks: number[]): number {
  const classes = breaks.length + 1;
  const index = binIndex(value, breaks);
  const lower = index === 0 ? 0 : breaks[index - 1]!;
  const upper =
    index === breaks.length
      ? lower + (breaks[breaks.length - 1]! - (breaks[breaks.length - 2] ?? 0))
      : breaks[index]!;
  const fraction = Math.max(0, Math.min(1, (value - lower) / (upper - lower)));
  return (index + fraction) / classes;
}

/**
 * The order the field builds in: no-data first (absence is not a value — never triggered on this
 * beat's complete join, but kept for the same reason the join still checks for it), then the values
 * themselves from lowest to highest. `geo-discipline.md` rule 10 — a map has no time axis, so its
 * reveal takes the argument's order, and the distribution darkening IS the argument. Not a stagger
 * by index.
 */
export function revealOrder(rows: JoinedRow[]): string[] {
  const missing = rows.filter((r) => r.value === null).map((r) => r.key);
  const present = rows
    .filter((r) => r.value !== null)
    .sort((a, b) => a.value! - b.value!)
    .map((r) => r.key);
  return [...missing, ...present];
}

// ── Colour: the ramp is a quantity, not a palette ──────────────────────────────────────────────

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

/**
 * The choropleth ramp: `steps` shades from the newsroom's own ground toward its own ink.
 *
 * Neutral by construction, and correct on any ground a newsroom picks. It stops short of both
 * poles: a class that IS the ground is invisible, and a class that IS the ink reads as text.
 *
 * The accent is deliberately absent. `geo-discipline.md` rule 8: the ramp is the quantity, so the
 * accent is spent on the subject's outline and its label, and on nothing else.
 */
export function sequentialRamp(
  ground: string,
  ink: string,
  steps: number,
): string[] {
  const FROM = 0.1;
  const TO = 0.78;
  return Array.from({ length: steps }, (_, i) =>
    mixHex(ground, ink, FROM + ((TO - FROM) * i) / (steps - 1)),
  );
}

// ── Geometry: baked pixel parts become one path ────────────────────────────────────────────────

/**
 * Every ring of every part closed into its own subpath, joined for `fill-rule="evenodd"` to cut
 * holes from outers. Evenodd needs no outer/hole label on a ring — it fills by parity of crossings
 * — so flattening HERE, at the very last step before the SVG string, is safe; what rule 11 forbids
 * is flattening EARLIER, before something needs to decide which ring bounds a landmass (a bbox, a
 * centroid, a point-in-polygon test) — this beat never does that, so the parts survive intact from
 * the bake all the way to this function, and this function is the only place they are flattened.
 */
export function pathFromParts(parts: Ring[][]): string {
  return parts
    .flat()
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

/**
 * Thin a projected ring to the resolution it will actually be drawn at: keep a point only once it
 * is `minGap` pixels from the last one kept, and always keep the last.
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
 */
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

// ── The claim ──────────────────────────────────────────────────────────────────────────────────

/**
 * Check the confirmed takeaway against the source it is drawn from: Poland's per-capita CO2 is
 * claimed to be MORE THAN `minRatio` TIMES Sweden's. Measured, not assumed — 7.307086 / 3.4789953
 * = 2.100..., checked below rather than typed as a constant, so a refreshed source that moved
 * either number is caught here rather than trusted from a comment.
 *
 * `anti-patterns.md`, "a title that claims more than the source supports", made arithmetic: the
 * title says "more than double", which is falsified by a ratio that has drifted to 2.0 or under,
 * and this is the check that would say so before the beat ever renders.
 *
 * Throws rather than passing when a code it was asked about is absent: a claim that cannot be
 * evaluated has not been checked, and silently returning "no violations" is the worse answer.
 */
export function ratioClaimViolations({
  values,
  subject,
  comparison,
  minRatio,
}: {
  values: Map<string, number>;
  subject: string;
  comparison: string;
  minRatio: number;
}): string[] {
  const absent = [subject, comparison].filter((code) => !values.has(code));
  if (absent.length > 0)
    throw new Error(
      `cannot check the claim: no value for ${absent.join(", ")}`,
    );

  const subjectValue = values.get(subject)!;
  const comparisonValue = values.get(comparison)!;
  const ratio = subjectValue / comparisonValue;

  return ratio > minRatio
    ? []
    : [
        `${subject} (${subjectValue}) is only ${ratio.toFixed(2)}x ${comparison} (${comparisonValue}), ` +
          `not more than ${minRatio}x — the title says "more than double"`,
      ];
}

// ── Language ───────────────────────────────────────────────────────────────────────────────────

/** This beat's readers write a decimal point. English only, project-wide, this branch. */
export function en(value: number, decimals = 1): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}
