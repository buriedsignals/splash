/**
 * The pure half of the map beat: the join, the classes, the ramp, the ring arithmetic.
 *
 * Nothing here knows about a browser, a tile, a key or a camera. That is deliberate on both sides:
 * it is what makes the join testable at all, and it is what lets BOTH genres import this file — the
 * still path (node + resvg) and the video path (Remotion + Chromium) — without either dragging the
 * other's runtime behind it. `twin-chart-video`'s gotcha, one engine over: a module that reaches a
 * native rasteriser at import time cannot be bundled for a browser.
 *
 * It also means this file does NOT derive furniture colours. `deriveFurniture` owns the ink/muted/grid
 * rule and its contrast escalation, in this skill's own `scripts/render-still.mjs` (a copy of the
 * `twin-chart-beat` original — a skill never imports another skill); the render scripts call it in
 * node and pass the result in. What lives here is the
 * ramp — a quantity encoding, which is a different thing — built on a plain hex mix.
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

/**
 * One year out of the frozen OWID csv, keyed by the source's own code. Blank cells are absences,
 * not zeroes — a country with no reading must reach the join as missing so the join can decide.
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
 * same defect arriving from the other side.
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
 * This is what makes the comparison legible rather than asserted: the subject and the average are
 * two marks on one scale the reader can see the distance between, instead of a sentence claiming
 * one is smaller. The top class is open-ended, so a value past it clamps rather than running off
 * the legend.
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
 * The order the field builds in: no-data first (absence is not a value), then the values themselves
 * from lowest to highest. `geo-discipline.md` rule 10 — a map has no time axis, so its reveal takes
 * the argument's order, and the distribution darkening IS the argument. Not a stagger by index.
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

/** WCAG 2.x relative luminance — exported so a test can assert a ramp actually darkens. */
export function luminanceOf(hex: string): number {
  const [r, g, b] = channels(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
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
 * Neutral by construction, and correct on any ground a newsroom picks — on a charcoal ground the
 * ink is white and the ramp lightens instead of darkening, with no branch here to get that wrong.
 * It stops short of both poles: a class that IS the ground is invisible, and a class that IS the
 * ink reads as text.
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

// ── Geometry: baked pixel rings become one path ────────────────────────────────────────────────

/** Every ring closed, holes as further subpaths for `fill-rule="evenodd"` to cut out. */
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
 * Check the confirmed takeaway against the source it is drawn from, and return the ways it is not
 * supported. `anti-patterns.md`, "a title that claims more than the source supports" — made
 * arithmetic, because a superlative is exactly the kind of claim that is true when it is written
 * and false when the data is refreshed.
 *
 * `quorum` names which claim the title is actually making about its neighbours: `"all"` (the
 * default — a superlative, and every neighbour below the subject is its own named violation) or
 * `"most"` — a strict majority, checked as one verdict rather than neighbour by neighbour, because
 * "most" is not falsified by a single exception the way "all" is.
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
}: {
  values: Map<string, number>;
  subject: string;
  comparison: string;
  neighbours: readonly string[];
  quorum?: "all" | "most";
}): string[] {
  const need = [subject, comparison, ...neighbours];
  const absent = need.filter((code) => !values.has(code));
  if (absent.length > 0)
    throw new Error(
      `cannot check the claim: no value for ${absent.join(", ")}`,
    );

  const value = values.get(subject)!;
  const violations: string[] = [];
  if (value >= values.get(comparison)!)
    violations.push(
      `${subject} (${value}) is not below ${comparison} (${values.get(comparison)})`,
    );

  const notAbove = neighbours.filter((n) => values.get(n)! <= value);
  if (quorum === "all") {
    for (const neighbour of notAbove)
      violations.push(
        `${neighbour} (${values.get(neighbour)}) is not above ${subject} (${value}) — the title says all of its neighbours`,
      );
  } else if (neighbours.length > 0 && notAbove.length * 2 >= neighbours.length)
    violations.push(
      `only ${neighbours.length - notAbove.length} of ${neighbours.length} neighbours are above ${subject} (${value}), not a strict majority — the title says most of its neighbours. ` +
        `Not above: ${notAbove.map((n) => `${n} (${values.get(n)})`).join(", ")}`,
    );
  return violations;
}

// ── Language ───────────────────────────────────────────────────────────────────────────────────

/** The newsroom's readers write a decimal comma. Furniture speaks the beat's language too. */
export function fr(value: number, decimals = 1): string {
  return new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}
