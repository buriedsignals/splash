// twin/shared/chart-beat/treatments.mjs
//
// THE TREATMENTS THE DESIGN BASE HAS FILED, AND THE DATA SHAPES THEY CLAIM.
//
// A treatment is CONDITIONAL and PLURAL: it applies when the beat's own facts have a shape, several
// apply to one beat at once, and `arbiter.mjs` resolves what they ask for. A direction, by
// contrast, is global and exclusive. The two meet only through `registers.mjs`.
//
// EVERY TREATMENT HERE IS FILED UNDER `docs/design-base/treatments/`, WITH TWO INDEPENDENT
// PUBLICATIONS BEHIND IT, and `treatments-apply-to-the-data-they-claim.test.ts` holds the two sets
// equal in both directions. A treatment in this file with no filed record is a design decision
// somebody took without a reference; a filed record with no entry here is knowledge that never
// reached a pixel, which is exactly how the predecessor branch died at 112 thumbnails.
//
// TWO KINDS, TWO BURDENS OF PROOF. An IMPORTED treatment takes a practice observed elsewhere and
// must cite two independent publications. A DERIVED treatment draws a fact the beat itself carries
// — its own geometry, its own declared reference level, its own series — and cites none, because
// there is nothing for a second publication to corroborate. It owes a `detect` and a rendered proof
// instead.
//
// The distinction was not there at first, and its absence cost the tool its precision for a day:
// `crossing-marked` was refused for want of a second publication, when what it draws is the value
// `crossingGeometry` ALREADY COMPUTES. The floor exists to stop a newsroom's habit being copied
// without its logic (`anti-patterns.md`, closing entry); applied to a fact the data contains, it
// refuses honest work. See `docs/design-base/METHOD.md`, correction 7.

/** Above this many marks, a label per mark cannot be placed without collision, and offering one
 *  would hand the arbiter a list it can only drop. Measured against the filed evidence: Ferdio's
 *  encodings carry three to six marks; `$$$Billions` carries about forty cells and prints them all,
 *  which is where this floor sits. */
const MOST_MARKS_THAT_CAN_CARRY_A_LABEL = 40;
/** Past this many readings behind one summary, drawing them individually makes a smear rather than
 *  a sample. Nature draws twenty and names the count on the plate. */
const MOST_READINGS_A_SAMPLE_CAN_SHOW = 40;

/**
 * The beat's own facts, derived rather than asserted, so a caller never assembles them by hand and
 * two beats cannot disagree about what "few marks" means.
 *
 * @param {Array<{key: string, label?: string, value: number}>} data
 * @param {{comparisonSet?: unknown[], unitMark?: string, subject?: string}} options
 */
