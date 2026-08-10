/**
 * The pure half of THIS beat: the join, the classes, the ramp, the ring arithmetic. No browser, no
 * rasteriser — this is what makes the join testable at all, and what lets the bake step (node) and
 * a test import it without either dragging a browser's runtime behind it.
 *
 * This is this beat's OWN physical copy of the relevant pieces of `twin-map-beat/assets/geo.ts`
 * (`references/geo-discipline.md` rule 3's own header note: a beat carries its own copy, never an
 * import across proof/ beats or out of a skill — see `mapmore-flow-danube/geo-flow.ts`'s header for
 * the same rule stated there). Trimmed to what a WEB beat needs: no `revealOrder` (that is this
 * project's own answer to `geo-discipline.md` rule 10, "a choropleth's reveal order is the value
 * order" — a rule about a VIDEO's time axis; a static SVG has no frames to reveal across). Kept:
 * `scalePosition`, because this beat's own legend still places two named marks (the subject and the
 * comparison) on one continuous scale beside the discrete class bar, the same way
 * `twin-map-beat/assets/Co2MapStill.tsx` does.
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
 *  `twin-map-beat/assets/geo.ts`'s own `CO2_BREAKS` uses for the same quantity (CO₂ per capita):
 *  under 2, then 2s, then 10 and over. Reused deliberately, not re-derived, because it is the same
 *  measured quantity and there is no reason for two different beats to draw two different class
 *  boundaries for it. */
export const CO2_BREAKS = [2, 4, 6, 8, 10];

// ── Reading the source ─────────────────────────────────────────────────────────────────────────

/** This beat's own frozen csv: `Code,Entity,Year,value`, already filtered to 2023 and the 41
 *  declared codes (see `co2-per-capita-2023.csv` in this folder — produced once, by a script, from
 *  the real OWID source this project already carries, never hand-typed). 
 *  @parity-exempt: takes a `year` where the beat animates one and does not where it does not; the frozen CSVs differ in shape, not the join. */
export function valuesFromCsv(csv: string): Map<string, number> {
  const [header, ...rows] = csv.trim().split(/\r?\n/);
  const columns = (header ?? "").split(",");
  const codeAt = columns.indexOf("Code");
  const valueAt = columns.indexOf("value");
  if (codeAt < 0 || valueAt < 0)
    throw new Error(`csv has no Code / value column, got: ${header}`);

  const values = new Map<string, number>();
  for (const row of rows) {
    if (!row) continue;
    const cells = row.split(",");
    const value = Number(cells[valueAt]);
    if (!cells[codeAt] || cells[valueAt] === "" || !Number.isFinite(value))
      continue;
    values.set(cells[codeAt]!, value);
  }
  return values;
}

// ── The join ───────────────────────────────────────────────────────────────────────────────────

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

/** `geo-discipline.md` rule 7: no-data is its OWN distinct mid-grey, darker than the land and
 *  outside the ramp — never a shade the ramp itself could have produced, and never a texture (the
 *  rule's own account of why a hatch reads illegibly at the size a no-data region is actually drawn
 *  on a newsroom map). Fixed, not derived from the ground, for the same reason the water tint below
 *  is fixed: a no-data reading must stay recognisable across every newsroom's own ground colour. */
export const NO_DATA_FILL = "#B9B9B9";

/** `geo-discipline.md` rule 7: water is a blue tint, never grey — the fix this beat's own bake
 *  applies to `dataviz-light`'s `Water`/`Water shadow` layers before capture. */
export const WATER_FILL = "#AAC9E0";

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
 * `twin-map-beat/scripts/bake-plate.mjs`'s own `ringsOf` and `mapmore-flow-danube/geo-flow.ts`'s
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
