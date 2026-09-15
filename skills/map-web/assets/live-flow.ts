// twin/skills/map-web/assets/live-flow.ts
//
// THE ORIGIN-DESTINATION FAN AS A LIVE MAP — every band a MapLibre layer over MapTiler's own tiles —
// AND THE ONE GESTURE THAT BELONGS TO THIS TYPE AND TO NO OTHER: what DIVIDES a band.
//
// THE RULING (2026-09-15, the owner, on `proof/web-choropleth-europe-lowcarbon`: « là c'est top »).
// A directed web map is now: every mark a MapLibre layer, MapTiler's own zoom, pan, wheel, keyboard
// and hover, the map filling the figure's width, and a frozen image baked from the SAME page beneath
// it for the day the key lapses. `live-choropleth.ts` is the worked pattern and this file copies its
// arrangement rather than inventing a second one.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// WHY THE GESTURE AND THE LAYERS ARE ONE FILE HERE, WHERE THE CHOROPLETH KEEPS THEM IN TWO.
//
// `classing.ts` is a rule over ONE column of numbers: any map type that paints regions can take it,
// and it is written to be taken. What this file's gesture measures is a property of a PAIR MARK —
// a band has two ends, so its width has a denominator, and the denominator is the place at the far
// end. No other type in the catalogue has a second place to divide by. There is no sibling to share
// it with, and splitting it would manufacture exactly the crossing the choropleth then had to write
// `assertClassingReachesTheLayers` for: the table re-widening under a measure the map does not
// paint. The two halves are derived from ONE table here, and both guards below read the WRITTEN
// page back against a SECOND derivation from the raw numbers — never against the object the plan
// was built from, which is the green mutation that branch has already paid for once.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// THE GESTURE, ARGUED.
//
// A flow map's mark is a MOVEMENT between two places. It carries an origin, a destination, a volume
// and a direction at once, and the volume is carried by ONE channel: the width. Minard's rule, kept
// here, is that nothing else on the page encodes it.
//
// So a flow map hides two things a still cannot hand back:
//
//   1. WHAT THE WIDTH IS DIVIDED BY. Every other mark on every other map type measures the place it
//      sits on — one place, one denominator, and the map wears it. A band measures what left one
//      place and arrived in another, so its width may honestly be the count of people, the count
//      per inhabitant of the receiving country, or the count per square kilometre of its ground.
//      A still picks one and the picture carries no trace of the pick: the reader sees "wide =
//      a lot" and cannot know a lot of what.
//   2. MOST OF THE FLOWS. This is the type's named failure — every band drawn is a line across all
//      the others, and a fan of thirty is a hairball. The only honest answer is Minard's: a band too
//      thin to see is COUNTED, not drawn. Which bands those are is a function of the denominator,
//      and it is not a stable set: on the beat this file was written for, thirteen of thirty-one
//      destinations fall under the floor when the width is people, two when it is people per
//      thousand inhabitants, seven when it is people per thousand square kilometres.
//
// One control answers both, because they are one fact. The reader holds the denominator; the fan
// re-widens around two ends that never move, and a derived sentence says who took the lead and how
// many destinations the new measure buried.
//
// WHAT IT IS NOT, MEASURED AGAINST THE THREE VOCABULARIES THAT ALREADY EXIST ON THE MAP SIDE:
//   - `classing.ts` moves the BOUNDS over fixed values. There are no bounds here: a width is
//     continuous, and a flow map has no classes to cut.
//   - `area-scale.ts` moves the LAW that turns a value into a size — the exponent. The law never
//     moves here (width ∝ value is Minard's rule and this beat does not get to renegotiate it); the
//     VALUE moves.
//   - `filter.ts` promises that marks outside a named set leave AND that the frame they were
//     measured against does not. This is the opposite on both counts: nothing is selected, the whole
//     scale is remade, and a band leaves the drawing because the new measure made it too thin — never
//     because a reader pointed at it.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// TWO THINGS THE LAYERS HAVE TO GET RIGHT, AND BOTH ARE THIS TYPE'S OWN.
//
// 1. A WIDTH IS A VOLUME, SO IT MUST NOT GROW WITH THE ZOOM. `live-map.mjs` names three radius
//    behaviours: `camera` (a size that encodes a VALUE — derived once from the plan, then held
//    constant in screen pixels while the reader zooms, "because the same number must not mean two
//    things at two zooms"), `ground` (a mark standing for a fixed piece of ground, whose screen size
//    doubles per zoom level), and `fixed` (a pin, which is not a measurement at all). THIS IS
//    `camera`, and the way it is obtained is by construction rather than by an expression: a band is
//    a `line` layer, MapLibre's `line-width` is natively in screen pixels, and NO zoom expression is
//    written for it. A ribbon drawn as a polygon would be `ground` — it would double in width at
//    every zoom level, and a volume would silently become an area.
//
// 2. THE CURVE IS GEOMETRY WE MANUFACTURE, AND IT MAY NOT IMPLY A ROUTE. Each band is a quadratic
//    Bézier computed IN THE MAP'S OWN PROJECTED PLANE (x = longitude, y = Mercator northing),
//    sampled and converted back to latitudes, handed over as a `LineString` in degrees. Two
//    properties make it honest, and the beat's reading line says so in the reader's own words:
//      - the shape is a PURE FUNCTION OF THE TWO ENDPOINTS. The control point sits on the chord's
//        perpendicular bisector at a fixed fraction of the chord. Two flows of opposite volume
//        between the same two places would draw the identical curve, so the shape carries NO datum —
//        there is nothing in it for a reader to mistake for a path;
//      - it is computed in the plane the map draws, so it is the same curve at every zoom and stays
//        welded to its two ends. A curve computed in screen space slides off the geography on the
//        first drag.
//    What IS exact is the width, the two ends, and the bearing the band leaves the origin on.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// THE Z-ORDER IS PART OF THE ANSWER TO THE HAIRBALL. The features are written widest-first, so the
// thinnest band is always drawn last and is always the one a pointer can reach where it crosses a
// wide one. And the pointer is resolved over a padded box rather than a point: `queryRenderedFeatures`
// answers a line within a pixel or two of its stroke, and a band drawn at the floor is a pixel and a
// half wide — a mark a reader can see and cannot hit is the choropleth's hollow-country defect
// wearing this type's costume.

/** Assembled, never written whole: this file's OUTPUT travels into a page that `deliver` rewrites
 *  every occurrence of the placeholder in. A literal here would be rewritten to the key itself and
 *  "is this page still unkeyed" would then read "does the style URL contain the key", which is true
 *  of every delivered page — so every delivered map would refuse to boot. */
export const KEY_PLACEHOLDER = "__MAPTILER" + "_KEY__";

// ══════════════════════════════════════════════════════════════════════════════════════════════
// SECTION A — THE MEASURE. What divides a band, handed to the reader.
// ══════════════════════════════════════════════════════════════════════════════════════════════