export function beatFacts(
  data,
  {
    comparisonSet = [],
    unitMark = null,
    subject = null,
    namedSeries = [],
    reference = null,
    eras = [],
    states = [],
    continuousAxis = false,
    levels = [],
    mirrored = [],
    bins = [],
    observations = [],
    summaries = [],
    spokes = [],
    flows = [],
    widths = [],
    spans = [],
    markers = [],
    layers = [],
    sides = null,
    cells = [],
    impossibleCells = 0,
    scaleClasses = 0,
    geography = null,
    interaction = null,
    rails = null,
    stack = null,
    panels = null,
    units = null,
    points = null,
    overlapping = false,
    freeBaseline = false,
    scaleCeiling = null,
    threshold = null,
    pairs = [],
    breakAt = null,
    qualifiedApparatus = [],
    membership = [],
    groups = [],
    bars = null,
    declaredSequence = null,
  } = {},
) {
  const marks = Array.isArray(data) ? data : [];
  const values = marks.map((m) => m.value).filter(Number.isFinite);
  const peakAt = values.length ? values.indexOf(Math.max(...values)) : -1;
  /** The first reading after the peak at or below the reference — the same derivation
   *  `crossing-geometry.ts` makes, so the predicate and the drawing never disagree. */
  const crossingIndex =
    reference === null || peakAt < 0
      ? -1
      : marks.findIndex((m, i) => i >= peakAt && m.value <= reference);
  /** Mean absolute year-on-year change as a fraction of the series' own range, so "noisy" is
   *  measured rather than judged. */
  const range = values.length ? Math.max(...values) - Math.min(...values) : 0;
  const steps = values.slice(1).map((v, i) => Math.abs(v - values[i]));
  const noisiness =
    range > 0 && steps.length ? steps.reduce((a, b) => a + b, 0) / steps.length / range : 0;
  const span = marks.length ? { first: marks[0].key, last: marks[marks.length - 1].key } : null;

  return {
    markCount: marks.length,
    hasReference: reference !== null,
    reference,
    crosses: crossingIndex >= 0,
    crossingKey: crossingIndex >= 0 ? marks[crossingIndex].key : null,
    noisiness,
    /** Only the declared events that actually fall inside the series' own extent. An era outside
     *  the span would be drawn off the plot, or worse, clamped onto its edge as though it had
     *  happened there. */
    eras: span
      ? eras.filter((e) => String(e.from) >= String(span.first) && String(e.to) <= String(span.last))
      : [],
    /** Series the beat can name at their own ends. One is the common case and still counts: a
     *  single line's end label is the same decision as nine of them. */
    seriesCount: namedSeries.length,
    /** Entities, periods or precedents the beat draws that are NOT its subject. */
    hasComparisonSet: comparisonSet.length > 0,
    comparisonSize: comparisonSet.length,
    /** Whether the comparison set is a RUN of the drawn marks. A bracket can name a run; a
     *  scattered set would need each member marked, or the claim rewritten. Measured against the
     *  beat's own data order, so a set that stops being contiguous when the data moves stops
     *  getting a bracket. */
    comparisonIsContiguous: (() => {
      if (comparisonSet.length < 2) return false;
      const at = comparisonSet.map((member) =>
        data.findIndex((d) => d.key === (member?.key ?? member) || d.label === (member?.label ?? member)),
      );
      if (at.some((i) => i < 0)) return false;
      const sorted = [...at].sort((a, b) => a - b);
      return sorted.every((i, n) => n === 0 || i === sorted[n - 1] + 1);
    })(),
    /** A drawn mark the beat supplies for its own unit — a mullet, a human figure. */
    unitMark,
    subject,
    /** The states a paired beat compares — two dates, two conditions, two sides. COUNTED AS
     *  DECLARED, named or not: a pair with one end the reader cannot identify is still a pair, and
     *  it is the exact case the segment rule exists to refuse. Counting only the named ones would
     *  make that beat look like a single observation and let the rule's naming half go untested. */
    stateCount: states.length,
    statesNamed:
      states.length > 0 && states.every((s) => typeof s === "string" && s.trim().length > 0),
    /** The ABSOLUTE totals a beat declares — a bridge's opening and closing level, a bracket's
     *  seeds. Where there are two or more, the difference between the first and the last is a fact
     *  the beat's own arithmetic already holds. */
    levelCount: levels.length,
    netChange:
      levels.length >= 2 ? levels[levels.length - 1] - levels[0] : null,
    /** A mirrored beat's bands, each with its two halves. Where the halves cross — the first band
     *  whose larger half is not the one that was larger at the foot — the shape of the plate is
     *  already saying something the plate never names. */
    mirroredCount: mirrored.length,
    mirrorCrossingKey: (() => {
      if (mirrored.length < 2) return null;
      const leads = (b) => Math.sign(b.right - b.left);
      const first = leads(mirrored[0]);
      if (first === 0) return null;
      const at = mirrored.findIndex((b, i) => i > 0 && leads(b) !== 0 && leads(b) !== first);
      return at > 0 ? mirrored[at].key : null;
    })(),
    /** Whether the beat's own values fall on both sides of zero — which is what makes a zero rule
     *  a thing the plate needs rather than an axis decoration. */
    divergesAboutZero:
      values.some((v) => v > 0) && values.some((v) => v < 0),
    /** HOW MANY BARS THE PLATE DRAWS, which is a different question from how many groups it has.
     *  Counted from `bars` where a beat states it, and summed out of `groups` otherwise, so a
     *  grouped beat that already declares its groups keeps answering as it did.
     *
     *  It exists because two filed treatments were written GROUP-SHAPED by the family they were
     *  harvested from, and the evidence under them is not: `every-bar-labelled-lets-the-axis-go`
     *  rests on a Ferdio plate of SIX BARS AND NO GROUPS, and the ranking form this base met next —
     *  ten columns, ten printed values, no axis — could not claim a rule it plainly implements. The
     *  fix is a fact about bars rather than a looser predicate: a line beat with 35 readings still
     *  gets neither treatment, because a reading is not a bar. */
    barCount: bars ?? groups.reduce((sum, g) => sum + (g.bars ?? 0), 0),
    /** Groups a beat draws side by side, each holding two or more bars. */
    groupCount: groups.length,
    barsPerGroup: groups.length ? Math.max(...groups.map((g) => g.bars ?? 0)) : 0,
    /** A sequence the beat's own categories carry — a date order, a declared accounting order.
     *  `null` says there is none, which is what makes the order a decision rather than a given. */
    declaredSequence,
    /** Who was IN the ranking at each state the beat carries. A ranking that draws only the
     *  entities present throughout discards its own churn, and a reader cannot tell an entity that
     *  was never there from one that fell out. */
    stateCount2: membership.length,
    entitiesEver: membership.length
      ? [...new Set(membership.flatMap((m) => m.members))].length
      : 0,
    entitiesThroughout: membership.length
      ? [...new Set(membership.flatMap((m) => m.members))].filter((e) =>
          membership.every((m) => m.members.includes(e)),
        ).length
      : 0,
    /** Paired readings — an x and a y per entity — and a level on the x variable the beat's own
     *  copy declares as the place the relationship changes. Where both exist, the spread of y on
     *  each side is a number the beat holds and does not show. */
    pairCount: pairs.length,
    /** A PAIRED beat's own two facts. `states` per pair — the before and the after — let the base
     *  ask whether any pair is too close to draw, which is where a dumbbell quietly shows nothing:
     *  the smallest gap as a share of the plate's full range. */
    smallestPairGap: (() => {
      const gaps = pairs
        .filter((p) => Number.isFinite(p.from) && Number.isFinite(p.to))
        .map((p) => Math.abs(p.to - p.from));
      if (!gaps.length) return null;
      const values = pairs.flatMap((p) => [p.from, p.to]).filter(Number.isFinite);
      const span = Math.max(...values) - Math.min(...values);
      return span > 0 ? Math.min(...gaps) / span : 0;
    })(),
    breakAt,
    spreadEachSideOfBreak: (() => {
      if (breakAt === null || pairs.length === 0) return null;
      const side = (keep) => {
        const ys = pairs.filter(keep).map((p) => p.y);
        if (!ys.length) return null;
        const lo = Math.min(...ys);
        const hi = Math.max(...ys);
        return { count: ys.length, lo, hi, range: hi - lo };
      };
      const below = side((p) => p.x < breakAt);
      const above = side((p) => p.x >= breakAt);
      return below && above ? { below, above } : null;
    })(),
    /** Apparatus labels the beat declares as having a subordinate part — an axis name with its
     *  unit, a key caption with its qualifier. */
    qualifiedApparatusCount: qualifiedApparatus.length,
    /** Bins the beat declares, each with the two edges it covers. A bin is an interval, and an
     *  interval a reader cannot name at both ends is a bar whose meaning is in a footnote. */
    binCount: bins.length,
    /** The last bin is open where the beat says its tail is unbounded — `$1m and over`, `100+`. */
    hasOpenTopBin: bins.length > 0 && bins[bins.length - 1].open === true,
    /** The raw readings a distribution is made of, and a level the beat's own copy declares about
     *  them. Where both exist, the share on one side of that level is a number the beat holds. */
    observationCount: observations.length,
    /** DISTRIBUTION SUMMARIES the beat draws — a box, a band, an interval — each standing for a
     *  set of readings the reader cannot see. `summaries` carries `{ key, n }` per summary, and `n`
     *  is what makes the difference this family turns on: a box built from five readings draws the
     *  same confident rectangle as one built from five thousand. */
    /** A radar's axes. `spokes` carries `{ key }` per axis, and three is the floor: fewer cannot
     *  close a polygon, which is `references/types/radar.md`'s own line. */
    spokeCount: spokes.length,
    /** FLOWS a beat draws between named nodes. `flows` carries `{ from, to, value }`, and the two
     *  facts under it are what this family's rules turn on: how many there are (a sankey's promise
     *  is conservation, so a flow too small to draw is still a flow) and how much of the total the
     *  largest one carries (whether any single ribbon can be followed by eye at all). */
    /** COLUMNS whose WIDTH carries a second quantity — the marimekko family's own construction.
     *  `widths` carries `{ key, value }` per column, and the fact that matters is the smallest
     *  share: the IEA's own cost curve is this base's negative case, a variable-width chart whose
     *  narrowest units fall under a few pixels and have stopped encoding their second dimension. */
    /** SPANS a beat draws on a shared date axis — `{ key, from, to }`, with `to` null where the span
     *  is still running. Two facts matter to this family: whether any span is open, because an open
     *  end is a claim that needs its own notation, and whether any row is interrupted, because a gap
     *  between two spans of one entity is a finding with no mark of its own. */
    /** COMPARATIVE MARKERS: the second value a bullet's row carries — a target, a commitment, the
     *  same measure at an earlier date. `markers` is `{ key, value }` per row that has one. */
    /** LAYERS a beat stacks over a shared axis — `{ key, peak }` per band. `freeBaseline` says the
     *  stack does not sit on zero (a streamgraph's silhouette or wiggle offset), which is what makes
     *  a value axis over it a lie. */
    layerCount: layers.length,
    /** A DIVERGING STACK's own shape: how many levels each side carries, and whether a level sits
     *  ON the centre rather than in either ramp. `sides` is `{ left, right, centre }`. */
    /** A GRID of cells on a shared ramp — a calendar, a matrix. `cells` is `{ key, value }` per cell
     *  and `impossibleCells` counts the positions the grid has to hold but the data cannot fill (a
     *  31st of February, a month with no readings). */
    cellCount: cells.length,
    impossibleCells,
    /** WHETHER THE BEAT'S OWN MARKS PILE UP. Declared by the beat, because whether two marks
     *  overlap is a fact about the layout and not about the data. */
    marksOverlap: Boolean(overlapping),
    /** A FIELD OF LOCATED POINTS. `points` is `{ count, locatedAt }` — how many the beat draws and
     *  at what resolution the source actually places them. */
    pointCount: points ? (points.count ?? 0) : 0,
    pointsLocatedAt: points ? (points.locatedAt ?? null) : null,
    /** ONE MARK PER THING. `units` is `{ count, thing }` — how many marks the beat draws and what
     *  one of them IS. A unit chart's whole claim is that the reader can count. */
    unitCount: units ? (units.count ?? 0) : 0,
    unitNames: units ? (units.thing ?? null) : null,
    /** PANELS, AND WHETHER THEY ARE MULTIPLES AT ALL. `panels` is `{ count, sharedScale }` — how
     *  many panels the beat draws and whether one scale governs them. */
    panelCount: panels ? (panels.count ?? 0) : 0,
    panelsShareAScale: Boolean(panels && panels.sharedScale),
    /** A STACK AND WHAT IT HIDES. `stack` is `{ segments, sharesATotal }` — how many segments a bar
     *  carries, and whether they add to something the reader would want back. */
    segmentCount: stack ? (stack.segments ?? 0) : 0,
    stackHidesATotal: Boolean(stack && stack.sharesATotal),
    /** TWO RAILS AND WHAT THEY ARE. `rails` is `{ left, right, sameMeasure }` — the two states a
     *  slope joins, and whether they are the same measure at two times or two different measures. */
    railCount: rails ? 2 : 0,
    railsAreOneMeasure: Boolean(rails && rails.sameMeasure),
    /** WHAT A READER CAN DO, AND WHETHER THEY ARE PART OF THE ARGUMENT. `interaction` is
     *  `{ controls, readerParameter }` — how many controls the beat puts on the page, and whether
     *  the reader's own input is a parameter of the claim rather than only a view of it. A static
     *  beat leaves it null and none of the interaction treatments fire. */
    controlCount: interaction ? (interaction.controls ?? 0) : 0,
    readerIsAParameter: Boolean(interaction && interaction.readerParameter),
    /** WHAT A MAP NAMES, BY CLASS. `geography` is `{ areas, settlements, waters, basemap }` — how
     *  many administrative areas, settlements and bodies of water the beat labels, and whether it
     *  draws a basemap under them at all. A map's labels are not one register: the corpus measures
     *  three classes with three treatments, and a beat that names only one of them is not making
     *  that distinction. */
    namedAreas: geography ? (geography.areas ?? 0) : 0,
    namedSettlements: geography ? (geography.settlements ?? 0) : 0,
    namedWaters: geography ? (geography.waters ?? 0) : 0,
    hasBasemap: Boolean(geography && geography.basemap),
    /** HOW MANY CLASSES THE KEY CARRIES. A grid's key is either a continuous bar — "more" and
     *  "less", nothing a reader can name — or a set of classes with edges. Zero means the beat
     *  declares no key at all. */
    scaleClasses,
    leftLevels: sides ? sides.left ?? 0 : 0,
    rightLevels: sides ? sides.right ?? 0 : 0,
    hasCentreLevel: Boolean(sides && sides.centre),
    freeBaseline: Boolean(freeBaseline),
    markerCount: markers.length,
    /** The ceiling of a bounded scale, where the beat's measure has one (a percentage, a share of a
     *  fixed total). `null` says the scale is open, and a full-width track would then be a claim
     *  about a maximum nobody stated. */
    scaleCeiling,
    spanCount: spans.length,
    openSpanCount: spans.filter((s) => s.to === null || s.to === undefined).length,
    interruptedRows: (() => {
      const byKey = new Map();
      for (const s of spans) byKey.set(s.key, (byKey.get(s.key) ?? 0) + 1);
      return [...byKey.values()].filter((n) => n > 1).length;
    })(),
    widthCount: widths.length,
    smallestWidthShare: (() => {
      const total = widths.reduce((sum, w) => sum + (w.value ?? 0), 0);
      if (!total) return 0;
      return Math.min(...widths.map((w) => (w.value ?? 0) / total));
    })(),
    flowCount: flows.length,
    smallestFlowShare: (() => {
      const total = flows.reduce((sum, f) => sum + (f.value ?? 0), 0);
      if (!total) return 0;
      return Math.min(...flows.map((f) => (f.value ?? 0) / total));
    })(),
    largestFlowShare: (() => {
      const total = flows.reduce((sum, f) => sum + (f.value ?? 0), 0);
      if (!total) return 0;
      return Math.max(...flows.map((f) => (f.value ?? 0) / total));
    })(),
    summaryCount: summaries.length,
    smallestSample: summaries.length ? Math.min(...summaries.map((s) => s.n ?? 0)) : 0,
    largestSample: summaries.length ? Math.max(...summaries.map((s) => s.n ?? 0)) : 0,
    threshold,
    countBelowThreshold:
      threshold === null ? null : observations.filter((v) => v < threshold).length,
    shareBelowThreshold:
      threshold === null || observations.length === 0
        ? null
        : observations.filter((v) => v < threshold).length / observations.length,
    /** Whether a continuous axis runs BETWEEN the states — a time axis from 2004 to 2022 rather
     *  than two labelled rails. It is the axis that makes a segment a claim about what happened in
     *  between; without one there is nothing for anything to have happened on. */
    continuousAxis: Boolean(continuousAxis),
  };
}

/**
 * The filed treatments. `applies` is a predicate over `beatFacts`'s output, written so it can be
 * read beside the record it implements.
 */
