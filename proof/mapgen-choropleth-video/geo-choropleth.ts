/**
 * The pure half of this choropleth beat: the study set, the join, the classes, the ramp, the ring
 * arithmetic, the claim check. A physical copy of `map-beat/assets/geo.ts`'s shape, adapted —
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
 
 *  @parity-exempt: takes a `year` where the beat animates one and does not where it does not; the frozen CSVs differ in shape, not the join. */
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
 
 *  @parity */
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
 * This is what makes the comparison legible rather than asserted: Sweden and Poland are two marks
 * on one scale the reader can see the distance between, instead of a sentence claiming a ratio. The
 * top class is open-ended, so a value past it clamps rather than running off the legend.
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
 * The order the field builds in: no-data first (absence is not a value — never triggered on this
 * beat's complete join, but kept for the same reason the join still checks for it), then the values
 * themselves from lowest to highest. `geo-discipline.md` rule 10 — a map has no time axis, so its
 * reveal takes the argument's order, and the distribution darkening IS the argument. Not a stagger
 * by index.
 
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

/** @parity */
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

// ── Where a subject's own label belongs ────────────────────────────────────────────────────────
//
// B6.10: "Poland" was placed by two typed degrees in `bake.mjs` — `label: [20.3, 52.2]`, under a
// comment that called it "inside Poland's own landmass … nudged east and north" — projected to
// (389.2, 277.6) and then consumed under `text-anchor="end"`, so the string GREW LEFT from a point
// that had itself been nudged right to compensate. Measured against the shape the bake also
// records: Poland's own box centre is (379.3, 280.0), and the drawn label's centre landed at
// 364.2 — **15.1 px west of the country's centre on an 83.7 px-wide shape**, which is what a
// reader sees as a name sitting on Poland's western lobe.
//
// The whole class is worth stating because the audit swept it: eight live sites in this tree place
// a label by a typed number, including the seed every map beat is scaffolded from, while the
// derivations that would place it correctly already exist in six places and none of the eight
// calls one. This is that call, for this beat: the anchor comes from the SHAPE, in the same pixel
// space the shape is drawn in, every render.

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

/** @parity */
export function pointInRing(point: [number, number], ring: Ring): boolean {
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]!;
    const [xj, yj] = ring[j]!;
    const crosses = yi > y !== yj > y;
    if (crosses && x < ((xj - xi) * (y - yi)) / (yj - yi + 1e-15) + xi)
      inside = !inside;
  }
  return inside;
}

/** `rings[0]` is the outer boundary, `rings[1..]` are holes to cut back out — the same convention
 *  every other beat in this twin uses for a baked polygon's ring list.
 *  @parity */
export function pointInRings(point: [number, number], rings: Ring[]): boolean {
  const [outer, ...holes] = rings;
  if (!outer || !pointInRing(point, outer)) return false;
  return !holes.some((hole) => pointInRing(point, hole));
}

/**
 * The part of a shape a name is put on: the LARGEST by bounding-box area, so an exclave or an
 * offshore island cannot take the name (Denmark's Bornholm, Italy's Sardinia, Greece's Crete are
 * all in this beat's study set). Shared by the anchor below and by the width the name has to fit
 * in, so the two can never answer for different parts of the same country.
 *
 *  @parity */
function labelHostPart(shape: BakedShape): Ring[] {
  if (shape.parts.length === 0)
    throw new Error(`${shape.key} has no parts to anchor a label on`);
  let best: { rings: Ring[]; area: number } | null = null;
  for (const part of shape.parts) {
    const box = boundingBoxOf(part);
    const area = (box.maxX - box.minX) * (box.maxY - box.minY);
    if (!best || area > best.area) best = { rings: part, area };
  }
  return best!.rings;
}

/**
 * HOW WIDE THE SUBJECT IS, in the plate's own pixel space, across the part its name is centred on.
 *
 * The floor a caller derives from this is the one the landscape VIDEO render produced and no
 * counter could see: at the 385 px the words left for the map, "Poland" measured 147 px against a
 * country drawn 65 px wide — **2.26x the shape's own width** — so the name and its halo covered
 * Poland's class colour and bled over Germany, Czechia and Belarus. Nothing was clipped, nothing
 * collided, every type floor was cleared, and the mark the whole beat is about was painted out by
 * its own label.
 *
 * A name wider than the shape it names does not name it, it hides it — and on a choropleth what it
 * hides is the DATA, because the subject's shade is what the legend's markers point at. So this is
 * measured and refused, and the refusal reports the map size that would let the name fit.
 *
 *  @parity */
export function subjectLabelHostWidth(shape: BakedShape): number {
  const box = boundingBoxOf(labelHostPart(shape));
  return box.maxX - box.minX;
}

/**
 * The point a subject's own name should be centred on, in the plate's pixel space: the box centre
 * of the shape's LARGEST part, so an exclave or an offshore island cannot drag the name into the
 * sea (Denmark's Bornholm, Italy's Sardinia, Greece's Crete are all in this beat's study set).
 *
 * A box centre, not a pole of inaccessibility, and the difference is stated rather than hidden: for
 * a compact subject the two agree to a pixel or two, and for a crescent-shaped one the box centre
 * can fall OUTSIDE the country. So it is not trusted — the result is tested against the part's own
 * rings and this THROWS when it lands outside, naming the shape. A subject whose box centre is not
 * inside itself needs a visual centre (`pointOnFeature`, which three flow beats already carry), and
 * finding that out at render time is the point; a silently mis-anchored name is what B6.10 was.
 *
 *  @parity */
export function subjectLabelAnchor(shape: BakedShape): [number, number] {
  const rings = labelHostPart(shape);
  const centre = bboxCenter(boundingBoxOf(rings));
  if (!pointInRings(centre, rings))
    throw new Error(
      `the box centre of ${shape.key}'s largest part, (${centre[0].toFixed(1)}, ${centre[1].toFixed(1)}), ` +
        `is not inside the shape — this subject is concave enough that its name needs a visual ` +
        `centre (pole of inaccessibility), not a box centre`,
    );
  return centre;
}

// ── Language ───────────────────────────────────────────────────────────────────────────────────

/** This beat's readers write a decimal point. English only, project-wide, this branch.
 *  @parity */
export function en(value: number, decimals = 1): string {
  return new Intl.NumberFormat("en-GB", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}