/** One way of measuring the same movement. */
export type FlowMeasure = {
  /** The slug source — what the radio's id, the generated selectors and the plan's key are built
   *  from. ONE function derives it (`flowSlugOf`), because the last time this tree derived such a
   *  string two ways a whole map emptied with nothing red. */
  key: string;
  /** The pill's own words. */
  label: string;
  /** What a reader who is not looking at the map hears. Must CONTAIN the visible label — WCAG 2.5.3
   *  "label in name", not a stylistic preference. */
  announce: string;
  /** The derived sentence this measure owes the reader, or `null` for the measure the plate is
   *  drawn in: that one is not a comparison, it IS the claim, and a sentence under it would restate
   *  the plate. The same bargain `classing.ts` strikes with its own opening rule. */
  note: string | null;
  /** What the key's rungs say under this measure, widest first — one string per rung, in this
   *  measure's own unit. A band width nobody can convert is a ribbon. */
  keyLabels: string[];
  /** Every drawn code's width in CSS pixels under this measure. Under the floor means the band is
   *  COUNTED rather than drawn, and that is what `drawnUnder` reads back. */
  widthByCode: Record<string, number>;
};

export type FlowMeasureDeclaration = {
  /** The `<legend>` — in the beat's own words. */
  label: string;
  /** Which measure the plate itself is drawn in, and the state a reader who touches nothing sees. */
  defaultKey: string;
  /** The widest band on the page, in CSS pixels, and the floor under which a band is counted rather
   *  than drawn. Both belong to the DRAWING and not to the camera: they are screen pixels, held
   *  constant through every zoom, which is what makes the width a volume. */
  maxWidth: number;
  minWidth: number;
  measures: FlowMeasure[];
};

/** The raw numbers the guards re-derive the widths from — a SECOND derivation, on purpose. */
export type FlowReading = {
  code: string;
  /** One value per measure, in the declaration's own order. */
  values: number[];
};