export const TREATMENTS = Object.freeze([
  {
    id: "segment-between-two-named-states",
    name: "Two observations are joined only where both states are named and no axis runs between",
    // ABOVE THE ACCENT FLOOR, because it settles whether the marks are joined AT ALL. Colour is
    // decided on a geometry; the geometry is not decided on a colour.
    //
    // This treatment REPLACED a refused one. `two-points-are-not-a-line` said that with exactly two
    // observations no line may be drawn, because a line invents a trajectory the data does not
    // contain. It was held back for want of a second publication (METHOD correction 4) and then
    // refuted outright: four independent desks draw the segment — Ferdio straight, ABC straight,
    // Reuters as a sloping roofline, Information is Beautiful curved. The danger was never the
    // segment. It is an unlabelled axis underneath it.
    applies: (facts) =>
      facts.stateCount === 2 && facts.statesNamed && !facts.continuousAxis,
    draws: Object.freeze(["axis", "value"]),
    priority: 10,
  },
  {
    id: "accent-marks-the-thread",
    name: "The accent marks the argument's thread, never the largest value",
    // A floor rather than an option: it governs wherever an accent is assigned, which is always.
    applies: () => true,
    draws: Object.freeze(["value", "annot"]),
    priority: 9,
  },
  {
    id: "zero-rule-painted-over-the-bars",
    name: "The zero rule spans the plot and is painted after the bars",
    // IMPORTED, three publications, three weights. Datawrapper draws a dark hairline the full height
    // of the plot, over both its `#F3F3F3` row tracks and the bars. Statista draws a dark rule the
    // full height of each of its two panels. Our World in Data draws a pale hairline and NOTHING
    // ELSE — no axis, no ticks, no gridlines. In all three the rule is on top: a bar's fill never
    // covers the line it grew from.
    applies: (facts) => facts.divergesAboutZero,
    draws: Object.freeze(["axis"]),
    priority: 6,
  },
  {
    id: "value-beyond-the-growing-tip-in-ink",
    name: "Every value sits beyond its bar's tip, in the page ink, never in the bar's own fill",
    // IMPORTED, two publications. Statista puts `−63` and `+5` outside every tip in dark navy. Our
    // World in Data puts `-1.92 million ha` outside every tip in `rgb(91, 91, 91)` — and the detail
    // worth copying, it puts the CATEGORY NAME immediately in front of the value, so
    // `Brazil -1.92 million ha` travels outward with the negative bar while `China` stays by the
    // zero line with `1.94 million ha` beyond its tip. One phrase, both directions, no second rule
    // for negatives.
    //
    // Stated as a FLOOR rather than a law, because the third publication answers differently:
    // Datawrapper flips the label INSIDE the fill in white where the bar can hold it, per cell
    // rather than per row. That is white on the fill, not the fill's hue on the ground, so it is not
    // the contrast failure `references/types/diverging-bar.md` warns about — it is a fourth position
    // the doc does not describe.
    applies: (facts) => facts.divergesAboutZero && facts.markCount > 0,
    draws: Object.freeze(["value"]),
    priority: 7,
  },
  {
    id: "sign-is-direction-and-hue-only-doubles-it",
    name: "Direction carries the sign; a second hue is a redundancy bought only when the plate is long",
    // IMPORTED, four publications, TWO ANSWERS, two each. ONS gives its cyan to `Factories` (+300)
    // and to `Warehouses` (−500) alike, spending its only other tone on the aggregate row rather
    // than on a sign. Our World in Data gives all four bars `#7088B0` at 16.461 % and the pixel
    // route reads the palette as MONOCHROME. Statista and Datawrapper split by sign.
    //
    // `references/types/diverging-bar.md` says *exactly two hues, one per sign*. Two of the four
    // publications that draw this form do not. The condition that separates them is visible: the
    // one-hue charts have four bars and label every one; the two-hue charts have eight and sixteen
    // rows. So the rule is *direction carries the sign; a second hue is a redundancy you buy when
    // the reader cannot hold the whole plate in one look* — not a cap.
    //
    // And where two hues ARE spent, both desks that split pick WARM AGAINST COOL and neither picks
    // red against green. That is the one claim in the type sheet this corpus corroborates without
    // qualification.
    applies: (facts) => facts.divergesAboutZero,
    draws: Object.freeze(["value"]),
    priority: 5,
  },
  {
    id: "every-bar-labelled-lets-the-axis-go",
    name: "Where every bar carries its printed value, the value axis and its gridlines can go",
    // IMPORTED, two publications. Ferdio's `viz25` has no axis, no ticks, no gridlines and not even
    // a baseline rule — six bars, six numbers, the labels set inside the feet of the bars so they
    // align into a row that does the baseline's work. Pew keeps no axis and no gridline either and
    // prints all sixteen of its values.
    //
    // A LICENCE, NOT AN OBLIGATION, and the corpus is explicit about it: ONS keeps its axis and
    // prints nothing, having fifteen categories × two series to label, and one ONS plate does both.
    // The axis exists to let a reader estimate a length; where nothing has to be estimated it is
    // spending ink on a question nobody is asking.
    applies: (facts) =>
      facts.barCount > 0 && facts.barCount <= MOST_MARKS_THAT_CAN_CARRY_A_LABEL,
    draws: Object.freeze(["value"]),
    priority: 6,
  },
  {
    id: "the-group-boundary-is-drawn",
    name: "The boundary between groups is stated with a mark, not with gap width alone",
    // IMPORTED, three publications, three different marks. Ferdio sets a full-height hairline
    // between its two states; the IEA ticks its baseline rule with short verticals at each
    // boundary, so the axis states the grouping; Pew separates its strips with a 2 x 116 px rule —
    // and there the rule does double duty, because a fourth series whose values round to nothing has
    // no bars at all and the desk draws the rule where the bars would be and sets the numbers beside
    // it. A series too small to draw is admitted as text against a rule rather than faked as
    // geometry.
    //
    // With two or three bars to a group, whitespace alone does not distinguish "two groups of two"
    // from "one group of four": the reader has to measure two gaps and compare them. A mark removes
    // the measurement.
    applies: (facts) => facts.groupCount >= 2 && facts.barsPerGroup >= 2,
    draws: Object.freeze(["axis"]),
    priority: 4,
  },
  {
    id: "order-is-chosen-from-the-answer",
    name: "Rows follow their own sequence where they have one; otherwise they are ordered by the answer",
    // IMPORTED, two publications, and it CORRECTS THE DOCTRINE. `references/types/waterfall.md`
    // says rows stay in story order and are never resorted by magnitude. That is right for a time
    // bridge and wrong for a contributions bridge, and ONS is the proof: twelve COICOP divisions
    // have no sequence at all, so sorting by signed value does not destroy an argument, it SUPPLIES
    // one — `+0.05` down to `−0.06`. Its deleted CPI twin sorts the other way, falls first, because
    // its headline ended down. Datawrapper holds the other half: income-statement order on one
    // plate, calendar order on another, editorial order within groups on a third.
    //
    // The rule that survives both: the sequence is the argument when there is a sequence; when
    // there is not, the order is a decision and it should be taken from the answer.
    applies: (facts) => facts.barCount >= 2 && facts.declaredSequence === null,
    draws: Object.freeze(["axis"]),
    priority: 2,
  },
  {
    id: "exits-are-drawn",
    name: "An entity that leaves the ranking is drawn to where it left, not dropped from the plate",
    // DERIVED. Membership per state is a fact the beat's own data carries. A ranking that draws only
    // the entities present in every state silently discards its churn, and a reader cannot tell an
    // entity that was never there from one that fell out.
    //
    // Measured on this beat: sixteen countries held a top-ten place at some point between 1990 and
    // 2024, and SIX held one in every year. The plate drew the six and said the rest in a caption —
    // "India had already passed the United Kingdom in 1991 and Ukraine in 1992, which have since
    // left the top 10" — which is the tell. A graphic that has to name in prose what it discarded is
    // discarding the wrong thing.
    //
    // The proposal that raised this asked for a ceiling on churn and said it had not been measured.
    // Here it is 10 of 16, 62 %, and the plate stays readable because the RANKS are the constraint,
    // not the entities: ten slots exist at any moment however many entities pass through them.
    applies: (facts) => facts.stateCount2 >= 2 && facts.entitiesEver > facts.entitiesThroughout,
    draws: Object.freeze(["annot"]),
    priority: 7,
  },
  {
    id: "rank-is-printed-on-the-entry",
    name: "An entry's position travels with the entry, not only with its slot",
    // IMPORTED, two independent publications, two opposite stylings of one rule. ProPublica sets the
    // seed two points down and grey, immediately before the school's name — 63 runs of
    // `graphik | 10 | 400` in `rgb(119, 119, 119)` against 132 runs at 12 for the names. ESPN sets
    // the rank at display scale in gold, laid on the lower edge of each entry's portrait; the
    // numeral is inside the entity's own crop, `#F0B74B` at 0.296 % of it.
    //
    // What is common is not the styling. It is that the ORDINAL IS ATTACHED TO THE ENTITY, so a
    // reader who finds a school in round three, or arrives forty cards down a scroll, still has the
    // number. ProPublica's whole finding — a 12 seed in the final — is unreadable without it.
    applies: (facts) => facts.stateCount2 >= 2,
    draws: Object.freeze(["value"]),
    priority: 8,
  },
  {
    id: "declared-break-with-the-spread-on-each-side",
    name: "The break the beat declares is drawn, and the spread of the response on each side is stated",
    // DERIVED, the fourth found this way, and this beat is the sharpest case yet. Its title asserts
    // that beyond roughly $30,000 extra income buys far less extra life expectancy. Its plate drew
    // 165 grey dots on a log axis and neither the $30,000 line nor either band — the claim was in
    // the words and nowhere in the marks.
    //
    // Measured on the beat's own numbers: below the break, 124 countries spanning 40.3 to 81.4
    // years, 41.1 of spread; above it, 41 countries spanning 71.2 to 85.1, 13.9. Three times
    // narrower, which is what "far less extra life expectancy" means, and it was never drawn.
    //
    // The BREAK is declared, like `crossing-marked`'s reference level and the threshold above: a
    // cloud has no natural knee, and a renderer that fitted one would be asserting a model the beat
    // has not stated. The spreads are arithmetic.
    applies: (facts) => facts.spreadEachSideOfBreak !== null,
    draws: Object.freeze(["annot", "value"]),
    priority: 8,
  },
  {
    id: "apparatus-is-one-size-and-weight-separates-it",
    name: "An apparatus label and what is subordinate to it share a size; weight separates them",
    // IMPORTED, three publications, all measured. Our World in Data sets `GDP per capita` at
    // Lato 12/700 and `(international-$ in 2011 prices; plotted on a logarithmic axis)` at Lato
    // 12/400 — same size, same ink `rgb(91, 91, 91)`, weight alone separating them; and on its key,
    // `Circles sized by` at 10/400 against `Population` at 11/700. ABC sets every callout row as
    // `ABCSans 13/700` label against `ABCSans 13/400` value, same ink, 300 of weight apart.
    // Information is Beautiful does the same on its channel pills.
    //
    // The beat declares WHICH labels have a subordinate part; this treatment decides how the two
    // parts are told apart, and the answer the corpus gives is: not by size.
    applies: (facts) => facts.qualifiedApparatusCount > 0,
    draws: Object.freeze(["axis"]),
    priority: 3,
  },
  {
    id: "share-on-the-declared-side-of-a-threshold",
    name: "The share of the readings on the side of the threshold the beat is about is drawn and stated",
    // DERIVED, and the third of its kind found the same way: by rendering a beat through the base
    // and looking at what the plate did not say. This beat's title asserts "six in ten countries
    // emit under 4 tonnes"; its plate drew a median at 3.1 and neither the four-tonne line nor the
    // sixty per cent. Both are in the beat's own numbers — 127 of 213 — and `BRIEF.md` states them
    // in prose while the graphic states neither.
    //
    // The THRESHOLD is declared by the beat, exactly as `crossing-marked`'s reference level is: a
    // distribution has no natural cut, and inventing one would be the renderer asserting an
    // editorial judgement. The SHARE is then arithmetic.
    applies: (facts) => facts.threshold !== null && facts.observationCount > 0,
    draws: Object.freeze(["annot", "value"]),
    priority: 8,
  },
  {
    id: "bin-named-by-both-edges-and-an-open-top",
    name: "Every bin carries both of its edges, and an unbounded tail is named as an inequality",
    // IMPORTED, two publications, two continents, two subjects, the same two decisions.
    // `figure.nz` labels its income bins `$1-$10,000`, `$10,001-$20,000` … and `$1m and over`: the
    // `,001` states which side of $10,000 a reader on exactly $10,000 falls on, without a footnote.
    // `populationpyramid.net` labels `0-4`, `5-9` … `95-99`, `100+`. Independent by host AND by
    // design authorship — `moneyhub.co.nz` shows the convention a third time and is not counted,
    // being the same author as the Figure.NZ plate.
    //
    // The map family's `legend` register reaches the same convention on the Guardian's
    // `Multiple of £25,000 — 2 3 4 5 6 10+`, which is a chart and a map agreeing from opposite
    // sides of the corpus.
    applies: (facts) => facts.binCount > 0,
    draws: Object.freeze(["axis"]),
    priority: 4,
  },
  {
    id: "name-each-half-in-words",
    name: "Each half of a mirrored beat is named in words, on its own half, never by a swatch key",
    // IMPORTED, three publications. PopulationPyramid.net sets `Male` / `Female` at the head of
    // each half; Our World in Data sets `Men` / `Women` at the foot of each half across nine series
    // WITH NO LEGEND ANYWHERE ON THE PLATE; ONS writes `Male` / `Female` once per panel on one plate
    // and `Males` / `Females` small and grey beside the gutter on another. The one publication in
    // the family that keys its halves with a swatch legend is also the only one whose halves carry
    // no other identification at all.
    //
    // The reasoning the corpus supplies: colour distinguishes the halves, it does not have to
    // IDENTIFY them, because the mirrored position already does. A swatch spends a mark saying what
    // the word beside it already says.
    applies: (facts) => facts.mirroredCount >= 2,
    draws: Object.freeze(["annot"]),
    priority: 5,
  },
  {
    id: "mirrored-halves-cross-at-a-named-band",
    name: "The band where a mirrored beat's two halves change places is drawn and named",
    // DERIVED, and found the way `crossing-marked` and `net-change-between-declared-levels` were:
    // by rendering a beat through the base and looking at what the plate did not say.
    //
    // A population pyramid's whole shape is two halves trading places somewhere up the age scale,
    // and no reference in this family names where. Measured on the Swiss beat: men outnumber women
    // in every band up to 55-59, women in every band from 60-64 upward. The plate shows it — the
    // silhouette visibly changes hand — and asks the reader to find the exact band by eye, across a
    // gutter, on bars that differ by less than a pixel at the crossing.
    //
    // Nothing to corroborate against a second publication: the crossing is in the beat's own
    // numbers. That is METHOD correction 7's shape.
    applies: (facts) => facts.mirrorCrossingKey !== null,
    draws: Object.freeze(["annot"]),
    priority: 8,
  },
  {
    id: "net-change-between-declared-levels",
    name: "The difference between the beat's first and last declared level is drawn on the plate",
    // DERIVED, for the same reason `crossing-marked` is, and found the same way: by rendering a
    // beat through the base and noticing what the plate did not say. A bridge computes its own net
    // change — closing minus opening — and every reference in the waterfall family prints the two
    // levels and leaves the reader to subtract them. On the German electricity beat the title
    // asserts "143 TWh de moins" and the plate contains 639.2 and 496.0: the number the headline
    // rests on is nowhere on the graphic.
    //
    // There is nothing here to corroborate against a second publication. The beat's own arithmetic
    // holds the value, `render.mjs` already replays it to check the bridge reconciles, and the
    // treatment draws what that check computed. That is the shape METHOD correction 7 names.
    applies: (facts) => facts.levelCount >= 2 && facts.netChange !== null,
    draws: Object.freeze(["value", "annot"]),
    priority: 8,
  },
  {
    id: "crossing-marked",
    name: "The year the series crosses its reference level is drawn and named",
    applies: (facts) => facts.hasReference && facts.crosses,
    draws: Object.freeze(["annot"]),
    priority: 8,
  },
  {
    id: "direct-end-label-in-the-series-colour",
    name: "Every series is named at its own end, in its own colour",
    // The usual objection is that past three or four series direct labelling stops working. Our
    // World in Data does it at NINE on one axis with no legend, which is where the evidence puts
    // the threshold. Beyond that the arbiter drops or displaces rather than overlapping.
    applies: (facts) => facts.seriesCount >= 1,
    draws: Object.freeze(["value"]),
    priority: 7,
  },
  {
    id: "context-in-neutral-at-the-subject-scale",
    name: "The comparison set shares the subject's unit and is drawn in neutral",
    applies: (facts) => facts.hasComparisonSet,
    draws: Object.freeze(["axis", "annot"]),
    priority: 5,
  },
  {
    id: "the-set-a-claim-adds-up-is-drawn-as-a-set",
    name: "The set the headline adds together is bracketed, and its sum is printed on the bracket",
    // DERIVED, and the exemption is `crossing-marked`'s: the beat's own script computes the set —
    // it adds the marks below the subject one at a time and stops at the first that would carry the
    // running total past it — and the beat's own title claims the sum. Nothing here is copied from
    // a desk's habit, so the two-publication floor does not apply.
    //
    // Contiguity is tested rather than assumed. A bracket names a run of marks; a scattered set
    // gets no bracket instead of a wrong one.
    applies: (facts) => facts.comparisonSize >= 2 && facts.comparisonIsContiguous,
    draws: Object.freeze(["axis", "annot"]),
    priority: 8,
  },
  {
    id: "the-distribution-is-furniture-and-the-case-is-ink",
    name: "A distribution summary is drawn in neutrals; the accent is spent on the argument, not on the boxes",
    // IMPORTED, two publications. Nature's `nmeth.2813` figure 1 is drawn without ONE chromatic
    // pixel — measured on this base's own record: `pixel.chromatic` empty, `pixel.shape`
    // monochrome, the box a `#D4D4D5` fill at 3.3 % and the ink under 1.2 % of the frame. NSIDC's
    // Charctic puts its median and both nested bands in greys and keeps colour for the one or two
    // years being argued about, over the top.
    //
    // The rule is not "no colour". It is that the SUMMARY carries no chroma, which leaves the
    // accent free for whatever the beat is actually claiming — on the strictest measurement in this
    // corpus, 0.112 % of a frame.
    applies: (facts) => facts.summaryCount >= 1,
    draws: Object.freeze(["value"]),
    priority: 6,
  },
  {
    id: "the-sample-is-drawn-beside-its-own-summary",
    name: "The readings a summary stands for are drawn on the same axis as the summary",
    // IMPORTED, two publications, and it answers the failure mode `references/types/boxplot.md`
    // names outright: a box built from five points draws the same confident rectangle as one built
    // from five thousand. Nature draws the twenty-point sample as open circles ABOVE the box, on
    // the same axis, so both are in one glance; NSIDC draws every individual year over its own
    // median and bands. Both show the readings and the summary together rather than asking the
    // reader to trust the rectangle.
    //
    // It costs one row, and it is bounded by what can be drawn: past a few dozen readings per
    // summary the dots stop being individuals and become a smear.
    applies: (facts) =>
      facts.summaryCount >= 1 &&
      facts.observationCount > 0 &&
      facts.largestSample > 0 &&
      facts.largestSample <= MOST_READINGS_A_SAMPLE_CAN_SHOW,
    draws: Object.freeze(["value"]),
    priority: 8,
  },
  {
    id: "every-band-names-its-own-statistic",
    name: "Each part of a summary is named on the plate, in words, including the whisker's own rule",
    // IMPORTED, two publications. Nature writes `Q1`, `m`, `Q3`, `Whiskers`, `Outliers` and the
    // spans `1.5 × IQR / IQR / 1.5 × IQR` across the figure — the fence's arithmetic on the
    // picture rather than in a caption. NSIDC names each band in the legend in words,
    // `Interquartile Range`, not "typical range" and not an unlabelled swatch.
    //
    // `boxplot.md` says this form is only ever as honest as its stated whisker rule, and a summary
    // whose parts are not named is a rectangle the reader is asked to take on trust.
    applies: (facts) => facts.summaryCount >= 1,
    draws: Object.freeze(["annot"]),
    priority: 7,
  },
  {
    id: "a-radius-is-not-read-by-eye",
    name: "Every spoke carries its own number, printed on the plate",
    // IMPORTED, two publications, TWO ANSWERS. StatsBomb prints each spoke's own scale along the
    // spoke, in that spoke's real units — `0.57 0.52 0.48 …` down the xG axis — so the radius can be
    // a rank while the number stays a quantity. The Analyst writes the value INSIDE its own wedge:
    // `92`, `80`, `89`. Neither asks a reader to judge a radius against a ring.
    //
    // A radius is the hardest quantity on any chart to read: it is an area to the eye and a length
    // to the geometry, and the two disagree. Printing the number is what this form's practitioners
    // do instead of solving that.
    applies: (facts) => facts.spokeCount >= 3,
    draws: Object.freeze(["value"]),
    priority: 8,
  },
  {
    id: "the-grid-is-circles-and-the-ceiling-is-drawn",
    name: "Concentric circles for the grid, a drawn outer ring for the maximum, and the only polygon is the data's",
    // IMPORTED, two publications. StatsBomb draws five or six full circles at even radii and no
    // polygonal gridlines — "the only polygon on the plate is the player's". The Analyst draws a
    // light full circle at the outside meaning the 100th percentile, with dashed rings inside it.
    //
    // Both halves matter. A polygonal web competes with the shape it is supposed to support, and a
    // radius with no drawn ceiling is a length against nothing.
    applies: (facts) => facts.spokeCount >= 3,
    draws: Object.freeze(["axis"]),
    priority: 6,
  },
  {
    id: "the-benchmark-is-captioned",
    name: "The population or denominator the radius is measured against is stated on the plate",
    // IMPORTED, two publications. The Analyst captions "Percentile comparison vs. top five European
    // league forwards over the last 15 years (1,350+ minutes)". StatsBomb puts the denominator on
    // the plate as furniture: minutes played, competition, season, and the template name that says
    // which population the percentiles are against.
    //
    // A normalised radius with no stated population is not a measurement. This is the one rule in
    // this family that survives leaving sport: a share is a share OF something.
    applies: (facts) => facts.spokeCount >= 3,
    draws: Object.freeze(["body"]),
    priority: 5,
  },
  {
    id: "every-node-carries-its-own-total",
    name: "Every node's label carries its own total, in one register, with no size hierarchy",
    // IMPORTED, THREE publications. Carbon Brief puts each node's total in parentheses after its
    // name, one register throughout, no legend and no axis. Eurostat sets name over value with the
    // unit, again one register — "the bar does the ranking". LLNL reverses name and total out of the
    // node's own colour, the densest form of the same idea.
    //
    // A sankey has no axis. If the nodes do not carry their quantities, no quantity on the plate can
    // be read exactly, and the reader is left estimating areas.
    applies: (facts) => facts.flowCount >= 2,
    draws: Object.freeze(["annot", "value"]),
    priority: 8,
  },
  {
    id: "the-neutral-is-the-largest-area",
    name: "The flows nobody is tracking take the neutral, and the neutral is the biggest area on the plate",
    // IMPORTED, THREE publications, all measured. LLNL makes rejected energy grey and grey 11 % of
    // the picture — the design's biggest colour decision is to make the waste colourless. The IEA's
    // `#A1A1A1` covers 5.31 % against a largest hue at 4.25 %. Carbon Brief runs 16 % neutral ribbon
    // against 1 % accent.
    //
    // The categorical cap is respected not by having few colours but by making sure the many
    // colours are small — and on a form whose mass is enormous, that is the only way an accent
    // means anything.
    applies: (facts) => facts.flowCount >= 2,
    draws: Object.freeze(["value"]),
    priority: 7,
  },
  {
    id: "ribbons-are-translucent-so-crossings-are-honest",
    name: "Flows are drawn at partial alpha, so a crossing reads as density rather than as draw order",
    // IMPORTED, two publications. The IEA draws at 0.6: "crossings resolve into visible density
    // instead of an arbitrary z-order, and the diagram stops depending on draw order to be true".
    // Carbon Brief draws translucent strokes for the same reason — bundles darken, and nothing
    // depends on which link was drawn last.
    //
    // An opaque ribbon set is a picture whose truth is a function of iteration order, which is not a
    // property of the data.
    applies: (facts) => facts.flowCount >= 2,
    draws: Object.freeze(["value"]),
    priority: 6,
  },
  {
    id: "conservation-is-kept-visible",
    name: "A flow too small to draw is still drawn and still labelled, never dropped",
    // IMPORTED, two publications. The IEA keeps its hairline flows and shrinks their label rather
    // than deleting them; Carbon Brief writes `< 0.001` rather than dropping a node. Conservation is
    // this form's promise: totals in equal totals out, and a dropped flow breaks that invisibly —
    // the plate still looks balanced.
    applies: (facts) => facts.flowCount >= 2 && facts.smallestFlowShare < 0.01,
    draws: Object.freeze(["value"]),
    priority: 5,
  },
  {
    id: "the-width-dimension-is-named-on-the-plate",
    name: "On a variable-width chart the width's own quantity is named, because it has no axis by default",
    // IMPORTED, THREE publications, THREE ANSWERS — which is what makes it a rule rather than a
    // habit. Visual Capitalist runs a labelled double-headed arrow down the largest cell and writes
    // `Population` along it. The IEA puts a cumulative axis under the widths, so the second
    // dimension is readable rather than merely present. Ferdio draws a brace under each column
    // naming its total — the record calls it "the one treatment here that a reader could not derive
    // without it, and the one that repairs this form's known weakness".
    //
    // The weakness is structural: in a variable-width chart the second quantity has no axis and no
    // legend by default, so unless it is named the reader sees a composition and misses the size.
    applies: (facts) => facts.widthCount >= 2,
    draws: Object.freeze(["axis", "annot"]),
    priority: 8,
  },
  {
    id: "a-narrow-cell-degrades-its-label-rather-than-dropping-it",
    name: "A cell too narrow for its label shrinks it, then moves it out — it does not go unlabelled",
    // IMPORTED, two publications. Visual Capitalist degrades in two stages: type scales with the
    // cell, and below a width the NAME moves outside the bar in grey while the percentage stays in.
    // Its outlier — a hairline bar the story is about — gets a long leader back to its cell. Ferdio
    // bottom-aligns two-line cell labels, "which is what makes a narrow band labellable at all".
    //
    // `references/types/` says a small cell should go unlabelled rather than clip. These two show
    // the third way: nothing is dropped, the label degrades, and the reading order survives.
    applies: (facts) => facts.widthCount >= 2,
    draws: Object.freeze(["annot", "value"]),
    priority: 6,
  },
  {
    id: "both-dates-in-the-row-label",
    name: "Where a bar is a duration, the row label carries the span's own two dates",
    // IMPORTED, two publications. Al Jazeera writes both dates in the row label and this base's
    // record says what that buys: "it costs a gutter and it removes the form's characteristic
    // misreading entirely". ABC does it in one line — `Name | start - end` — "no extra column, and
    // the duration reading is safe".
    //
    // The misreading is the form's own: a bar on a date axis is read as a POSITION by a reader who
    // came for a length, and as a LENGTH by one who came for a position. Printing the two dates
    // settles which, per row, at the cost of a gutter.
    applies: (facts) => facts.spanCount >= 2,
    draws: Object.freeze(["annot"]),
    priority: 8,
  },
  {
    id: "an-open-span-says-it-is-open",
    name: "A span still running is notated as open, not drawn to an end it does not have",
    // IMPORTED, two publications, TWO ANSWERS. Threestory aligns every open end at the present and
    // lets the shared edge carry the meaning — "no arrow, no 'present', no legend entry". ABC writes
    // the missing end date as a trailing dash, and this base's record calls that "the whole notation
    // for still running".
    //
    // What both refuse is the same thing: drawing an open span to a closing date it does not have.
    // On a date axis that is not a rounding, it is a claim about a fact that has not happened.
    applies: (facts) => facts.spanCount >= 2 && facts.openSpanCount > 0,
    draws: Object.freeze(["annot", "axis"]),
    priority: 7,
  },
  {
    id: "the-target-is-named-on-the-line-that-draws-it",
    name: "The comparative line carries its own words: what it is, in the plate, not in a legend",
    // IMPORTED, two publications. The BBC writes `326 seats for a majority` ON the rule that draws
    // it — this base's record calls that "the whole apparatus: no legend, no caption, no lookup".
    // ICAEW names each threshold beside the segment it belongs to, `to 3.5 % of GDP`, and the words
    // do the work a legend entry would.
    applies: (facts) => facts.markerCount >= 1,
    draws: Object.freeze(["annot"]),
    priority: 8,
  },
  {
    id: "the-track-runs-the-full-scale-so-the-remainder-is-legible",
    name: "The neutral track runs the whole bounded scale, not to the target",
    // IMPORTED, two publications. The BBC runs its track the full height of the plot rather than to
    // the majority line, which keeps rows comparable and lets a winner visibly EXCEED it.
    // Datawrapper's default does the same and this base's record names what it buys: "a track that
    // reaches the plot's ceiling makes the remainder legible, which is the reading a bare bar cannot
    // give" — and it is "the honest degradation of a bullet's qualitative bands" when the data
    // carries no poor/ok/good split to draw.
    //
    // It needs a scale with a stated ceiling. On an open scale a full-width track would be a claim
    // about a maximum nobody has made.
    applies: (facts) => facts.markerCount >= 1 && facts.scaleCeiling !== null,
    draws: Object.freeze(["axis"]),
    priority: 7,
  },
  {
    id: "two-states-of-one-measure-are-one-hue-at-two-chromas",
    name: "A measure and its comparative state are one hue at two chromas, never two hues",
    // IMPORTED, two publications. Datawrapper draws value and target as one hue at two chromas —
    // "the reader is told these are two states of the same quantity before reading a single label",
    // and it is the only colour decision that chart makes. Statista uses "the tint of the same hue,
    // not a second hue, for the earlier state. Two states of one measure should not read as two
    // categories."
    //
    // This is the palette rule of METHOD correction 28 arriving from the corpus rather than from a
    // repair: two chromas of the direction's own accent, and no imported second hue.
    applies: (facts) => facts.markerCount >= 1,
    draws: Object.freeze(["value"]),
    priority: 6,
  },
  {
    id: "the-verdict-is-written-as-a-derived-number",
    name: "The number the reader would work out — the gap, the remainder, the change — is printed",
    // IMPORTED, two publications. The BBC prints `0 seats to go`: this base's record says it is
    // "what a reader wants and what a bullet leaves them to compute". ICAEW draws the SHORTFALL as a
    // labelled area rather than a tick, because "a target tick answers it only after a subtraction
    // the reader performs by eye against an axis".
    //
    // A beat that carries a value and a comparative state already carries this number; not printing
    // it is asking the reader to do arithmetic the plate has already done.
    applies: (facts) => facts.markerCount >= 1 && facts.markerCount === facts.markCount,
    draws: Object.freeze(["value"]),
    priority: 9,
  },
  {
    id: "a-band-is-named-inside-itself-or-it-is-texture",
    name: "Every band a reader could name is named inside itself, scaled to the band",
    // IMPORTED, FOUR publications — the widest agreement in this base, and one of them is a
    // NEGATIVE. Ferdio: "label the band inside the band, at its widest interior point, in ink
    // measured against that fill — because the form has no axis, this is not decoration, it is the
    // whole naming mechanism." UNHCR: "scale the in-band label with the band. Big band, big name;
    // small band, small name; tiny band, nothing." The NYT labels a few bands at their own peak with
    // a leader dot "and accepts that the rest are texture".
    //
    // And Lee Byron's own figure is the counter-example: strip the labels and a streamgraph becomes
    // a texture — "nothing on this plate can be turned back into a number".
    applies: (facts) => facts.layerCount >= 2,
    draws: Object.freeze(["annot"]),
    priority: 9,
  },
  {
    id: "a-free-baseline-forbids-a-value-axis",
    name: "Where the stack does not sit on zero, the value is printed rather than scaled off an axis",
    // IMPORTED, two publications. Ferdio: "print the value at the ends, outside the stack, rather
    // than drawing a value axis. A FREE BASELINE MAKES A Y-AXIS A LIE." UNHCR's documentation plate
    // carries the strongest form of it as a counter-example: keeping a value axis over a centred
    // offset "will print negative labels for a quantity that cannot be negative" — and its explorer
    // draws the total once, plainly, outside the coloured stacks, so "how big is the whole thing"
    // does not have to be inferred from a silhouette.
    applies: (facts) => facts.layerCount >= 2 && facts.freeBaseline,
    draws: Object.freeze(["value", "axis"]),
    priority: 8,
  },
  {
    id: "the-layer-order-is-the-argument",
    name: "Layers are ordered so the fact the beat is about is visible, not so the legend is tidy",
    // IMPORTED, two publications. Ferdio: "sort the layers so the crossing happens. When 'A overtook
    // B' is the fact, an inside-out or size-sorted order puts the overtake on the picture; a fixed
    // order hides it." Lee Byron's paper figure: "inside-out ordering — largest layers through the
    // middle, thin ones tapering outward — is what keeps the small series from being crushed against
    // a hard edge."
    //
    // On this form order is not layout. A band's thickness is its value, but its POSITION is a
    // choice, and the choice decides which comparison the reader can make at all.
    applies: (facts) => facts.layerCount >= 3,
    draws: Object.freeze(["axis"]),
    priority: 7,
  },
  {
    id: "the-ramp-deepens-outward",
    name: "Each side is one ramp, palest at the centre and deepest at the extreme",
    // IMPORTED, two publications. Vega-Lite's specimen: "lightest shade adjacent to the centre,
    // deepest at the extreme, one ramp per side. Strength of opinion reads as colour intensity as
    // well as as distance, which is the whole reason to prefer this over a plain stacked bar."
    // jbryer's Likert plate obeys the same rule on a different hue axis — this base's record says so
    // in as many words.
    //
    // It is the one arrangement that makes a diverging stack more than a stacked bar cut in two:
    // the two channels, position and intensity, say the same thing and reinforce each other.
    applies: (facts) => facts.leftLevels >= 2 && facts.rightLevels >= 2,
    draws: Object.freeze(["value"]),
    priority: 8,
  },
  {
    id: "the-neutral-straddles-the-centre",
    name: "The level that belongs to neither side straddles the zero rather than being pushed onto one",
    // IMPORTED, two publications. Vega-Lite: "the neutral is a third thing — achromatic grey,
    // belonging to neither ramp, and STRADDLED across the zero rather than pushed to one side, so
    // 'which way does this row lean' is answered by which side is longer, with the undecided mass
    // symmetric about the anchor." The FT's own specimen carries the same arrangement and this
    // base's record of it notes the agreement.
    //
    // Pushing the neutral onto one side is not a layout choice: it silently adds its whole mass to
    // that side's lean.
    applies: (facts) => facts.hasCentreLevel,
    draws: Object.freeze(["value", "axis"]),
    priority: 9,
  },
  {
    id: "a-sequential-grid-is-one-hue-cluster",
    name: "A grid on a sequential ramp carries one hue cluster, tested by clustering rather than by eye",
    // IMPORTED, and the evidence is a MEASUREMENT ACROSS THE WHOLE FAMILY. Observable's notebook
    // draws this form with `turbo`, and the harvest's own pixel route classified that plate
    // `categorical` with FOUR hue clusters, where each of the four disciplined references in the
    // same family reads `sequential` with one. A ramp a clustering reads as four categories will
    // read as four categories to a reader.
    //
    // So the test is mechanical: `shape: "sequential"`, one cluster — not "does it look continuous".
    applies: (facts) => facts.cellCount >= 20,
    draws: Object.freeze(["value"]),
    priority: 8,
  },
  {
    id: "a-missing-cell-is-drawn-as-missing",
    name: "A position the data cannot fill is drawn, in a neutral outside the ramp, never left as a hole",
    // IMPORTED, two publications. ONS draws the dates that cannot exist — a 31st of February — as
    // explicit empty cells with the same stroke as the rest, "so the grid stays rectangular and a
    // hole never reads as a low value". Datawrapper draws its no-data state in a neutral OUTSIDE the
    // ramp and ships a whole empty month rather than filling it with zeros.
    //
    // Datawrapper's own counter-lesson comes with it: separate "no data" from "low value" by
    // LIGHTNESS as well as hue, or say in words that the neutral means no data. Hue alone does not
    // survive greyscale.
    applies: (facts) => facts.cellCount >= 20 && facts.impossibleCells > 0,
    draws: Object.freeze(["value", "annot"]),
    priority: 7,
  },
  {
    id: "the-key-prints-its-breaks-in-the-data-s-units",
    name: "The key is binned and prints its break values in the data's own units",
    // IMPORTED, two publications, and it is what lets a reader INVERT the colour: ONS prints its
    // break values in the data's units — "stronger than a gradient bar and costs one row of small
    // type" — and ABC bins the ramp so the classes are roughly equal in count, so no single step
    // swamps the picture. Datawrapper reaches the same end in the subtitle: direction, range, and
    // where the exact numbers are, in three clauses.
    applies: (facts) => facts.cellCount >= 20,
    draws: Object.freeze(["axis", "annot"]),
    priority: 6,
  },
  {
    id: "the-connector-is-either-furniture-or-the-mark",
    name: "A pair's connector is furniture OR it is the mark carrying the change — never half of each",
    // IMPORTED, two publications, TWO ANSWERS, and one of them states the condition itself.
    // Information is Beautiful: "the connector is furniture and the endpoints are the marks... a rule
    // thinner and lighter than either endpoint, which is what lets a hundred pairs sit on one
    // plate" — and by coverage it is still the largest non-ground ink there.
    // `100.datavizproject.com`'s viz19: "the connector is NOT furniture here — it is the mark that
    // carries the change", with the delta set inside it, because the connector already spans exactly
    // the change.
    //
    // The IiB record names the fork in as many words — "both are coherent" — and the condition is
    // legible: when the LEVELS are the story and there are many rows, the connector recedes; when
    // the CHANGE is the story, it carries it, and the number goes inside it.
    applies: (facts) => facts.pairCount >= 2,
    draws: Object.freeze(["value", "annot"]),
    priority: 8,
  },
  {
    id: "a-pair-too-close-to-draw-is-written",
    name: "A gap too small to see is written down rather than left to show nothing",
    // IMPORTED, two publications. The Pudding: "write a value that is too small to draw rather than
    // letting the reader see nothing." Reuters: "draw the no-change case in neutral and give it its
    // numbers."
    //
    // On this form a pair whose two states nearly coincide draws one dot with a smudge, which reads
    // as a missing reading rather than as a small change. The number is the only thing that
    // separates "barely moved" from "not measured".
    applies: (facts) =>
      facts.pairCount >= 2 && facts.smallestPairGap !== null && facts.smallestPairGap < 0.08,
    draws: Object.freeze(["value"]),
    priority: 7,
  },
  {
    id: "the-subject-is-ringed-not-recoloured",
    name: "The mark a beat is about keeps its category and takes a ring, not a different colour",
    // IMPORTED, two publications. Information is Beautiful emphasises one mark "with an outline and
    // a note rather than by recolouring it, SO IT KEEPS ITS CATEGORY". Reuters fades the population
    // rather than dropping it and marks the subject "with a ring and a label, so emphasis costs no
    // encoding channel".
    //
    // Recolouring spends a channel that is already carrying something. A ring is the cheapest
    // emphasis there is: it adds a mark rather than overwriting a meaning.
    applies: (facts) => Boolean(facts.subject) && facts.markCount >= 3,
    draws: Object.freeze(["annot"]),
    priority: 6,
  },
  {
    id: "area-to-reference",
    name: "The band between the series and its reference level is tinted",
    applies: (facts) => facts.hasReference,
    draws: Object.freeze(["value"]),
    priority: 6,
  },
  {
    id: "raw-under-smoothed",
    name: "Faint per-reading dots under a bold centred mean",
    // Measured rather than judged: the mean step is at least this fraction of the whole range, and
    // there are enough readings for a window to mean anything.
    applies: (facts) => facts.markCount >= 20 && facts.noisiness >= 0.02,
    draws: Object.freeze(["value"]),
    priority: 4,
  },
  {
    id: "era-bands",
    name: "Datable events inside the series' own span are shaded",
    applies: (facts) => facts.eras.length > 0,
    draws: Object.freeze(["eyebrow"]),
    priority: 1,
  },
  {
    id: "value-on-the-mark",
    name: "The value is printed on the mark it belongs to",
    applies: (facts) => facts.markCount > 0 && facts.markCount <= MOST_MARKS_THAT_CAN_CARRY_A_LABEL,
    draws: Object.freeze(["value"]),
    priority: 3,
  },
  {
    id: "the-ramp-is-monotone-in-lightness",
    name: "A grid's ramp gets lighter or darker all the way, so ranking cells by darkness ranks them right",
    // IMPORTED, and the corpus holds the counter-example as well as the rule, which is why it is
    // filed at this priority: a ramp that fails here fails at the only thing a heatmap does.
    //
    // `100.datavizproject.com`'s viz49 runs white -> pale blue -> blue -> NAVY -> dark red -> red.
    // The navy near the middle is darker than the red at the top: Denmark's 10 reads as a heavier
    // cell than Sweden's 15, and 15 is the larger number. That record's own words: "a reader
    // ranking cells by darkness ranks them wrongly... this is the family's central failure and the
    // corpus should hold an example of it."
    //
    // The two disciplined records do the opposite, in opposite directions. Information is
    // Beautiful's pin-code poster is on a BLACK ground and runs its loud end WHITE — measured along
    // the legend at y = 325, `#FFFFFF` -> `#FFF394` -> ... -> `#242423`, lightness falling the whole
    // way. ProPublica's is diverging and monotone within each arm, out from a pale-yellow middle.
    // So the rule is not "dark means more"; it is that the ramp never turns back on itself.
    applies: (facts) => facts.cellCount >= 20,
    draws: Object.freeze(["value"]),
    priority: 9,
  },
  {
    id: "the-scale-is-stepped-not-continuous",
    name: "A grid's scale is a set of classes with edges, not a gradient",
    // IMPORTED, two publications. ProPublica paints seventeen distinct fills rather than a gradient
    // — eleven red, one pale-yellow midpoint, five green — and the record says why: "a stepped scale
    // gives the reader classes to name; a continuous ramp gives them only 'more' and 'less'".
    // Information is Beautiful's pin-code key is drawn as separate swatches with visible edges.
    //
    // It is the same argument as `the-key-prints-its-breaks-in-the-data-s-units`, one step earlier:
    // there are no breaks to print until the scale has some.
    applies: (facts) => facts.cellCount >= 20 && facts.scaleClasses >= 3,
    draws: Object.freeze(["value", "axis"]),
    priority: 7,
  },
  {
    id: "the-key-names-its-classes-in-their-own-colours",
    name: "Each class of the key is named in that class's own colour, so the caption IS the swatch",
    // IMPORTED, two publications, and both make the same move from opposite starting points.
    // ProPublica sets `Cut Benefits` in the dark red of the top of its ramp and `Raised Benefits` in
    // the green of the bottom — "the reader never has to pair a swatch with a caption on a separate
    // line: the caption IS the swatch". Information is Beautiful's halal/kosher matrix sets each
    // column head in its own band's colour and has no key at all: "the reader learns the code from
    // the heading they were going to read anyway".
    //
    // The corollary the pin-code poster adds: where the quantity has no unit, NAME the ends in words
    // — `most common`, `least` — rather than invent a number. Naming the ends is the honest
    // alternative to a unit the scale does not have.
    applies: (facts) => facts.cellCount >= 20 && facts.scaleClasses >= 3,
    draws: Object.freeze(["axis", "annot"]),
    priority: 6,
  },
  {
    id: "the-cell-value-is-printed-or-the-region-is-named",
    name: "A grid prints the number in every cell, or it annotates regions — the cell count decides which",
    // IMPORTED, two publications, TWO ANSWERS, and the condition is the cell count itself.
    //
    // `100.datavizproject.com`'s viz49 has SIX cells and prints the value in every one, centred and
    // in white, for a stated reason: "a heatmap's known weakness is that colour cannot be read back
    // to a number; printing the number in the cell repairs it, and at this cell count there is
    // room."
    //
    // Information is Beautiful's pin-code poster has ten thousand and prints none. It annotates
    // REGIONS instead — dashed rectangles bracketing blocks, `Those using their birth date in DD/MM
    // or MM/DD formats` — and that record states the rule the fork rests on: "the finding in a
    // heatmap is almost always a SHAPE, and a callout on one cell cannot say it."
    //
    // So: room for the number, print it. No room, name the block. What is not admissible is a grid
    // that does neither and leaves the reader to invert a colour by eye.
    applies: (facts) => facts.cellCount >= 20,
    draws: Object.freeze(["value", "annot"]),
    priority: 8,
  },
  {
    id: "three-classes-of-place-three-treatments",
    name: "Administrative area, settlement and water take three different typographic treatments",
    // IMPORTED, two publications, at two desks, on two continents — and the harvest record for the
    // SCMP piece says so in as many words: "that is the same three-treatment convention
    // ProPublica's louisiana-toxic-air uses on an entirely different continent, at an entirely
    // independent desk. Two publications, and it is the pair that finally evidences the `place`
    // register."
    //
    // SCMP: the country as `CHINA` in tracked grey capitals, the quietest thing on the map; the
    // feature under discussion as `Yangtze River basin` in mixed case in the piece's accent, with a
    // hairline leader; the water as `Yangtze River`, italic, in the river's own blue.
    // ProPublica: parishes in grey tracked capitals, cities in darker mixed case, water in italic
    // capitals. A reader separates administrative area, settlement and water WITHOUT A LEGEND, from
    // typography alone — which is the whole return on the rule.
    applies: (facts) => facts.namedAreas > 0 && facts.namedWaters > 0,
    draws: Object.freeze(["axis", "annot"]),
    priority: 8,
  },
  {
    id: "the-basemap-gives-up-its-contrast",
    name: "The basemap sits far below the data in contrast, whichever pole the ground is at",
    // IMPORTED, two publications, and both are measurements rather than impressions. La Nación's
    // ground measures `#FEFEFE` with its streets at the palest grey — "against a dense point field
    // that is the only way the points stay countable". ProPublica's Louisiana piece reads `#FDFDFD`
    // with roads and built-up areas at the faintest grey, and its record notes it does this "more
    // severely than most".
    //
    // The Toxmap is the same rule at the other pole and is why this is phrased as CONTRAST and not
    // as lightness: it goes to a dark ground precisely because the quantity is faint, and its record
    // says "the ground is a decision about how much contrast the data needs, not a mood". A basemap
    // is not "light grey"; it is a fixed, small step off the ground, whichever pole the ground is.
    applies: (facts) => facts.hasBasemap,
    draws: Object.freeze(["value"]),
    priority: 7,
  },
  {
    id: "water-is-a-tint-not-a-grey",
    name: "Water is drawn in its own tint, never in the basemap's neutral",
    // IMPORTED, two publications. The Toxmap draws water "as a blue-teal tint, never grey", which
    // its record files as `geo-discipline.md`'s rule 7 met in a published piece; SCMP sets the river
    // and its label in the river's own blue while the country stays grey.
    //
    // It is the one place a directed plate takes a hue that is not a step of its own accent, and it
    // is admissible for the same reason a convention is: water is not a value, it is a thing the
    // reader already knows the colour of. The tint is still built against the direction's own
    // ground, so it recedes on a pale page and on a dark one alike.
    applies: (facts) => facts.namedWaters > 0 || facts.hasBasemap,
    draws: Object.freeze(["value"]),
    priority: 5,
  },
  {
    id: "the-default-state-carries-the-whole-reading",
    name: "The default state already carries the argument; interaction only adds detail it had to omit",
    // IMPORTED, two publications, two FAMILIES — which is what makes this a rule about the EXPORT
    // rather than about a chart type. NSIDC's sea-ice tool: "nothing is hidden behind the
    // interaction. The default state already carries median, both bands, the current year and the
    // record year; the eighty-odd checkboxes ADD years, they do not reveal the chart."
    // Information is Beautiful's LLM ranking: "every point is labelled directly. There is no
    // hover-only identity — each model's name is set beside its dot in the producer's colour.
    // Identity never depends on the legend."
    //
    // The same record also shows the honest limit: its top cluster IS illegible at rest, and the
    // piece answers that with a search field "rather than by pretending otherwise". Interaction is
    // allowed to solve a density the frame genuinely cannot hold. It is not allowed to hold the
    // argument.
    applies: (facts) => facts.controlCount > 0,
    draws: Object.freeze(["display", "annot", "value"]),
    priority: 9,
  },
  {
    id: "the-readers-own-input-is-restated-in-words",
    name: "When the reader is a parameter, the claim is rewritten in words against their own value",
    // IMPORTED, THREE publications across three families. The Guardian: "the reader's own number is
    // the parameter — the headline claim is stated against it in words, '91% of England and Wales
    // would be beyond your means in 2014', so the map answers a question the reader asked rather
    // than one the newsroom chose." didoesdigital: "the reader's own selection is the parameter —
    // '14 out of 20 favourite foods are selected'." ProPublica's Miseducation: "the sentence is
    // generated by the controls."
    //
    // A control that only redraws marks makes the reader do the reading twice. A control that
    // rewrites the sentence hands back an answer.
    applies: (facts) => facts.readerIsAParameter,
    draws: Object.freeze(["display", "body"]),
    priority: 8,
  },
  {
    id: "the-one-interaction-sits-on-the-plate",
    name: "The control and its invitation sit with the graphic, not in prose above or below it",
    // IMPORTED, two publications. ProPublica's Toxmap: "a pill invites the one interaction that
    // matters — 'Click inside a hot spot to see how risks combine there' — set ON THE PLATE, in its
    // own dark chip, rather than in prose above the map." Buried Signals' Yemen map: "a single year
    // filter along the bottom edge, set as a row of years with ALL selected — the piece's one
    // interaction, placed on the plate rather than above it."
    //
    // ProPublica says it a second time on a different piece ("the instruction sits with the
    // graphic, in italic"), which is corroboration rather than a second publication.
    applies: (facts) => facts.controlCount > 0,
    draws: Object.freeze(["annot", "axis"]),
    priority: 7,
  },
  {
    id: "the-state-you-are-in-is-louder-than-the-controls",
    name: "The state currently applied is set larger than the controls that could change it",
    // IMPORTED, two publications. NPR: "'Showing all books' is set at 24px against the 26 category
    // labels at 15px — the filter you have APPLIED is displayed larger than the filters you might
    // apply. A reader can never be looking at a filtered subset and think it is the whole."
    // Information is Beautiful: "the legend is the filter, and the piece says so."
    //
    // It is the interaction-era form of a rule this base already holds for static plates: a plate
    // states its own limits. A filtered view that does not say it is filtered is a plate lying about
    // its own extent.
    applies: (facts) => facts.controlCount > 0,
    draws: Object.freeze(["display", "eyebrow"]),
    priority: 6,
  },
  {
    id: "the-slope-carries-direction-and-the-number-carries-magnitude",
    name: "A slope draws no value axis: the rails are plain rules and the printed ends are the scale",
    // IMPORTED, two publications. `100.datavizproject.com`'s viz54: "the slope carries the
    // direction; the printed number carries the magnitude. A reader who only looks sees three
    // rising lines and one much steeper than the others; a reader who reads gets the size. NEITHER
    // IS ASKED TO MEASURE A GAP AGAINST AN AXIS."
    // ABC: "there is no y axis and there are no ticks. The rails are plain rules; the scale is
    // carried entirely by the four printed numbers."
    //
    // ABC also states the price, which is why this is a rule and not a habit: without an axis, two
    // panels of different magnitude "are NOT comparable to each other, and the piece does not claim
    // they are". A slope that drops its axis owes the reader every end value it draws.
    applies: (facts) => facts.railCount === 2,
    draws: Object.freeze(["value", "axis"]),
    priority: 9,
  },
  {
    id: "each-rail-is-headed-by-what-it-is",
    name: "The two rails are named at their own ends — a head on the rail, not a tick on an axis",
    // IMPORTED, two publications, and the pair is what shows the rule is about the RAIL rather than
    // about dates. `100.datavizproject.com`'s viz54: "the date is a chip on the rail, not an axis
    // tick. The two states are named where the marks begin and end, so no legend is needed and
    // nothing has to be carried across the picture."
    // Information is Beautiful's streaming piece runs the same geometry between two DIFFERENT
    // VARIABLES — revenue per play against audience — and heads "the two rails with what they
    // measure rather than when", each with its own units at its own end.
    applies: (facts) => facts.railCount === 2,
    draws: Object.freeze(["axis", "annot"]),
    priority: 8,
  },
  {
    id: "the-delta-is-its-own-register-beside-the-values",
    name: "The change is written as a third fact, at a third weight, beside the two values",
    // IMPORTED, two publications. ABC: "the change is stated three times, in three registers, each
    // in its own place — as the slope's angle; as the two values printed at the two ends; and as a
    // PERCENT-CHANGE PILL at the right, filled with the series' own colour. A reader gets direction
    // from the picture, level from the numbers, and magnitude from the pill without any of them
    // competing." And: "the pill separates the delta from the value."
    // `100.datavizproject.com`'s viz54 prints the same third fact as a percentage beside each line,
    // and that record checks its arithmetic against the archive's own sibling figure.
    //
    // The delta is a DERIVED number and this base already has a rule for those
    // (`the-verdict-is-written-as-a-derived-number`); what this adds is that it may not share a
    // register with the levels it was derived from, or a reader reads three facts as one column of
    // numbers.
    applies: (facts) => facts.railCount === 2 && facts.railsAreOneMeasure,
    draws: Object.freeze(["value", "annot"]),
    priority: 7,
  },
  {
    id: "colour-belongs-to-the-entity-not-to-the-state",
    name: "A line keeps one colour end to end; the two states are told apart by position, not by hue",
    // IMPORTED, two publications, and the corpus names the fork itself.
    // `100.datavizproject.com`'s viz17: "colour belongs to the entity, not to the date. Both ends of
    // a line share one hue. Compare #19, where the same desk gives colour to the two dates instead —
    // THE FAMILY'S ONE REAL FORK."
    // Information is Beautiful's streaming piece labels each rail "in the service's colour", so the
    // hue tracks the entity across both rails and the label is the legend.
    //
    // The condition is which thing the reader has to follow. On a slope the entity travels and the
    // states are fixed positions, so the entity gets the hue. On a paired form where the states are
    // the subject — Reuters' offset tint pairs — the hue goes to the state instead, which is what
    // `two-states-of-one-measure-are-one-hue-at-two-chromas` is for. A plate does not get both.
    applies: (facts) => facts.railCount === 2,
    draws: Object.freeze(["value"]),
    priority: 6,
  },
  {
    id: "a-segment-not-starting-at-zero-carries-its-own-number",
    name: "Every segment of a stack prints its own value inside itself",
    // IMPORTED, two publications, and Information is Beautiful names the defect it repairs in as many
    // words: "the stacked bar's known weakness — A SEGMENT THAT DOES NOT START AT ZERO CANNOT BE
    // MEASURED BY EYE — is repaired rather than ignored."
    // `100.datavizproject.com` does the same on both of its stacks: viz24's segments each carry their
    // share and the plate then needs "no axis, no gridlines, no percent scale under the bars"; viz1's
    // carry their value in white inside the segment.
    //
    // It is `value-on-the-mark` with a reason of its own, and the reason is why it is filed
    // separately: on a bar chart printing the value is a convenience, on a stack it is the repair for
    // the one thing the geometry gets wrong.
    applies: (facts) => facts.segmentCount >= 2,
    draws: Object.freeze(["value"]),
    priority: 9,
  },
  {
    id: "the-stack-gives-back-the-total-it-hides",
    name: "A stack states its total outside itself, in a register the segments do not use",
    // IMPORTED, two publications. `100.datavizproject.com`'s viz23: "a stack hides its own total: the
    // reader has to add. Printing the total BEYOND the stack's end, in a register distinct from the
    // segments' own, gives back the number the geometry took away — and printing the INCREASE rather
    // than the later value means no segment's number has to be subtracted from another either."
    // Information is Beautiful reaches the same end from a table: the currency figures in each row
    // let the bar "be checkable against its own row, which is what makes the bar an argument rather
    // than a decoration".
    applies: (facts) => facts.segmentCount >= 2 && facts.stackHidesATotal,
    draws: Object.freeze(["value", "annot"]),
    priority: 8,
  },
  {
    id: "panels-share-one-scale-or-they-are-not-multiples",
    name: "Every panel is drawn against the same scale — otherwise it is charts in a row",
    // IMPORTED, THREE publications, in three families, which is as strong as this base gets.
    // `100.datavizproject.com`'s viz99: "the scale is still shared. All three panels are drawn
    // against one vertical scale — Sweden's 15 is taller than Denmark's 10 on the page — so the
    // cross-panel comparison the type exists for survives the split. THAT IS WHAT SEPARATES THIS
    // FROM THREE UNRELATED CHARTS SITTING IN A ROW."
    // ONS: "two areas, two pyramids, one scale... the panels are small multiples in the strict
    // sense: same geometry, same scale, same furniture, different data."
    // ABC: "the comparison between clubs still reads, because the panels share a grid."
    //
    // ONS also gives the corollary and the reason: its axis is a PERCENTAGE "precisely so that two
    // populations of different size can be compared", and it records that the counts version of the
    // same component cannot do it. Sharing a scale is sometimes a choice about which measure to
    // draw, not only about which range to set.
    applies: (facts) => facts.panelCount >= 2,
    draws: Object.freeze(["axis", "value"]),
    priority: 9,
  },
  {
    id: "the-cut-replaces-the-boundary",
    name: "Splitting into panels does the work a boundary line, a tint or an extra axis would do",
    // IMPORTED, two publications, reaching it from opposite directions.
    // Datawrapper cuts a year into twelve month blocks: "the month is made visible by cutting the
    // grid, not by drawing a boundary... the cost is that the week straddling two months is split;
    // the gain is that no boundary line, no alternating tint and no month-tick axis is needed at
    // all."
    // `100.datavizproject.com`'s viz99 splits a grouped column into panels and says what the gap
    // then means: "the between-group gap is no longer a gap; it is THE END OF ONE AXIS AND THE START
    // OF ANOTHER."
    //
    // So a panel split is not decoration and not merely layout: it is furniture removed. A beat that
    // splits into panels AND keeps the boundary it was splitting to avoid has paid the cost twice.
    applies: (facts) => facts.panelCount >= 2,
    draws: Object.freeze(["axis"]),
    priority: 7,
  },
  {
    id: "what-is-shared-is-stated-once-and-what-varies-is-repeated",
    name: "Furniture common to every panel is stated once; furniture belonging to a panel is repeated in it",
    // IMPORTED, two publications, and the pair looks like a contradiction until the condition is
    // read. ProPublica draws "three dated snapshots of the same entities, identical geometry, ONE
    // SHARED LEGEND" — the colour code is common to all three, so it is stated once.
    // ONS repeats: "each half is named in words at its head, `Male` left, `Female` right... TWICE,
    // once per panel. Not a swatch legend", and the axis caption sits under each panel.
    //
    // Neither is repeating for the sake of it and neither is sharing for the sake of it: what is
    // common goes once, what belongs to the panel goes in the panel. The test is whether a reader
    // looking at ONE panel could read it — if the answer needs something from a neighbour, that
    // thing belongs in the panel.
    applies: (facts) => facts.panelCount >= 2,
    draws: Object.freeze(["annot", "axis"]),
    priority: 6,
  },
  {
    id: "a-quantity-is-made-countable-by-drawing-its-units",
    name: "One mark per thing, so the reader counts rather than estimates a length",
    // IMPORTED, two publications, and both give the same reason from different scales.
    // ProPublica: "a quantity too large to picture is made countable. A river's flow in acre-feet
    // means nothing as a number. As a field of squares it has a size the eye can hold, and later
    // steps can take squares away, colour them, or move them to a claimant — every subsequent
    // argument is a rearrangement of the same units."
    // `100.datavizproject.com`'s viz30: "the change is A NUMBER OF THINGS, and the reader can count
    // them. Not a length to estimate, not a gap to subtract — three cells, six cells, two cells."
    //
    // ABC states the cost and takes it anyway: "the obvious chart here is eighteen bars. This draws
    // every player instead, so the reader sees the POPULATION rather than eighteen totals." A unit
    // chart is chosen when the individual things, and not their total, are the subject.
    applies: (facts) => facts.unitCount >= 2,
    draws: Object.freeze(["value"]),
    priority: 9,
  },
  {
    id: "a-countable-field-is-paired-with-its-own-figure",
    name: "The magnitude is stated twice — as a figure to read and as a field to count",
    // IMPORTED, two publications. Information is Beautiful: "the magnitude is stated twice, in two
    // registers: as a headline number in the display register and as a countable field of marks.
    // NEITHER ALONE WOULD DO THE WORK — the number is unreadable as a quantity, the field is
    // unreadable as a figure."
    // `100.datavizproject.com`'s viz30 pairs its countable rail with printed endpoints and a delta,
    // and states the delta "in units, not percent — the honest register for a countable rail".
    //
    // The second half of that is a rule of its own: a field of things is counted in things, so its
    // own figure is a count. A percentage beside a countable field asks the reader to hold two
    // arithmetics at once.
    applies: (facts) => facts.unitCount >= 2,
    draws: Object.freeze(["display", "value"]),
    priority: 8,
  },
  {
    id: "the-dots-resolution-is-what-the-data-supports",
    name: "A point sits where the source actually places it, never where a polygon would scatter it",
    // IMPORTED, two publications, and La Nación states the reasoning outright: "the dots sit on the
    // STREETS rather than in polygons, so the pattern reads as 'along this avenue' rather than 'in
    // this neighbourhood' — a choice about what the data can honestly support, SINCE A CRIME HAS A
    // STREET ADDRESS AND NOT AN AREA."
    // ProPublica's Louisiana piece is the same rule met by a different source: "each point
    // represents a facility", and a facility has coordinates.
    //
    // The rule is a REFUSAL as much as an instruction. A dot-density map made by scattering national
    // totals inside national polygons draws a texture the source cannot support: the pattern a
    // reader sees is the scatter's, not the world's. This base's own first attempt at this family
    // was exactly that, and this treatment is why it was not built.
    applies: (facts) => facts.pointCount >= 2,
    draws: Object.freeze(["value"]),
    priority: 9,
  },
  {
    id: "an-overlap-accumulates-rather-than-occluding",
    name: "Where marks pile up the pile is the reading — never which mark was drawn last",
    // IMPORTED, two publications, two families, TWO ANSWERS, and the condition is what the cluster
    // is supposed to say.
    //
    // Carbon Brief draws its flows as translucent strokes: "bundles darken, and nothing depends on
    // which link was drawn last." The IEA is the same answer at 0.6 alpha — "crossings resolve into
    // visible density instead of an arbitrary z-order".
    //
    // Buried Signals' Yemen map takes the other answer for a field of points: "the marks are HOLLOW,
    // and that is the whole encoding. Open circles with a pale stroke overlap without occluding:
    // where the strikes cluster the outlines pile into a dense white knot, and the density itself
    // becomes the reading. FILLED DISCS WOULD HAVE HIDDEN EACH OTHER and lost exactly the
    // information the piece is about."
    //
    // The condition: translucency when the marks are areas and the cluster should read as TONE;
    // hollow outlines when the marks are countable objects and the cluster should read as a NUMBER
    // OF THINGS. Either way the failure is the same and it is the one to name — an opaque pile is a
    // picture whose truth is a function of iteration order, which is a property of the loop that
    // drew it and not of the data.
    applies: (facts) => facts.marksOverlap,
    draws: Object.freeze(["value"]),
    priority: 8,
  },
  {
    id: "mark-depicts-its-subject",
    name: "The mark is a drawing of the thing being counted",
    // It costs a drawn asset per subject, which no renderer can invent: the beat supplies it or the
    // treatment does not apply. And there is no drawing of a megatonne.
    applies: (facts) =>
      Boolean(facts.unitMark) && facts.markCount <= MOST_MARKS_THAT_CAN_CARRY_A_LABEL,
    draws: Object.freeze(["value"]),
    priority: 2,
  },
]);

/**
 * Which filed treatments this beat's data shape admits, highest priority first — the order the
 * arbiter resolves them in.
 *
 * @param {ReturnType<typeof beatFacts>} facts
 */
export function applicableTreatments(facts) {
  return TREATMENTS.filter((treatment) => treatment.applies(facts)).sort(
    (a, b) => b.priority - a.priority,
  );
}