/** A CSS-id-safe slug. */
export function flowSlugOf(key: string): string {
  return String(key)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** The radio id for a measure's slug. */
export function flowOptionId(idPrefix: string, slug: string): string {
  return `${idPrefix}-${flowSlugOf(slug)}`;
}

/** Which codes a measure actually DRAWS — the rest are counted into the remainder. Derived here and
 *  nowhere else, so the markup, the live plan and both guards cannot disagree about it. */
export function drawnUnder(
  declaration: FlowMeasureDeclaration,
  measure: FlowMeasure,
): string[] {
  return Object.keys(measure.widthByCode)
    .filter((code) => measure.widthByCode[code] >= declaration.minWidth)
    .sort();
}

/**
 * THE WIDTH LAW, STATED ONCE. Width ∝ value, anchored so that the largest value under a measure
 * takes `maxWidth`. It is Minard's rule and it is not a parameter: the exponent a proportional
 * symbol hands its reader is a square root because a circle's AREA is what the eye compares, and a
 * band's width is compared directly.
 *
 * Exported because the RUNNER builds the drawn widths with it and the GUARDS rebuild them with it
 * from the raw numbers — which is what makes those two genuinely two derivations rather than two
 * readings of one variable.
 */
export function flowWidthOf(value: number, top: number, maxWidth: number): number {
  if (!(top > 0)) throw new Error("live-flow: a measure whose largest value is not positive has no scale");
  return Math.round(((value / top) * maxWidth + Number.EPSILON) * 100) / 100;
}

export function assertFlowMeasureDeclaration(
  d: FlowMeasureDeclaration,
  readings: FlowReading[],
): FlowMeasureDeclaration {
  if (!d || !Array.isArray(d.measures) || d.measures.length < 2)
    throw new Error(
      "live-flow: a measure control needs at least two measures; one is the plate under a legend",
    );
  if (!(d.maxWidth > 0) || !(d.minWidth > 0) || !(d.minWidth < d.maxWidth))
    throw new Error(
      `live-flow: the widest band is ${d.maxWidth} px and the floor is ${d.minWidth} px — a floor at ` +
        `or above the ceiling would count every destination and draw none`,
    );
  if (!d.measures.some((m) => m.key === d.defaultKey))
    throw new Error(
      `live-flow: the page opens on the measure ${JSON.stringify(d.defaultKey)} and no measure carries that key`,
    );
  const slugs = new Set<string>();
  for (const m of d.measures) {
    const slug = flowSlugOf(m.key);
    if (slugs.has(slug))
      throw new Error(`live-flow: two measures slug to ${JSON.stringify(slug)}; one radio would answer for both`);
    slugs.add(slug);
    if (!m.label || !m.announce)
      throw new Error(`live-flow: the measure ${JSON.stringify(m.key)} has no label or no announcement`);
    if (!m.announce.includes(m.label))
      throw new Error(
        `live-flow: the measure ${JSON.stringify(m.key)} announces ${JSON.stringify(m.announce)}, which does ` +
          `not contain its visible label ${JSON.stringify(m.label)} — WCAG 2.5.3 asks that a reader ` +
          `who says what they see reaches the control they see`,
      );
    for (const reading of readings) {
      const w = m.widthByCode[reading.code];
      if (!(Number.isFinite(w) && w >= 0))
        throw new Error(
          `live-flow: the measure ${JSON.stringify(m.key)} gives ${reading.code} the width ${JSON.stringify(w)}. ` +
            `A destination with no width under a measure is a flow that vanishes without being counted.`,
        );
      if (w > d.maxWidth + 0.01)
        throw new Error(
          `live-flow: ${reading.code} is ${w} px wide under ${JSON.stringify(m.key)} and the widest band on ` +
            `the page is ${d.maxWidth} px — the scale is anchored on the largest value, so nothing may pass it`,
        );
    }
    if (!drawnUnder(d, m).length)
      throw new Error(
        `live-flow: under ${JSON.stringify(m.key)} not one band clears the ${d.minWidth} px floor, so the map ` +
          `would be an origin node and a remainder`,
      );
  }
  /**
   * THE REFUSAL THIS FILE EXISTS TO MAKE, and it is not the format's generic one.
   *
   * A measure that is the default times a constant draws the IDENTICAL picture: same order, same
   * relative widths, same set under the floor. "The share of the total" is exactly that, and it is
   * the obvious fourth pill anybody would reach for. The format's `assertInteractionPlan` would not
   * catch it — the note would be a new sentence, so the control would measure as changing the page —
   * and the reader would work the pill and watch nothing move.
   */
  const base = d.measures.find((m) => m.key === d.defaultKey)!;
  for (const m of d.measures) {
    if (m.key === d.defaultKey) continue;
    const ratios = readings
      .map((r) => [m.widthByCode[r.code], base.widthByCode[r.code]] as const)
      .filter(([, b]) => b > 0)
      .map(([a, b]) => a / b);
    const lo = Math.min(...ratios);
    const hi = Math.max(...ratios);
    if (ratios.length > 1 && hi / lo < 1.02)
      throw new Error(
        `live-flow: the measure ${JSON.stringify(m.key)} is the opening measure times ` +
          `${((lo + hi) / 2).toFixed(3)} for every destination, so it draws the same fan at a different ` +
          `scale — the same picture under a second name. A denominator that is the same for every ` +
          `destination is not a denominator, it is a unit.`,
      );
  }
  return d;
}

/** The options a component draws, in declaration order. */
export function flowMeasureOptionsForMarkup(
  d: FlowMeasureDeclaration,
  idPrefix: string,
): { id: string; slug: string; label: string; announce: string; isDefault: boolean }[] {
  const defaultSlug = flowSlugOf(d.defaultKey);
  return d.measures.map((m) => {
    const slug = flowSlugOf(m.key);
    return { id: flowOptionId(idPrefix, slug), slug, label: m.label, announce: m.announce, isDefault: slug === defaultSlug };
  });
}

/** Every sentence a measure owes the reader, by the slug that reveals it. The default has none. */
export function flowMeasureNotesForMarkup(d: FlowMeasureDeclaration): { slug: string; text: string }[] {
  return d.measures
    .filter((m) => m.note !== null)
    .map((m) => ({ slug: flowSlugOf(m.key), text: m.note as string }));
}

/**
 * The key, rung by rung: for each rung, every measure's own words for it. A component draws all of
 * them stacked in one grid cell and the stylesheet reveals one — which is what keeps a rung as wide
 * as the longest of its labels so the rail cannot reflow when the reader changes their mind (the
 * owner's first arbitration, held by the drawing rather than promised).
 */
export function flowKeyForMarkup(d: FlowMeasureDeclaration): { slug: string; text: string }[][] {
  const rungs = d.measures[0].keyLabels.length;
  for (const m of d.measures)
    if (m.keyLabels.length !== rungs)
      throw new Error(
        `live-flow: the measure ${JSON.stringify(m.key)} labels ${m.keyLabels.length} key rungs and ` +
          `${JSON.stringify(d.measures[0].key)} labels ${rungs}. The rungs are one rail of stacked cells; ` +
          `a measure with fewer would empty a cell and let the rail reflow.`,
      );
  return Array.from({ length: rungs }, (_, rung) =>
    d.measures.map((m) => ({ slug: flowSlugOf(m.key), text: m.keyLabels[rung] })),
  );
}

/**
 * THE STYLESHEET, AND IT IS THE WHOLE NO-SCRIPT HALF OF THE GESTURE. Pure CSS: `:has()` on the
 * scope plus `:checked` on a real radio. Nothing runs, so the table answers a reader whose script is
 * blocked exactly as it answers one whose script is not.
 *
 * THE DEFAULT MEASURE IS EMITTED TWICE ON PURPOSE — once unscoped, which is the state an engine with
 * no `:has()` never leaves and the state the SSR'd page opens in, and once under its own
 * `:has(#…:checked)`, so no measure is a special case that could drift from the others.
 *
 * NO SELECTOR HERE IS GROUPED: a descendant prefix binds to the first selector of a group only, the
 * defect `stack.ts` records at length.
 */
export function flowMeasureCss(
  d: FlowMeasureDeclaration,
  {
    scope,
    idPrefix,
    ribbon,
    counted,
    changeMs,
  }: {
    scope: string;
    idPrefix: string;
    /** What a drawn band's sample is painted — the beat's own measured colour, never named here. */
    ribbon: string;
    /** The dashed stub a COUNTED band wears, borrowed from the choropleth's hollow swatch: a reader
     *  who has learnt "dashed means this shape carries no ink of its own" reads it once. */
    counted: string;
    changeMs: number;
  },
): string {
  assertFlowMeasureDeclaration(d, Object.keys(d.measures[0].widthByCode).map((code) => ({ code, values: [] })));
  if (!Number.isFinite(changeMs) || changeMs < 0)
    throw new Error(`live-flow: changeMs must be a non-negative number, got ${changeMs}`);
  const defaultSlug = flowSlugOf(d.defaultKey);
  const lines: string[] = [
    `/* What divides a band: ${d.measures.length} measures over ${JSON.stringify(d.label)}. Radios plus`,
    `   :checked/:has(), generated once at build time — no script, and the reader keeps the gesture`,
    `   in the table when the live map cannot carry it. */`,
    `${scope} [data-stack-note] { visibility: hidden; }`,
    `${scope} [data-flow-var] { opacity: 0; visibility: hidden; }`,
    `${scope} .flow-var { display: grid; align-items: center; }`,
    `${scope} .flow-var > [data-flow-var] { grid-area: 1 / 1; white-space: nowrap; }`,
    `${scope} .bw { display: block; height: 10px; box-sizing: border-box; }`,
  ];

  const paint = (on: string, measure: FlowMeasure) => {
    for (const [code, width] of Object.entries(measure.widthByCode)) {
      const drawn = width >= d.minWidth;
      lines.push(
        drawn
          ? `${on} .bw[data-flow-code="${code}"] { width: ${width}px; background: ${ribbon}; border: 0; }`
          : // COUNTED, NOT DRAWN — and the stub is a fixed 6 px so the reader can see that the row is
            // still in the total. Its real width under this measure is in the row's own cells.
            `${on} .bw[data-flow-code="${code}"] { width: 6px; background: transparent; border: 1px dashed ${counted}; }`,
      );
    }
  };

  const base = d.measures.find((m) => m.key === d.defaultKey)!;
  paint(scope, base);
  lines.push(`${scope} [data-flow-var="${defaultSlug}"] { opacity: 1; visibility: visible; }`);

  for (const measure of d.measures) {
    const slug = flowSlugOf(measure.key);
    const on = `${scope}:has(#${flowOptionId(idPrefix, slug)}:checked)`;
    lines.push(`${on} [data-flow-var] { opacity: 0; visibility: hidden; }`);
    paint(on, measure);
    lines.push(`${on} [data-flow-var="${slug}"] { opacity: 1; visibility: visible; }`);
    if (measure.note !== null) lines.push(`${on} [data-stack-note="${slug}"] { visibility: visible; }`);
  }

  // THE TRAVEL IS THE READING: thirty-one samples re-width together and only the ones the new
  // denominator moved actually travel, so WHICH destinations the measure promoted is visible as
  // motion and not only as a before-and-after a reader has to hold in their head. The owner's fourth
  // arbitration, and `width` on an always-rendered box is a property a transition can interpolate,
  // which `display` is not.
  lines.push(
    `@media (prefers-reduced-motion: no-preference) {`,
    `  ${scope} .bw { transition: width ${changeMs}ms cubic-bezier(0.4, 0, 0.2, 1), background-color ${changeMs}ms linear; }`,
    `  ${scope} [data-flow-var] { transition: opacity ${changeMs}ms ease, visibility ${changeMs}ms; }`,
    `}`,
  );
  return lines.join("\n");
}

// ══════════════════════════════════════════════════════════════════════════════════════════════
// SECTION B — THE LIVE MAP.
// ══════════════════════════════════════════════════════════════════════════════════════════════

/** THE COUNTRIES THIS BEAT DRAWS ITSELF, when its own marks do not carry them.
 *
 *  A choropleth fills all forty countries: its marks ARE the geography, and it draws them as its own
 *  MapLibre layers over MapTiler's Countries tileset, joined by ISO A2. A fan of 31 bands carries no
 *  country at all, so it takes the SAME mechanism — the same tileset, the same level-0 filter, the
 *  same two layers beneath the basemap's water. The only difference is what a fill means: there a
 *  class, here neutral ground.
 *
 *  What it is NOT is MapTiler's own frontier lines and place names kept and re-tinted. That was
 *  tried, and the owner read it against the choropleth he had just validated: a kept provider layer
 *  reads as a provider basemap with our tints on it. The provider's lines and its words stay hidden,
 *  as the trunk's sweep intends; the countries are ours.
 *
 *  Absent, nothing is drawn and the beat keeps the bare sweep it had. */
export type LiveCountries = {
  /** The one neutral land tint every country is filled with — `countryGround`'s `fill`. */
  fill: string;
  /** The frontier between them, and the coast around them — `countryGround`'s `border`. */
  border: string;
  /** Its weight in screen pixels, the choropleth's own. */
  width: number;
};

export type LiveFlowDeclaration = {
  /** The MapTiler style the plate was baked from. The live map loads the same one, so the two layers
   *  cannot be two cartographies. */
  style: string;
  tints: { water: string; land: string };
  /** See `LiveCountries`. Absent, no country is drawn. */
  countries?: LiveCountries;
  /** What the camera fits to at runtime — the study set's own box, the same one the plate was baked
   *  by fitting, so the frozen image and the live map are ONE camera rather than two that agree. */
  studyBounds: { west: number; east: number; south: number; north: number };
  frame: { width: number; height: number };
  degreesPerPixel: number;
  /** The fan, one feature per destination, ALREADY SORTED WIDEST FIRST under the opening measure, so
   *  the thinnest band is drawn last and is the one a pointer reaches at a crossing. Each feature
   *  carries `code` in its properties and a `LineString` in degrees. */
  bands: { type: "FeatureCollection"; features: any[] };
  /** Where every band leaves from. A pin, not a measurement: `radius: "fixed"`. */
  origin: { lon: number; lat: number; radius: number; fill: string; edge: string };
  /** The ribbon's ink and how much of it a crossing lets through. One hue, one opacity, measured by
   *  the beat against the water AND the land the plate is baked in. */
  ribbon: { colour: string; opacity: number; active: string };
  measures: FlowMeasureDeclaration;
  /** What the pointer answers for each code. */
  details: Record<string, string>;
  locale: { title: string; zoomIn: string; zoomOut: string };
  changeMs: number;
  /** THE TWO CLOSEST DESTINATIONS THE MAP DRAWS, and the reader's zoom CEILING is derived from them
   *  and may not be typed. On a choropleth the ceiling is where the smallest country becomes
   *  pointable; on a fan every band converges on one node, so what a reader zooms IN to separate is
   *  not a country's width but the two nearest ENDS. */
  closest: { a: string; b: string; degrees: number };
};

const CODE = /^[A-Za-z0-9_-]{2,8}$/;

export function assertLiveFlowDeclaration(d: LiveFlowDeclaration): LiveFlowDeclaration {
  if (!d || typeof d.style !== "string" || !d.style)
    throw new Error("live-flow: the declaration names no MapTiler style, so the live map and the baked plate would be two cartographies");
  for (const key of ["water", "land"] as const)
    if (!/^#[0-9a-fA-F]{6}$/.test(d.tints?.[key] ?? ""))
      throw new Error(`live-flow: the ${key} tint is ${JSON.stringify(d.tints?.[key])}; the live style is painted with the plate's own two tints, read back from its geometry.json`);
  const b = d.studyBounds;
  if (!b || !(b.west < b.east) || !(b.south < b.north))
    throw new Error(`live-flow: the study bounds are ${JSON.stringify(b)} — \`fitBounds\` answers an inverted or empty box by framing the rest of the world`);
  if (!(d.frame?.width > 0) || !(d.frame?.height > 0) || !(d.degreesPerPixel > 0))
    throw new Error("live-flow: this plate predates the camera facts (frame + degreesPerPixel): re-bake it");
  const features = d.bands?.features ?? [];
  if (!features.length)
    throw new Error("live-flow: the fan carries no band, so the map would be an origin node on a basemap");
  const seen = new Set<string>();
  for (const feature of features) {
    const code = feature?.properties?.code;
    if (!CODE.test(String(code)))
      throw new Error(`live-flow: ${JSON.stringify(code)} is not a usable band key; the paint expressions and the table's rows are matched on it`);
    if (seen.has(code))
      throw new Error(`live-flow: two bands carry the code ${code}; one would take the other's width and the other's answer`);
    seen.add(code);
    const coords = feature?.geometry?.coordinates;
    if (feature?.geometry?.type !== "LineString" || !Array.isArray(coords) || coords.length < 3)
      throw new Error(
        `live-flow: the band for ${code} is not a sampled LineString. A two-point line is a straight ` +
          `segment in the projected plane, which is a rhumb line on the ground and not the curve the ` +
          `beat argued for; a curve is sampled or it is not a curve.`,
      );
    if (!d.details?.[code])
      throw new Error(`live-flow: ${code} is drawn and answers nothing. A band a reader can point at and get silence from is a band they read as carrying no number.`);
  }
  for (const measure of d.measures.measures)
    for (const code of seen)
      if (!Number.isFinite(measure.widthByCode[code]))
        throw new Error(`live-flow: the measure ${JSON.stringify(measure.key)} gives the drawn band ${code} no width`);
  if (!(d.origin?.radius > 0) || !/^#[0-9a-fA-F]{6}$/.test(d.origin?.fill ?? ""))
    throw new Error("live-flow: the fan has no origin node; every band leaves from a place and the place is on the map");
  if (!(d.ribbon?.opacity > 0) || !(d.ribbon.opacity <= 1) || !/^#[0-9a-fA-F]{6}$/.test(d.ribbon?.colour ?? ""))
    throw new Error("live-flow: the ribbon needs an ink and an opacity the beat has measured against the water and the land it crosses");
  for (const key of ["title", "zoomIn", "zoomOut"] as const)
    if (!d.locale?.[key])
      throw new Error(`live-flow: MapLibre's ${key} control is left with the library's English default on a French page`);
  if (!(d.changeMs >= 0))
    throw new Error("live-flow: the width change needs a duration (the owner's fourth arbitration: a state change interpolates rather than jumps)");
  if (!(d.closest?.degrees > 0) || !d.closest?.a || !d.closest?.b)
    throw new Error(
      "live-flow: the zoom ceiling is derived from the two closest destinations the map draws, and the " +
        "declaration names none. A ceiling typed instead of derived is a number nobody can defend.",
    );
  assertFlowMeasureDeclaration(
    d.measures,
    [...seen].map((code) => ({ code, values: [] })),
  );
  return d;
}

/** The `line-width` expression for one measure — a `match` on the band's own code, in SCREEN pixels,
 *  with NO zoom term, which is the whole of behaviour (1) above. */
function widthExpressionFor(d: LiveFlowDeclaration, measure: FlowMeasure): unknown[] {
  const codes = d.bands.features.map((f: any) => f.properties.code);
  return [
    "match",
    ["get", "code"],
    ...codes.flatMap((code: string) => [[code], measure.widthByCode[code]] as unknown[]),
    0,
  ];
}

/** Which bands a measure draws at all — the rest are counted into the remainder the note states. */
function drawnFilterFor(d: LiveFlowDeclaration, measure: FlowMeasure): unknown[] {
  return ["match", ["get", "code"], drawnUnder(d.measures, measure), true, false];
}

/** THE COUNTRIES, AS THIS BEAT'S OWN LAYERS. The choropleth's mechanism, with a neutral fill in
 *  place of a class: MapTiler's Countries tileset (`administrative`, `level` 0 … 4, keyed on
 *  `iso_a2`), filtered to level 0, drawn BENEATH the basemap's water because Countries' coast is
 *  generalised per zoom and stands over the basemap's finer one — a country fill drawn above the
 *  water paints a coarse halo of land out into the sea.
 *
 *  Both layers are `ground: true`, which is how the mount tells them from a mark: no width clock
 *  runs on them, and no pointer ever answers from them. */
function countryLayers(d: LiveFlowDeclaration): Record<string, unknown>[] {
  if (!d.countries) return [];
  const source = {
    type: "vector",
    url: `https://api.maptiler.com/tiles/countries/tiles.json?key=${KEY_PLACEHOLDER}`,
  };
  const sourceLayer = "administrative";
  const level0 = ["==", ["get", "level"], 0];
  return [
    {
      id: "mw-countries",
      type: "fill",
      ground: true,
      beneath: "water",
      source,
      sourceLayer,
      filter: level0,
      paint: { "fill-color": d.countries.fill, "fill-opacity": 1 },
      hover: false,
    },
    {
      id: "mw-countries-edge",
      type: "line",
      ground: true,
      beneath: "water",
      source,
      sourceLayer,
      filter: level0,
      paint: { "line-color": d.countries.border, "line-width": d.countries.width },
      hover: false,
    },
  ];
}

/** THE PLAN THE PAGE CARRIES, as JSON, read back by a script that never met the code that wrote it.
 *  It is a FILE before it is an object, so what is checked here is checked again in the browser. */
export function liveFlowPlan(d: LiveFlowDeclaration): Record<string, unknown> {
  assertLiveFlowDeclaration(d);
  const opening = d.measures.measures.find((m) => m.key === d.measures.defaultKey)!;
  const layers: Record<string, unknown>[] = [
    ...countryLayers(d),
    // THE FAN. One `line` layer, repainted per measure — not one layer per band: the reader changes
    // measure with a click, and one layer is one place a width is decided.
    {
      id: "mw-bands",
      type: "line",
      data: d.bands,
      layout: { "line-cap": "round", "line-join": "round" },
      filter: drawnFilterFor(d, opening),
      paint: {
        "line-color": d.ribbon.colour,
        "line-opacity": d.ribbon.opacity,
        "line-width": widthExpressionFor(d, opening),
      },
      hover: true,
    },
    // WHAT A POINTED-AT BAND BECOMES: the band itself, in a fuller dose of its own ink, drawn ABOVE
    // the others — never a dot on top of it (the owner's second arbitration). A layer of its own,
    // because a band answered underneath the twenty others it crosses answers where the reader is
    // not looking. Filtered to nothing until a pointer lands.
    {
      id: "mw-bands-active",
      type: "line",
      data: d.bands,
      layout: { "line-cap": "round", "line-join": "round" },
      filter: ["==", ["get", "code"], "--"],
      paint: {
        "line-color": d.ribbon.active,
        "line-opacity": 1,
        "line-width": widthExpressionFor(d, opening),
      },
      hover: false,
    },
    // THE ORIGIN. A pin and not a measurement — `radius: "fixed"` in `live-map.mjs`'s vocabulary —
    // so it is the same size at every zoom and encodes nothing. Every band leaves from here.
    {
      id: "mw-origin",
      type: "circle",
      data: {
        type: "FeatureCollection",
        features: [{ type: "Feature", properties: { code: "origin" }, geometry: { type: "Point", coordinates: [d.origin.lon, d.origin.lat] } }],
      },
      paint: {
        "circle-radius": d.origin.radius,
        "circle-color": d.origin.fill,
        "circle-stroke-width": 1.5,
        "circle-stroke-color": d.origin.edge,
      },
      hover: false,
    },
  ];

  return {
    styleUrl: `https://api.maptiler.com/maps/${d.style}/style.json?key=${KEY_PLACEHOLDER}`,
    styleName: d.style,
    projection: "mercator",
    tints: d.tints,
    studyBounds: d.studyBounds,
    frame: d.frame,
    degreesPerPixel: d.degreesPerPixel,
    changeMs: d.changeMs,
    closest: d.closest,
    locale: d.locale,
    defaultSlug: flowSlugOf(d.measures.defaultKey),
    /** One repaint and one filter per measure, keyed by the SLUG the radio's id and value carry —
     *  one vocabulary, three readers (the radio, the stylesheet, this plan), which is what keeps the
     *  table and the map from answering two different denominators. */
    widths: Object.fromEntries(d.measures.measures.map((m) => [flowSlugOf(m.key), widthExpressionFor(d, m)])),
    drawn: Object.fromEntries(d.measures.measures.map((m) => [flowSlugOf(m.key), drawnFilterFor(d, m)])),
    layers,
  };
}

/**
 * THE RULES. Every one of them is conditional on `.mw-live` except the live box's own resting state,
 * so a page whose script never runs is drawn exactly as it was before this file existed.
 */
export function liveFlowCss({ scope }: { scope: string }): string {
  const live = `.mw-live ${scope}`;
  return [
    // BOTH LAYERS ARE ONE BOX, AND THE BOX IS THE STAGE. The format's cell carries the drawing's own
    // viewBox ratio so `preserveAspectRatio="none"` cannot stretch it; neither of these two is
    // stretched — the fallback is `slice` (cover) and a live map has no ratio to protect — so both
    // take the whole track rather than the cell inside it, which is how the scrolly sizes its stage.
    `${scope} .map-layer, ${scope} svg.chart { grid-column: 1 / -1; grid-row: 1; width: 100%; height: 100%; min-width: 0; min-height: 0; margin: 0; }`,
    `${scope} .map-layer { visibility: hidden; }`,
    `${live} .map-layer { visibility: visible; }`,
    // ONE BASEMAP, NOT TWO — and only once the live map is actually up: with no script the frozen
    // image is the whole picture.
    `${live} [data-plate] { display: none; }`,
    // WITH NO SCRIPT THERE IS NO DESCRIPTION EITHER: a sentence about dragging a map that cannot be
    // dragged is the dead control this arrangement exists not to ship. `[hidden]` is a UA rule, so it
    // is restated here as an author rule no author rule can outrank by accident.
    `${scope} .live-hint[hidden] { display: none; }`,
    // The row for the band a pointer is on answers at the same moment the band does, so one reading
    // has one answer in both halves of the page.
    `${scope} tr[data-mark] { transition: background-color 120ms linear; }`,
  ].join("\n\n");
}

/**
 * THE SCRIPT, authored as a classic `<script>` body — no module, no bundler, so it keeps working in
 * a CMS iframe or a sandboxed embed that refuses module scripts. It derives no geometry and formats
 * no WORD: every glyph a reader can be shown was cut into the page's own embedded faces at build
 * time, which is why the answers and the control names travel in the plan's JSON.
 */
export function liveFlowScript(
  d: LiveFlowDeclaration,
  { scope, styleModule, measureName }: { scope: string; styleModule: string; measureName: string },
): string {
  assertLiveFlowDeclaration(d);
  if (typeof styleModule !== "string" || !/function\s+applyLiveStyle/.test(styleModule))
    throw new Error(
      "live-flow: the style sweep is handed in by the beat (the source of `skills/map-web/assets/style.mjs`, " +
        "with its `export` keywords stripped) because a page script cannot import. What it was given does " +
        "not define `applyLiveStyle`.",
    );
  if (/\bexport\s/.test(styleModule))
    throw new Error(
      "live-flow: the style sweep still carries `export`, which is a syntax error in a classic script. The " +
        "whole live layer would fail to parse and the fallback would stand with no error anyone could see — " +
        "the one failure mode this arrangement cannot report.",
    );
  liveFlowPlan(d);
  const NAME = JSON.stringify(measureName);
  const SCOPE = JSON.stringify(scope);
  return `${styleModule}
(function () {
  var doc = document;
  var planNode = doc.getElementById("mw-live-plan");
  if (!planNode) return;
  var PLAN;
  try { PLAN = JSON.parse(planNode.textContent); } catch (err) { return; }
  // THE SENTINEL IS ASSEMBLED IN TWO HALVES, never written whole: delivery substitutes every
  // occurrence of the placeholder in the delivered file, and THIS SCRIPT IS IN THAT FILE.
  var SENTINEL = "__MAPTILER" + "_KEY__";
  if (!PLAN || !PLAN.styleUrl || PLAN.styleUrl.indexOf(SENTINEL) >= 0) return;
  if (!window.maplibregl) return;
  var figure = doc.querySelector(${SCOPE});
  var box = figure && figure.querySelector(".map-layer");
  if (!box) return;
  // THE TOOLTIP IS LOOKED UP LATE, ON PURPOSE. This script is inlined INSIDE the figure and the
  // format writes its "#tooltip" AFTER the figure, so at the moment this runs the element does not
  // exist yet. Captured at init it is null for the life of the page — the band lights up and says
  // nothing, which is exactly the shape of a defect that survives a unit test.
  function tip() { return doc.getElementById("tooltip"); }

  // THE PLAN IS VALIDATED BY WHOEVER DRAWS FROM IT. It reached here as JSON, from a render that ran
  // on another machine on another day: nothing the writer checked survived the journey.
  var seen = {};
  for (var i = 0; i < PLAN.layers.length; i++) {
    if (seen[PLAN.layers[i].id])
      throw new Error('two layers share the id "' + PLAN.layers[i].id + '" - MapLibre keeps the first and drops the second without an error');
    seen[PLAN.layers[i].id] = true;
  }
  if (!PLAN.studyBounds || !(PLAN.studyBounds.west < PLAN.studyBounds.east))
    throw new Error("this page's live plan carries no usable studyBounds - the camera has nothing to fit to");
  if (!(PLAN.degreesPerPixel > 0)) throw new Error("this page's live plan predates the camera facts");
  if (!PLAN.widths || !PLAN.widths[PLAN.defaultSlug])
    throw new Error("this page's live plan carries no width expression for the measure it opens on");

  // NO PADDING, AND THAT IS NOT A SAVING — IT IS THE SAME CAMERA. The frozen image under this map was
  // photographed from a live map fitted to the same window with padding 0; a live fit that padded it
  // would be a second camera and the swap would be visible as a jump.
  var FIT_PADDING_PX = 0;

  var map = new window.maplibregl.Map({
    container: box,
    style: PLAN.styleUrl,
    bounds: [[PLAN.studyBounds.west, PLAN.studyBounds.south], [PLAN.studyBounds.east, PLAN.studyBounds.north]],
    fitBoundsOptions: { padding: FIT_PADDING_PX, animate: false },
    maxZoom: 22,
    attributionControl: false,
    locale: {
      "NavigationControl.ZoomIn": PLAN.locale.zoomIn,
      "NavigationControl.ZoomOut": PLAN.locale.zoomOut,
      "Map.Title": PLAN.locale.title
    }
  });
  window.__mwMap = map;
  // MAPTILER'S OWN CONTROLS, by the owner's instruction. The compass is off: nothing here rotates,
  // and a control that changes nothing is a dead one.
  map.addControl(new window.maplibregl.NavigationControl({ showCompass: false }), "top-right");

  // THE ONE LAYER THE BEAT'S OWN COUNTRIES ARE DRAWN BENEATH. Countries' coast is generalised per
  // zoom and coarser than the basemap's own, so a country fill drawn ABOVE the water paints a halo
  // of land out into the sea along every fjord.
  function waterId() {
    var layers = map.getStyle().layers;
    for (var i = 0; i < layers.length; i++)
      if (styleDecisionFor(layers[i]).tint === "water") return layers[i].id;
    throw new Error("the style carries no water fill for this beat's countries to be drawn beneath, so MapTiler Countries' coarser coast would stand over the basemap's own");
  }

  function mountLayers() {
    var before = null;
    var vector = {};
    for (var i = 0; i < PLAN.layers.length; i++) {
      var layer = PLAN.layers[i];
      var source = "mw-src-" + i;
      if (layer.source) {
        // A VECTOR TILESET, SHARED BY EVERY LAYER THAT READS IT: MapTiler's Countries, the same one
        // the choropleth sibling joins on. Two sources on one url is two tile fetches for one map.
        var url = layer.source.url.replace(/[?#].*$/, "");
        if (!vector[url]) {
          vector[url] = source;
          map.addSource(source, { type: layer.source.type, url: layer.source.url });
        }
        source = vector[url];
      } else {
        map.addSource(source, { type: "geojson", data: layer.data });
      }
      var spec = { id: layer.id, type: layer.type, source: source, paint: layer.paint };
      if (layer.sourceLayer) spec["source-layer"] = layer.sourceLayer;
      if (layer.layout) spec.layout = layer.layout;
      if (layer.filter) spec.filter = layer.filter;
      // THE FAN IS DRAWN ON TOP OF EVERYTHING, and that is not the choropleth's decision reversed by
      // accident. A choropleth's fills go BENEATH the basemap's water because they are ground, and
      // Countries' coast is coarser than the basemap's. A band is a MARK that crosses the sea — the
      // one to Iceland is nothing but sea — so a band drawn beneath the water is a band a reader
      // cannot see for half its length.
      if (layer.beneath === "water") {
        if (before === null) before = waterId();
        map.addLayer(spec, before);
      } else map.addLayer(spec);
      // ONE CLOCK FOR THE WIDTH CHANGE, AND IT IS THE BEAT'S. MapLibre eases every paint change over
      // its own default 300 ms; the table's samples are eased by the stylesheet over the beat's own
      // number, and two clocks on one gesture is two halves of one reading coming apart mid-travel.
      // The frontier is GROUND and never changes width, so no clock runs on it.
      if (layer.type === "line" && !layer.ground)
        map.setPaintProperty(layer.id, "line-width-transition", { duration: PLAN.changeMs, delay: 0 }, { validate: false });
    }
  }

  function currentSlug() {
    var checked = doc.querySelector("input[name=" + ${NAME} + "]:checked");
    return (checked && checked.value) || PLAN.defaultSlug;
  }
  function paintMeasure(slug) {
    if (!PLAN.widths[slug]) return;
    if (map.getLayer("mw-bands")) {
      map.setPaintProperty("mw-bands", "line-width", PLAN.widths[slug]);
      map.setFilter("mw-bands", PLAN.drawn[slug]);
    }
    if (map.getLayer("mw-bands-active")) map.setPaintProperty("mw-bands-active", "line-width", PLAN.widths[slug]);
    figure.setAttribute("data-live-measure", slug);
  }

  map.on("style.load", function () {
    // A FLAT WEB MERCATOR MAP (the owner, 2026-09-15: "oui une carte MapLibre plate pas un globe").
    if (map.setProjection) map.setProjection({ type: PLAN.projection || "mercator" });
    // The trunk's own sweep, ASSERTED rather than assumed: a sweep that re-tinted nothing did not
    // find the style it was written against, and the reader would keep the provider's own water
    // under a plate painted in the beat's, with nothing to say so.
    assertLiveStyleAnswered(applyLiveStyle(map, { tints: PLAN.tints }), PLAN.styleName || PLAN.styleUrl);
    mountLayers();
    paintMeasure(currentSlug());
  });

  function fitToStudy() {
    map.setMaxBounds(null);
    map.setMinZoom(-2);
    map.fitBounds(
      [[PLAN.studyBounds.west, PLAN.studyBounds.south], [PLAN.studyBounds.east, PLAN.studyBounds.north]],
      { padding: FIT_PADDING_PX, animate: false }
    );
    var fitted = map.getZoom();
    var visible = map.getBounds();
    var visibleSpan = Math.abs(visible.getEast() - visible.getWest());
    // THE READER'S LEASH. The floor is the published framing — a reader can never pull back past the
    // view the title makes its claim about. The CEILING is where the two closest destinations the fan
    // reaches come apart by the 28 px this format gives a hit target: on a fan every band converges
    // on one node, so what a reader zooms in to separate is not a country's width, it is two ends
    // that sit on top of each other at the published framing. Derived from the view that RESULTED,
    // never typed, and set AFTER the fit: a bound set before it constrains the fit itself.
    map.setMinZoom(fitted);
    var closestPx = (PLAN.closest.degrees / visibleSpan) * map.getCanvas().clientWidth;
    map.setMaxZoom(fitted + Math.max(Math.log2(28 / Math.max(closestPx, 0.01)), 0));
    if (visibleSpan < 360) map.setMaxBounds(visible); else map.setMaxBounds(null);
    figure.setAttribute("data-live-view", map.getCenter().lng.toFixed(4) + "," + map.getCenter().lat.toFixed(4) + "@" + fitted.toFixed(3));
    figure.setAttribute("data-live-span", visibleSpan.toFixed(2));
  }

  map.on("load", function () {
    var plates = figure.querySelectorAll("[data-plate]");
    for (var i = 0; i < plates.length; i++) plates[i].setAttribute("aria-hidden", "true");
    doc.documentElement.classList.add("mw-live");
    var hint = figure.querySelector(".live-hint");
    if (hint) hint.hidden = false;
    map.resize();
    fitToStudy();
  });
  map.on("resize", function () {
    if (!doc.documentElement.classList.contains("mw-live")) return;
    fitToStudy();
  });
  // AND THE STAGE CAN CHANGE SIZE WITHOUT THE WINDOW, which MapLibre never hears about: the figure is
  // a flex column whose header settles when its faces load, and this box is the one shrinkable item
  // in it. A MapLibre "resize" fires only when MapLibre resizes ITSELF, so the observer is what turns
  // a settling layout into a re-fit rather than into a camera fitted for a box that no longer exists.
  if (window.ResizeObserver)
    new window.ResizeObserver(function () {
      if (!doc.documentElement.classList.contains("mw-live")) return;
      map.resize();
      fitToStudy();
    }).observe(box);

  doc.addEventListener("change", function (event) {
    if (!event.target || event.target.name !== ${NAME}) return;
    paintMeasure(event.target.value);
    hide();
  });

  var hovering = null;
  // THE ANSWER IS READ OFF THE ROW THE READING ALREADY HAS. One string, one place: the table's row
  // for a destination carries data-detail, the format's own contract for "what this mark answers",
  // and the live map reads it rather than carrying a second copy in the plan.
  function rowFor(code) { return figure.querySelector('tr[data-mark="' + code + '"]'); }
  function detailFor(code) { var row = rowFor(code); return row && row.getAttribute("data-detail"); }
  function hide() {
    hovering = null;
    var tooltip = tip();
    if (tooltip) tooltip.hidden = true;
    if (map.getLayer("mw-bands-active")) map.setFilter("mw-bands-active", ["==", ["get", "code"], "--"]);
    var lit = figure.querySelectorAll("tr[data-mark].mark-active");
    for (var i = 0; i < lit.length; i++) lit[i].classList.remove("mark-active");
  }
  function place(event) {
    var tooltip = tip();
    if (!tooltip || tooltip.hidden) return;
    var e = event && event.originalEvent;
    if (!e) return;
    var pad = 14;
    var x = Math.min(e.clientX + pad, window.innerWidth - tooltip.offsetWidth - 8);
    var y = Math.min(e.clientY + pad, window.innerHeight - tooltip.offsetHeight - 8);
    tooltip.style.left = Math.max(8, x) + "px";
    tooltip.style.top = Math.max(8, y) + "px";
  }
  function show(code, event) {
    if (code !== hovering) {
      hovering = code;
      if (map.getLayer("mw-bands-active")) map.setFilter("mw-bands-active", ["==", ["get", "code"], code]);
      var rows = figure.querySelectorAll("tr[data-mark]");
      for (var i = 0; i < rows.length; i++) rows[i].classList.toggle("mark-active", rows[i].getAttribute("data-mark") === code);
      var tooltip = tip();
      if (tooltip) { tooltip.textContent = detailFor(code); tooltip.hidden = false; }
    }
    place(event);
  }
  var hoverLayers = [];
  for (var h = 0; h < PLAN.layers.length; h++) if (PLAN.layers[h].hover) hoverLayers.push(PLAN.layers[h].id);
  // THE POINT FIRST, THE BOX ONLY IF THE POINT ANSWERS NOTHING — and both halves are needed.
  //
  // queryRenderedFeatures answers a LINE only within a pixel or two of its stroke, and a band at this
  // beat's floor is a pixel and a bit wide: on the point alone a reader can see thirty bands and
  // reach four, which is the choropleth's unpointable hollow country wearing this type's costume.
  // On the PAD alone the opposite defect appears, and it is worse: a hair drawn on top of a wide band
  // steals the answer from the band the pointer is actually on, because a box query returns render
  // order and not distance. Measured here by driving a pointer along every band in turn.
  var HIT_PAD = 6;
  map.on("mousemove", function (event) {
    var live = [];
    for (var i = 0; i < hoverLayers.length; i++) if (map.getLayer(hoverLayers[i])) live.push(hoverLayers[i]);
    var p = event.point;
    var hits = map.queryRenderedFeatures(p, { layers: live });
    if (!hits.length)
      hits = map.queryRenderedFeatures(
        [[p.x - HIT_PAD, p.y - HIT_PAD], [p.x + HIT_PAD, p.y + HIT_PAD]],
        { layers: live }
      );
    var code = hits.length && hits[0].properties ? hits[0].properties.code : null;
    if (!code || !detailFor(code)) { map.getCanvas().style.cursor = ""; hide(); return; }
    map.getCanvas().style.cursor = "pointer";
    show(code, event);
  });
  map.on("mouseout", hide);
  map.on("movestart", hide);
})();`;
}

/**
 * THE GUARD THAT READS THE WRITTEN PAGE BACK — the half no declaration-level check can make.
 *
 * It holds BOTH mechanisms against a SECOND derivation of the widths, rebuilt here from the raw
 * numbers the beat measured rather than from the object the plan was built out of. The first version
 * of the choropleth's twin compared the plan's expressions against the very map it was built from
 * and passed a mutation GREEN, because both sides were wrong together; `flowWidthOf` applied to
 * `readings` is genuinely the other derivation.
 */
export function assertMeasuresReachTheLayers(
  html: string,
  d: LiveFlowDeclaration,
  readings: FlowReading[],
  plateStyle: string,
  { where = "this page" }: { where?: string } = {},
): void {
  assertLiveFlowDeclaration(d);
  const node = /<script[^>]+id="mw-live-plan"[^>]*>([\s\S]*?)<\/script>/.exec(String(html));
  if (!node) throw new Error(`${where}: the page carries no live plan, so its map is a picture and its control moves the legend only`);
  let plan: any;
  try {
    plan = JSON.parse(node[1]);
  } catch (err) {
    throw new Error(`${where}: the live plan in the page is not JSON — MapLibre would never boot and the fallback would stand with nothing to say why`);
  }
  if (String(html).indexOf(`https://api.maptiler.com/maps/${d.style}/style.json?key=${KEY_PLACEHOLDER}`) < 0)
    throw new Error(`${where}: the committed page does not carry the delivery placeholder in its style URL — a real key has reached a file in the repository`);
  if (d.style !== plateStyle || plan.styleName !== plateStyle)
    throw new Error(
      `${where}: the live map loads the MapTiler style ${JSON.stringify(plan.styleName)} and the frozen image ` +
        `under it was photographed from ${JSON.stringify(plateStyle)}. The two layers are one cartography or ` +
        `they are a visible swap.`,
    );
  const drawnCodes = d.bands.features.map((f: any) => f.properties.code);
  for (const [i, measure] of d.measures.measures.entries()) {
    const slug = flowSlugOf(measure.key);
    const expression = plan.widths?.[slug];
    if (!Array.isArray(expression))
      throw new Error(
        `${where}: the live plan carries no width expression for the measure ${JSON.stringify(slug)}. The ` +
          `table's samples would re-widen under it and the map would keep the measure before it — one ` +
          `control, two denominators.`,
      );
    const painted = new Map<string, number>();
    for (let at = 2; at + 1 < expression.length; at += 2)
      for (const code of expression[at] as string[]) painted.set(code, expression[at + 1] as number);
    // THE SECOND DERIVATION: the width law applied to the raw numbers, anchored the way the markup
    // anchors it — on the largest value under THIS measure.
    const top = Math.max(...readings.map((r) => r.values[i]));
    for (const reading of readings) {
      const want = flowWidthOf(reading.values[i], top, d.measures.maxWidth);
      const got = painted.get(reading.code);
      if (got === undefined || Math.abs(got - want) > 0.011)
        throw new Error(
          `${where}: under the measure ${JSON.stringify(slug)} the live map draws ${reading.code} at ` +
            `${JSON.stringify(got ?? null)} px where the numbers the page carries make it ${want} px. Two ` +
            `derivations of one width is how half a beat re-widens and the other half keeps the ` +
            `denominator before it.`,
        );
    }
    if (painted.size !== drawnCodes.length)
      throw new Error(
        `${where}: under the measure ${JSON.stringify(slug)} the live map widths ${painted.size} bands and the ` +
          `fan carries ${drawnCodes.length}. A band the expression does not name falls back to the ` +
          `expression's default and is drawn at nothing.`,
      );
    const filter = plan.drawn?.[slug];
    const drawnInPlan = Array.isArray(filter) ? [...(filter[2] as string[])].sort() : null;
    const want = readings
      .filter((r) => flowWidthOf(r.values[i], top, d.measures.maxWidth) >= d.measures.minWidth)
      .map((r) => r.code)
      .sort();
    if (!drawnInPlan || drawnInPlan.join(",") !== want.join(","))
      throw new Error(
        `${where}: under the measure ${JSON.stringify(slug)} the live map draws ` +
          `${JSON.stringify(drawnInPlan)} and the numbers say ${JSON.stringify(want)}. Which bands fall under ` +
          `the floor IS the remainder the note counts, so a plan that disagrees with it prints a ` +
          `remainder for a fan it did not draw.`,
      );
  }
  if (!/class="map-layer"/.test(String(html)))
    throw new Error(`${where}: the page carries a live plan and no box to draw it in`);
  if (!/<p class="live-hint" hidden/.test(String(html)))
    throw new Error(
      `${where}: the sentence describing the live map's controls is not hidden in the delivered markup. With ` +
        `JavaScript off it is a description of a map that cannot be dragged — the dead control this ` +
        `arrangement exists not to ship.`,
    );
}

/**
 * THE MARKUP'S HALF, read back off the written page. A generated rule that is emitted, correct and
 * BEATEN is indistinguishable from one that works — in the markup and in a unit test alike — so what
 * is checked is the page a reader opens.
 */
export function assertOneMeasure(
  html: string,
  d: FlowMeasureDeclaration,
  idPrefix: string,
  codes: string[],
  { where = "this page" }: { where?: string } = {},
): void {
  const page = String(html);
  for (const measure of d.measures) {
    const slug = flowSlugOf(measure.key);
    const id = flowOptionId(idPrefix, slug);
    if (!page.includes(`id="${id}"`))
      throw new Error(`${where}: the measure ${JSON.stringify(slug)} has no radio on the page, so nothing answers it`);
    if (!page.includes(`#${id}:checked`))
      throw new Error(
        `${where}: nothing in this page's stylesheet answers the measure ${JSON.stringify(slug)}. The pill would ` +
          `check and the fan would keep the denominator before it — the defect a mutation on the stylesheet ` +
          `call found once, with every attribute perfectly correct.`,
      );
    if (measure.note !== null && !page.includes(`data-stack-note="${slug}"`))
      throw new Error(
        `${where}: the measure ${JSON.stringify(slug)} owes the reader a sentence and the page carries none. A ` +
          `moving control is measured by what it SAYS, because a transform is not a reading.`,
      );
  }
  for (const code of codes)
    if (!page.includes(`data-flow-code="${code}"`))
      throw new Error(
        `${where}: ${code} is drawn on the map and has no sample in the table, so a reader with no script never ` +
          `sees its width change. The table IS the gesture when the live map cannot carry it.`,
      );
  const missing = codes.filter((code) => !page.includes(`data-mark="${code}"`));
  if (missing.length)
    throw new Error(`${where}: ${missing.join(", ")} answer no pointer — the live map reads its answers off the table's own rows`);
}
