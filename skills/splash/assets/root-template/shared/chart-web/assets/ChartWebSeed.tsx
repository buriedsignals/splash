/**
 * REPLACE ME. Do not parameterise me.
 *
 * This is not a chart type and it is not a component library. It is the wiring of one interactive
 * chart beat, written out once so the next one can be written from scratch in the same shape.
 *
 * SECOND BUILD OF THIS SEED (see `references/web-discipline.md`, "Responsive behaviour" — the
 * format's first build shipped two pre-rendered widths, 900px and 360px, swapped by a media query;
 * the owner's own read of that output was that it did not fill its container, and asked for a
 * genuinely continuous fill instead). Five things this format needs and this file demonstrates:
 *
 *   1. ONE geometry, rendered ONCE, that fills its container edge to edge and grows taller as it
 *      grows wider — never two discrete widths, never a fixed cap with empty gutters either side.
 *      The `<svg>` this component draws carries GEOMETRY ONLY (grid lines, the accent path, the
 *      points, the reference rule, the peak marker) — no `<text>` at all. Every word — title,
 *      caveat, source, axis labels, the reference/peak/end labels — is plain HTML, styled from CSS
 *      with a FIXED pixel `font-size`. That split is what makes "fill the container" safe: the
 *      `viewBox` can stretch to any width without dragging type along with it, because type was
 *      never inside the `viewBox` to begin with.
 *   2. `tabIndex={0}` and a per-reading `aria-label`, written on every point at build time — not
 *      assembled by the inline script — so the no-JS frame is still keyboard-reachable, reading by
 *      reading, with the script absent entirely. This is the capability
 *      `doctrine/references/guard-catalogue.json` names `reachable-by-keyboard`
 *      (`scripts/detect-reachable-by-keyboard.mjs`'s `keyboardReachesEveryMark`) — carried here
 *      since the day this seed was first written, measured against every delivered beat rather than
 *      assumed from this comment. The SAME "not assembled by the inline script" fact is also
 *      `degrades-without-javascript` (`scripts/detect-degrades-without-javascript.mjs`'s
 *      `staticFrameSurvives`): every `data-detail` a mark carries is baked at build time too, so the
 *      population of marks a no-JS reader gets is the same population scripting would have wired
 *      for interaction — never smaller.
 *   3. One invisible `.hit-area` rectangle, shared by mouse and touch: `assets/interaction.mjs`
 *      resolves a pointer or a tap anywhere over the plot to the nearest reading by x, so a phone
 *      reader is never asked to land a tap on a 5px circle.
 *   4. Nothing argument-bearing gated behind interaction OR behind the filter below. The title, the
 *      caveat, the source, the reference rule and its label, the notable-year marker and its label,
 *      and the subject's own end label are all drawn unconditionally — hover/focus only ever add the
 *      *per-year* detail the static frame had no room to print, and the filter only ever DIMS a
 *      subset of the plain line/points, never hides the claim or any of the above.
 *   5. A FILTER that earns its place: two radio buttons let a reader narrow the eleven readings to
 *      "2015–2019" or "2020–2025" — dimming the segments and points outside the chosen period.
 *      "All years" (the default, and the only state with no script or CSS override active) already
 *      shows the whole fall the title claims; the filter is something to explore PAST that claim,
 *      never the thing that reveals it. Pure CSS (`:checked` + `:has()` on the figure) — no
 *      script is needed for it to work, and every native `<input type="radio">` is reachable and
 *      operable from the keyboard the same way any radio group always is. See `SKILL.md`, "When to
 *      use" for the test this format applies before adding a filter to a real beat — most beats
 *      should not have one.
 *   6. THE SAME FACTS, FOR A READER WHO CANNOT SEE THE PICTURE — nothing in this file draws it.
 *      `data-detail`, item 2's own attribute, is already every mark's own fact in one string; a
 *      reader with no spatial access to the chart still needs it read LINEARLY, all of it, not one
 *      mark at a time. That is mechanics, not this story's concern, so it lives in
 *      `scripts/render-web.mjs`'s `accessibleTable` — read every `data-detail` back off the SSR'd
 *      markup and print an opt-in `<table>` after it, one row per mark, visually hidden until
 *      focused. Generic across every beat this format ships, present and future: a component never
 *      writes this table itself, the same way it never writes `buildCss` or the tooltip div.
 *      (`same-facts-without-the-picture`, `doctrine/references/guard-catalogue.json`.)
 *
 * A seed is a real beat, not a mechanics demo (`references/web-discipline.md` was written against
 * exactly this file's own first build, and updated against this one). This one draws a real claim —
 * rainfall over a sample town fell by a third — with the two editorial devices that claim genuinely
 * needs: a reference rule held at the level the claim is measured from, and a callout on the one
 * year the fall was not a straight line. The story that needs a second series, a crossing, or a
 * different device writes its own component; adding a `variant` prop to this file is the failure
 * this seed exists to prevent.
 *
 * `WebFrame` lives here, not beside a story, because it describes this FORMAT's own mechanics (one
 * continuously-fluid frame, its own tick hints, its own fixed type scale) rather than any one
 * story's numbers. A story's own composition does NOT import it from here, though: unlike
 * `render-still.mjs`/`interaction.mjs`, which a real installed root vendors to `#shared/*`,
 * `WebFrame` is a compile-time-only type with no vendoring path a story could reach — there is
 * nothing to import it FROM outside this dev repository. So a story declares its own matching copy
 * inline, the same "duplicate, do not link" ruling this project already applies elsewhere.
 *
 * This component itself never imports the rasteriser (`deriveFurniture`/`measureText`): `ink`/
 * `muted`/`grid`/`measure` below are props, derived once in node by whatever runner calls this
 * component (`scripts/render-preview.mjs` for this skill's own preview, `scripts/render-web.mjs`'s
 * `renderWeb` for a real beat) — never derived inside the component, and never a second
 * implementation of the colour or measurement rule per beat.
 *
 * `wrap` below is UNCHANGED from this seed's first build and is still exported even though
 * `ChartWebSeed` no longer calls it: `../../splash/test/helper-parity.test.ts` cross-checks it,
 * byte-for-byte, against every other `wrap` copy in this repository (the "static family" — copies
 * that close over, or are handed, the resvg measurer) to prove the greedy word-wrap RULE has not
 * silently drifted between the ~10 duplicates this project carries. Removing the export, even though
 * nothing here calls it any more, would blind that guard rather than satisfy it. Title, caveat and
 * source no longer need server-side wrapping because they are plain flowing HTML now — the browser
 * wraps them the same way it wraps any paragraph, at whatever width its own container ends up.
 */

import { extent, tickStep } from "d3-array";
import { scaleLinear } from "d3-scale";
// The filter vocabulary, vendored into this skill (`./filter.ts`) and never imported from another.
// `attrsFor` is the ONE call a component makes: spread it on every element drawn from a datum, and
// the mark, the segment arriving at it, its hit target and anything a later beat adds are hidden or
// shown together by construction rather than by four hand-written selectors kept in step.
import { attrsFor } from "./filter.ts";
// The entrance contract, vendored into this skill (`./entrance.ts`) and never imported from
// `chart-video`, whose vocabulary it copies. The component's job here is to decide WHICH
// element belongs to which of the five events and — for the two labels — to derive the instant the
// mark they name arrives, from this beat's own geometry. It never types a delay.
import {
  ENTRANCE_EASING,
  LABEL_FADE_MS,
  WEB_ENTRANCE,
  atProgress,
  endOf,
  entranceClipId,
  entranceLayer,
} from "./entrance.ts";

type Reading = { year: number; value: number };
type Measure = (
  text: string,
  font: { fontSize: number; fontWeight?: number },
) => number;
type Period = "early" | "late";

export type WebFrame = {
  /** The plot rectangle's own canonical width/height, in SVG user units. NOT a rendered pixel size
   *  and NOT a cap: the `<svg>` is stretched (`preserveAspectRatio="none"`) to fill whatever box
   *  `.chart-plot`'s CSS grid gives it, at any container width. This pair only fixes the geometry's
   *  own internal proportions (how a fixed-height-below-the-plot x-axis row and a content-measured
   *  y-axis gutter combine into one `aspect-ratio` for that box) and the tick-density decisions
   *  below, which are made once, at this canonical size, and then scale uniformly with everything
   *  else — never recomputed per resize. */
  width: number;
  height: number;
  /** Fixed CSS pixel row, below the plot, reserved for the x-axis year labels — a margin, not part
   *  of the `viewBox`, so its type never scales with it. */
  xAxisRowPx: number;
  title: { fontSize: number; fontWeight: number };
  subtitle: { fontSize: number; fontWeight: number };
  source: { fontSize: number; fontWeight: number };
  axis: { fontSize: number };
  label: { fontSize: number; fontWeight: number };
  note: { fontSize: number };
  filter: { fontSize: number };
  /** How many y gridlines this frame asks for (d3 treats it as a hint, same as the static format). */
  yTickHint: number;
  /** How many x ticks `tickStep` derives a round interval from. Picked once, for the whole
   *  continuous width range this format now ships — see `references/web-discipline.md`,
   *  "Responsive behaviour", for why tick density is not re-derived live as the frame resizes. */
  xTickHint: number;
  /** A regular gridline this close (in canonical SVG units, at `height`) to the reference is
   *  dropped. */
  minGridlineGapPx: number;
};

// ===== CONFIG — edit for your story =====
// Everything between here and the closing marker is this beat's own words and its own editorial
// calls — the next beat replaces every value below. Nothing beneath the marker (the `WebFrame`
// instance aside, which is this format's own tuned default) is specific to rainfall.
const UNIT = "mm";
const CAVEAT =
  "Annual total, measured at the sample town's official rain gauge.";
/** The level the reference rule holds the reader's eye against. This beat's own editorial choice,
 *  not something a script could derive generically — a different beat's honest reference might be
 *  a multi-year average, not its series' first reading. Here it is 2015 because the title's own
 *  claim ("fell by a third") is measured against exactly that year. */
const REFERENCE_YEAR = 2015;
const REFERENCE_LABEL = "2015 level";
/** One year worth naming even though the reference rule and the end label already carry the
 *  argument — a judgement a script cannot make from the numbers alone. The series rises in three
 *  years (2018 +36mm, 2020 +64mm, 2022 +26mm); 2020 is picked because it is the LARGEST of the
 *  three, the single biggest year-over-year rebound in the whole series (742mm → 806mm) — not
 *  merely *a* rebound among several. Muted, not shouted. */
const PEAK_YEAR = 2020;
const PEAK_LABEL = "the year's biggest rebound";
/** The filter's own split. Deliberately independent of `PEAK_YEAR` in spirit — it happens to land
 *  on the same year here (2020 is also this series' natural midpoint: 5 readings before it, 6 from
 *  it on), which is a coincidence of an 11-point sample series, not a rule a real beat must repeat.
 *  See this file's own doc-comment, item 5, and `SKILL.md`'s "When to use" for the test a real beat
 *  applies before adding a filter like this one at all. */
const FILTER_SPLIT_YEAR = 2020;
/** The control's own words. Part of the declaration, not of the machinery — a beat filtering by
 *  region, by fuel or by size writes its own legend and its own noun. */
const FILTER_LEGEND = "Show";
const FILTER_ALL_LABEL = "All years";
/** The noun the narrowing note counts, so the sentence reads in this beat's own terms. */
const FILTER_UNIT = "readings";
// =========================================

/**
 * THIS BEAT'S OWN FILTER DECLARATION — the whole of what a beat says when it wants one, and the
 * thing it simply leaves out when it does not. Exported so the runner can hand it to `renderWeb`
 * beside the keys the beat draws, and so a test can read it without rendering.
 *
 * It is a THRESHOLD-shaped filter (a split year), expressed as two named sets of keys, which is the
 * whole reduction `filter.ts` is built on: a category column, a series and a threshold band all
 * become "an option is a named set of data keys", so one control, one stylesheet rule and one guard
 * cover every type instead of three of each.
 *
 * A REAL BEAT APPLIES THE TEST FIRST. This seed's is here to make the mechanism runnable end to end
 * in the skill a journalist copies — not as evidence that a beat should have one. `SKILL.md`'s
 * "When to use" and `references/web-discipline.md` carry the test: a filter earns its place only
 * when the data has a natural, orthogonal dimension a reader would plausibly want to isolate, and
 * narrowing to it is a genuinely different reading rather than a smaller version of the same one.
 * Most beats do not, and a beat that does not declares nothing — see the twenty committed chart
 * beats that now ship no control and no CSS for one.
 */
export function seedFilterDeclaration(years: number[]) {
  return {
    label: FILTER_LEGEND,
    allLabel: FILTER_ALL_LABEL,
    unit: FILTER_UNIT,
    options: (["early", "late"] as Period[]).map((period) => ({
      label: periodRangeLabel(period, years, FILTER_SPLIT_YEAR),
      keys: years
        .filter((year) => periodOf(year, FILTER_SPLIT_YEAR) === period)
        .map(String),
    })),
  };
}

/** Early/late relative to `FILTER_SPLIT_YEAR` — the filter's own category, derived from the data
 *  rather than tagged by hand. Exported and pure so it is unit-tested directly. */
export function periodOf(year: number, splitYear: number): Period {
  return year < splitYear ? "early" : "late";
}

/** The human label for one filter option, derived from the actual span of readings that period
 *  covers rather than hand-typed — so a story with a different series never ships a stale range. */
export function periodRangeLabel(
  period: Period,
  years: number[],
  splitYear: number,
): string {
  const inPeriod = years.filter((y) => periodOf(y, splitYear) === period);
  return `${Math.min(...inPeriod)}–${Math.max(...inPeriod)}`;
}

/**
 * The fitted vertical scale — fitted to the readings, not anchored at zero, for the same reason
 * `chart-beat/assets/ChartSeed.tsx` gives: a line carries its value by slope, and anchoring a
 * 604–912 mm series at a 0–1000 axis would flatten the very fall this beat is about.
 */
function yScale(data: Reading[]) {
  return scaleLinear()
    .domain(extent(data.map((d) => d.value)) as [number, number])
    .nice();
}

/** Conventional density for this frame: d3 picks the round values inside the fitted range. */
export function yTickValues(data: Reading[], hint: number): number[] {
  return yScale(data).ticks(hint);
}

/** Regular, round-interval x ticks derived from the series' own span, never a fixed count of
 *  arbitrary points and never `first, middle, last`. */
export function xTickValues(years: number[], hint: number): number[] {
  const first = Math.min(...years);
  const last = Math.max(...years);
  if (first === last) return [first];
  const step = tickStep(first, last, hint);
  const values: number[] = [];
  for (let year = Math.ceil(first / step) * step; year <= last; year += step) {
    values.push(year);
  }
  return values;
}

/** The x-range is inset by this many SVG user units on each side — enough to clear the largest
 *  circle radius this format draws (`.pt`'s own hit circle, r=5) — so the first/last point's own
 *  circle never sits flush against the `viewBox` edge. An SVG clips to its `viewBox` by default
 *  (no `overflow: visible` is set — adding one would let a point bleed into the neighbouring grid
 *  column instead), so without this inset the end point's own accent dot is silently clipped in
 *  half at any container width, caught only by a screenshot, never by the markup or a unit test —
 *  exactly the class of defect this format's own gotcha section warns is invisible to anything but
 *  driving a real browser. */
const POINT_INSET = 6;

/**
 * Data to coordinates, and nothing else — no colour, no font, no label, no header padding: the plot
 * rectangle IS `[0, width] x [0, height]` (gutters are CSS grid tracks around it, not baked into the
 * `viewBox` — see `ChartWebSeed` below), inset by `POINT_INSET` on the x-axis so a point's own
 * circle never clips against that box's edge. That boundary is what keeps this testable, and it is
 * the part worth keeping even after the rest of this file is thrown away for the next beat. Returns
 * the fitted `y` scale itself so the caller can place the reference rule at any value, not only one
 * that happens to be a reading.
 */
export function chartGeometry(
  data: Reading[],
  { width, height }: { width: number; height: number },
) {
  const years = data.map((d) => d.year);
  const x = scaleLinear()
    .domain([Math.min(...years), Math.max(...years)])
    .range([POINT_INSET, width - POINT_INSET]);
  const y = yScale(data).range([height, 0]);
  const points = data.map((d) => ({
    year: d.year,
    value: d.value,
    x: x(d.year),
    y: y(d.value),
  }));
  return { width, height, points, x, y };
}

/** Consecutive-pair line segments, each carrying its own `period` (the arriving point's period —
 *  see this file's own doc-comment, item 5) so the filter can dim exactly the segments that leave
 *  the chosen range while the argument-bearing furniture around them stays untouched. Splitting the
 *  single path this format used to draw into N-1 two-point segments costs nothing visually (round
 *  linecap/linejoin at shared endpoints reads identically to one continuous path) and is what makes
 *  per-segment CSS opacity possible without a script recomputing anything. */
export function segments(
  points: ReturnType<typeof chartGeometry>["points"],
  splitYear: number,
) {
  const segs: Array<{
    a: (typeof points)[number];
    b: (typeof points)[number];
    period: Period;
  }> = [];
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    segs.push({ a, b, period: periodOf(b.year, splitYear) });
  }
  return segs;
}

/** Wrap on the measured width of the real string, never on a character count. Kept for the
 *  cross-skill parity guard this file's own doc-comment explains (`helper-parity.test.ts`) — not
 *  called by `ChartWebSeed` below, whose furniture is plain HTML the browser wraps itself. */
/**
 * A WORD WIDER THAN ITS OWN MEASURE — hyphen-broken, never broken mid-syllable.
 *
 * Carried verbatim across the wrap family (`splash/test/helper-parity.test.ts` compares them
 * case for case). `wrap` breaks between words, so a token wider than the measure was emitted whole
 * and ran off the frame — invisible at 900x560 and a 219px overflow the moment a phone frame put
 * 78px type on a 1080px canvas. A hyphen is already a break and already reads as one, so a
 * hyphenated token is split at its own hyphens and `wrap` re-joins without a space after one.
 *
 * A token with no hyphen and no room is emitted WHOLE and not refused: breaking a word
 * mid-syllable is a decision about somebody's name, and a throw here would be a contract change
 * for the fluid web copies, where a transient 1px measure during layout is ordinary. The overflow
 * is refused where it can be SEEN — `three-sizes-no-collision.test.ts` measures every run's real
 * ink box against the frame edge.
 */
function breakLongTokens(
  words: string[],
  maxWidth: number,
  font: { fontSize: number; fontWeight: number },
  measure: Measure,
): string[] {
  const out: string[] = [];
  for (const word of words) {
    const pieces = word.split("-");
    if (pieces.length === 1 || measure(word, font) <= maxWidth) {
      out.push(word);
      continue;
    }
    pieces.forEach((piece, i) =>
      out.push(i < pieces.length - 1 ? `${piece}-` : piece),
    );
  }
  return out;
}

export function wrap(
  text: string,
  maxWidth: number,
  font: { fontSize: number; fontWeight: number },
  measure: Measure,
): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of breakLongTokens(
    text.split(/\s+/),
    maxWidth,
    font,
    measure,
  )) {
    const joiner = line.endsWith("-") ? "" : " ";
    const trial = line ? `${line}${joiner}${word}` : word;
    if (line && measure(trial, font) > maxWidth) {
      lines.push(line);
      line = word;
    } else line = trial;
  }
  return line ? [...lines, line] : lines;
}

/** `value / total`, as a percentage, rounded to one decimal — the one arithmetic step that lets a
 *  label positioned in plain HTML land at the exact spot the SVG geometry it annotates was drawn
 *  at, expressed as a fraction of the SAME box (see `ChartWebSeed`'s CSS grid: the overlay div and
 *  the `<svg>` occupy the identical grid cell), so it tracks the `<svg>`'s own continuous stretch
 *  for free — the browser's own layout engine does the proportional math on every resize, not a
 *  script recomputing pixels. */
function pct(value: number, total: number): number {
  return total === 0 ? 0 : Math.round((value / total) * 1000) / 10;
}

/**
 * ── THE HOVERABLE LINE ─────────────────────────────────────────────────────────────────────────
 * The component-side half of this format's line primitive. Its other two halves live in the skill
 * too: `initLines` in `assets/interaction.mjs` wires it, and `buildCss`'s `.line-hit` rule in
 * `scripts/render-web.mjs` carries the one load-bearing declaration, `pointer-events: stroke`.
 *
 * WHAT IT IS FOR. A reading that belongs to a LINE rather than to a point — what links its two
 * ends. A slope's connector says "Germany fell from 12.4 t to 5.7 t, −6.7 t, −54 %", which no
 * per-endpoint tooltip can say however many endpoints it answers; a route's segment says which
 * territory it crosses and how far along the journey it is. Both were asked for by name and both
 * need the same thing, so it is written once here and duplicated into the beats that draw one
 * (`hoverable-line-parity.test.ts` walks every copy and fails if two bodies disagree).
 *
 * HOW IT WORKS. A TRANSPARENT STROKED TWIN of the visible path, drawn immediately after it, with
 * `pointer-events: stroke` so the hit region is the stroke and not the bounding box — the bounding
 * box of a diagonal is mostly empty space, and a reader aiming at the line they can see would
 * otherwise be answered by a rectangle covering everything between the line and the frame.
 * `vectorEffect="non-scaling-stroke"` is not decoration either: under this format's
 * `preserveAspectRatio="none"` a stroke stated in user units becomes an ellipse of the container's
 * own aspect ratio, so the twin would be 60px wide on an ultrawide frame and 8px on a phone.
 *
 * KEYBOARD PARITY IS BAKED, not scripted: the twin carries `tabIndex` and its own `aria-label` at
 * build time, so Tab reaches every line and a screen reader names it with the script absent.
 *
 * THE SEED ITSELF DRAWS NO HOVERABLE LINE, and that is a property of the seed rather than of the
 * primitive: this composition resolves a pointer to the nearest reading by x over one `.hit-area`
 * rect drawn LAST, i.e. on top of everything, so a twin beneath it could never receive an event.
 * A beat whose targets are discrete (a slope's twenty endpoints, a route's segments) has no such
 * rect, and the twin is the top-most thing over the line it belongs to.
 */
/** The transparent twin's stroke width, in CSS pixels. A knob, and it is one number: 24 is the
 *  24px touch-target floor this project holds elsewhere, applied to a target a reader aims at along
 *  its length rather than at a point — half of it either side of a line they can see. */
export const LINE_HIT_WIDTH = 24;

/** Every attribute the transparent twin needs, from the visible path's own `d` and the beat's own
 *  frozen reading. Returns props rather than markup so a component composes it into its own
 *  element and this helper never decides where in the paint order the twin lands. */
export function hoverableLineProps({
  d,
  detail,
  label,
}: {
  d: string;
  detail: string;
  label: string;
}) {
  return {
    className: "line-hit",
    d,
    fill: "none",
    stroke: "transparent",
    strokeWidth: LINE_HIT_WIDTH,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    vectorEffect: "non-scaling-stroke" as const,
    tabIndex: 0,
    role: "img" as const,
    "aria-label": label,
    "data-detail": detail,
  };
}

export function ChartWebSeed({
  data,
  title,
  source,
  alt,
  ground,
  accent,
  subject,
  ink,
  muted,
  grid,
  measure,
  frame,
  filterIndex = new Map<string, string[]>(),
  filterOptions = [],
  filterNotes = [],
}: {
  data: Reading[];
  title: string;
  source: string;
  alt: string;
  ground: string;
  accent: string;
  subject: string;
  /** Derived from `ground` by `deriveFurniture` in whatever node runner calls this component — see
   *  this file's own doc-comment. Never derived in here. */
  ink: string;
  muted: string;
  grid: string;
  measure: Measure;
  frame: WebFrame;
  /** THE FILTER, ALL THREE OF THEM DERIVED IN THE RUNNER FROM ONE DECLARATION (`./filter.ts`), never
   *  here. A beat that declares no filter is handed an empty index, no options and no notes, and
   *  every expression below collapses to nothing — no fieldset, no attribute, no sentence. That is
   *  the whole of "removable": there is no flag to set, only a declaration to leave out. */
  filterIndex?: Map<string, string[]>;
  filterOptions?: { id: string; slug: string; label: string; isAll: boolean }[];
  filterNotes?: { slug: string; text: string }[];
}) {
  if (data.length < 2)
    throw new Error(
      `a web beat needs at least two readings, got ${data.length}`,
    );

  const years = data.map((d) => d.year);
  const last = data[data.length - 1];
  const endLabel = `${subject} · ${last.value} ${UNIT}`;

  const referenceValue =
    data.find((d) => d.year === REFERENCE_YEAR)?.value ?? data[0].value;

  // A provisional scale, at the canonical plot height, so the reference's own y position is known
  // BEFORE the tick set is finalised — the only way to drop a regular gridline that would otherwise
  // sit a few pixels from the dashed reference rule and read as visual noise.
  const gridScale = yScale(data).range([frame.height, 0]);
  const referenceYProvisional = gridScale(referenceValue);
  const regularTicks = gridScale
    .ticks(frame.yTickHint)
    .filter(
      (v) =>
        Math.abs(gridScale(v) - referenceYProvisional) >=
        frame.minGridlineGapPx,
    );
  const tickValues = [...regularTicks, referenceValue].sort((a, b) => a - b);
  const topValue = Math.max(...tickValues);
  const tickLabels = tickValues.map((v) =>
    v === topValue ? `${v} ${UNIT}` : `${v}`,
  );

  // The one place this component still measures anything: the y-axis label column is a real CSS
  // grid track (`--y-gutter`), sized to the widest label that will actually sit in it, at the axis
  // font's own FIXED size — never a guessed constant, and never resized on the fly, the same
  // "measured, not assumed" rule the rest of this codebase's gutters already keep.
  const yGutterPx =
    10 + Math.max(...tickLabels.map((l) => measure(l, frame.axis)));

  const { points, x, y } = chartGeometry(data, {
    width: frame.width,
    height: frame.height,
  });
  const segs = segments(points, FILTER_SPLIT_YEAR);
  const referenceY = y(referenceValue);
  const peakPoint = points.find((p) => p.year === PEAK_YEAR);
  const end = points[points.length - 1];
  const xTicks = xTickValues(years, frame.xTickHint);

  const totalWidth = yGutterPx + frame.width;
  const totalHeight = frame.height + frame.xAxisRowPx;

  // ── THE ENTRANCE. Five events, in the video's own order, read off `./entrance.ts`.
  //
  // Everything below decides WHICH element belongs to which event. Two of them are DERIVED from
  // this beat's own geometry rather than chosen, and those two are the label rule
  // (`doctrine/references/motion-grammar.md`: "a label's reveal gates on its own mark, never
  // on a master clock"):
  //
  //   - the reference LABEL follows its rule at 0.55 of `reference` — the video's own knob, the
  //     same number, because the thing it is timing is the same thing;
  //   - the peak LABEL waits for the wipe's head to reach the peak's own x, and then the video's
  //     own 0.06-of-the-reveal lag on top. `peakPoint.x / frame.width` is where the head is when it
  //     passes that year, so the delay moves if the data does.
  //
  // The two labels that are NOT derived are the two that do not name a mark: the title is
  // furniture and establishes with the axis (the video's first build put it on the conclusion and
  // played seven of its eight seconds under an empty band), and the end label IS the conclusion —
  // the subject's own value, stated once the point carrying it has landed, which the contract's
  // ordering rule already guarantees because `conclusion.start` is `subject`'s end.
  const revealHeadAt = (x: number) =>
    atProgress(WEB_ENTRANCE.reveal, x / frame.width);
  const furnitureLayer = () =>
    entranceLayer("establish", "fade", {
      delay: WEB_ENTRANCE.establish.start,
      duration: WEB_ENTRANCE.establish.duration,
      ease: ENTRANCE_EASING.ARRIVE,
    });
  const referenceRuleLayer = entranceLayer("reference", "wipe", {
    delay: WEB_ENTRANCE.reference.start,
    duration: WEB_ENTRANCE.reference.duration,
    ease: ENTRANCE_EASING.ARRIVE,
  });
  const referenceLabelLayer = entranceLayer("reference", "fade", {
    delay: atProgress(WEB_ENTRANCE.reference, 0.55),
    duration: LABEL_FADE_MS,
    ease: ENTRANCE_EASING.ARRIVE,
  });
  // LINEAR, and it is the one easing choice that is not a matter of taste. The video's own
  // `drawnSoFar` states it: the reveal is linear because the x axis IS time, and easing it would
  // make some years occupy more screen time than others. A wipe across that same axis inherits both
  // the rule and the reason — and, on an irregularly spaced series, obeys it more literally than
  // the video does, because the wipe advances at a constant pace in x while `drawnSoFar` advances
  // at a constant pace in READING INDEX. On this beat's eleven annual readings the two coincide.
  const revealLayer = entranceLayer("reveal", "wipe", {
    delay: WEB_ENTRANCE.reveal.start,
    duration: WEB_ENTRANCE.reveal.duration,
    ease: ENTRANCE_EASING.LINEAR,
  });
  const peakMarkLayer = peakPoint
    ? entranceLayer("reveal", "fade", {
        delay: revealHeadAt(peakPoint.x),
        duration: LABEL_FADE_MS,
        ease: ENTRANCE_EASING.ARRIVE,
      })
    : null;
  const peakLabelLayer = peakPoint
    ? entranceLayer("reveal", "fade", {
        delay: revealHeadAt(peakPoint.x) + 0.06 * WEB_ENTRANCE.reveal.duration,
        duration: LABEL_FADE_MS,
        ease: ENTRANCE_EASING.ARRIVE,
      })
    : null;
  const subjectLayer = entranceLayer("subject", "land", {
    delay: WEB_ENTRANCE.subject.start,
    duration: WEB_ENTRANCE.subject.duration,
    ease: ENTRANCE_EASING.ARRIVE,
  });
  const conclusionLayer = entranceLayer("conclusion", "fade", {
    delay: WEB_ENTRANCE.conclusion.start,
    duration: WEB_ENTRANCE.conclusion.duration,
    ease: ENTRANCE_EASING.ARRIVE,
  });
  // Unique per beat, because two of these files can land in one article — see `entranceClipId`.
  const revealClipId = entranceClipId(title);
  // Asserted here rather than left to a reader: a derived delay can overrun the ceiling even when
  // the contract itself does not, because half of them come from the data. `endOf` is the contract's
  // own arithmetic; the peak label is the latest thing this beat derives.
  const lastDerivedEnd = peakLabelLayer
    ? revealHeadAt(peakPoint!.x) +
      0.06 * WEB_ENTRANCE.reveal.duration +
      LABEL_FADE_MS
    : 0;
  if (lastDerivedEnd > endOf(WEB_ENTRANCE.conclusion))
    throw new Error(
      `the peak label's derived arrival ends at ${Math.round(lastDerivedEnd)}ms, after the ` +
        `conclusion at ${endOf(WEB_ENTRANCE.conclusion)}ms — a note would appear after the ` +
        `sentence that closes the argument`,
    );

  return (
    <figure
      className="chart-figure"
      style={{
        ["--ground" as string]: ground,
        ["--accent" as string]: accent,
        ["--ink" as string]: ink,
        ["--muted" as string]: muted,
        // Fixed CSS pixel type sizes, threaded from `frame` as custom properties so
        // `render-web.mjs`'s `buildCss` stays generic (it never reads a story's own `WebFrame`,
        // the same invariant this format has kept since its first build) while a story can still
        // tune its own scale by passing a different `frame`. None of these ever changes with the
        // viewBox's own width — that is the whole point of this redesign.
        ["--title-size" as string]: `${frame.title.fontSize}px`,
        ["--title-weight" as string]: frame.title.fontWeight,
        ["--subtitle-size" as string]: `${frame.subtitle.fontSize}px`,
        ["--source-size" as string]: `${frame.source.fontSize}px`,
        ["--axis-size" as string]: `${frame.axis.fontSize}px`,
        ["--label-size" as string]: `${frame.label.fontSize}px`,
        ["--label-weight" as string]: frame.label.fontWeight,
        ["--note-size" as string]: `${frame.note.fontSize}px`,
        ["--filter-size" as string]: `${frame.filter.fontSize}px`,
      }}
    >
      <div
        className="chart-header"
        {...furnitureLayer().attrs}
        style={furnitureLayer().vars}
      >
        <h2 className="chart-title">{title}</h2>
        <p className="chart-caveat">{CAVEAT}</p>
      </div>

      {/* The filter — drawn from the DECLARATION the runner handed down (`./filter.ts`), never from
          this story's own words, so a beat that declares none renders nothing here at all: no
          fieldset, no legend, no radios. The hiding itself is pure CSS (`:checked` + `:has()` on
          the enclosing `.chart-figure`, one generated rule per option over `[data-filter]`), so it
          works identically with the inline script absent and regardless of how deep inside the
          `<fieldset>` a given `<input>` sits — a plain sibling combinator could not reach past the
          `<label>` wrapping each one. */}
      {filterOptions.length > 0 && (
        <fieldset
          className="chart-filter"
          {...furnitureLayer().attrs}
          style={furnitureLayer().vars}
        >
          <legend>{FILTER_LEGEND}</legend>
          {/* One wrapper around the options — the element the shared stylesheet draws the segmented
              control's own outer track on (`.chart-filter .options`), so the pills read as one
              control rather than loose chips, and so the `<legend>` is not inside that track. It is
              a grouping box and nothing else: the control is still plain
              `<input type="radio" name="chart-filter">` in a `<fieldset>` with a `<legend>`, which
              is what makes it a radio group to a screen reader and to the keyboard. */}
          <div className="options">
            {filterOptions.map((option) => (
              <label key={option.id}>
                <input
                  id={option.id}
                  type="radio"
                  name="chart-filter"
                  value={option.slug}
                  defaultChecked={option.isAll}
                />
                {option.label}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {/* THE NARROWING NOTE — one per option, hidden by default and revealed by the same `:checked`
          that narrows the marks. A filtered view is a partial view while the title above states the
          whole claim; this is the sentence that stops the two contradicting each other silently.
          Both of its numbers come from the beat's own frozen data (`filterNotes`), so nobody can
          edit the count and not the total. */}
      {filterNotes.map((note) => (
        <p className="filter-note" data-filter-note={note.slug} key={note.slug}>
          {note.text}
        </p>
      ))}

      <div
        className="chart-plot"
        style={{
          ["--y-gutter" as string]: `${yGutterPx}px`,
          ["--x-axis-h" as string]: `${frame.xAxisRowPx}px`,
          aspectRatio: `${totalWidth} / ${totalHeight}`,
        }}
      >
        <div
          className="y-axis"
          {...furnitureLayer().attrs}
          style={furnitureLayer().vars}
        >
          {tickValues.map((value, i) => (
            <span
              key={value}
              className="axis-label y"
              style={{ top: `${pct(y(value), frame.height)}%`, color: muted }}
            >
              {tickLabels[i]}
            </span>
          ))}
        </div>

        {/* GEOMETRY ONLY below — no `<text>`. `preserveAspectRatio="none"` lets this stretch to
            fill exactly whatever box the grid gives it at any container width; the `aspect-ratio`
            above already keeps that box's own proportions sane as it grows (see
            `references/web-discipline.md`, "Responsive behaviour"). */}
        <svg
          // The graphic's own NAME. Measured in Chrome on a delivered artifact through
          // `Accessibility.getFullAXTree`: a root `<svg>` carrying a `<desc>` and nothing else comes
          // back as `SvgRoot` with `name: ""` — a description with nothing to announce it against,
          // which is why a bare `<desc>` is not reliably read out. `group` rather than `img`,
          // because `img` is the role the ARIA spec makes children-presentational and this format's
          // whole keyboard contract lives in the focusable marks below.
          role="group"
          aria-label={title}
          xmlns="http://www.w3.org/2000/svg"
          className="chart"
          viewBox={`0 0 ${frame.width} ${frame.height}`}
          preserveAspectRatio="none"
          fontFamily="Helvetica, Arial, sans-serif"
        >
          <desc>{alt}</desc>
          <rect
            x={0}
            y={0}
            width={frame.width}
            height={frame.height}
            fill={ground}
          />

          {/* The gridlines are FURNITURE and arrive with the axis labels beside them, on one
              clock — one `<g>` rather than a fade per line, which is the video's own rule ("title,
              source, axis, ticks, gridlines — one fade, together, then still forever"). */}
          <g {...furnitureLayer().attrs} style={furnitureLayer().vars}>
            {tickValues.map((value) =>
              // The reference's own row gets no regular gridline — the dashed reference rule below
              // already marks this height; a second, plain line here would read as clutter.
              value === referenceValue ? null : (
                <line
                  key={value}
                  x1={0}
                  x2={frame.width}
                  y1={y(value)}
                  y2={y(value)}
                  stroke={grid}
                  strokeWidth={1}
                  vectorEffect="non-scaling-stroke"
                />
              ),
            )}
          </g>

          {/* THE REFERENCE, laid down left to right before the evidence — `transform: scaleX()`
              from this line's own x1 of 0, which is the video's
              `interpolate(referenceProgress, [0, 1], [plot.left, plot.right])` written as a
              transform. `vector-effect="non-scaling-stroke"` keeps the dash pattern in screen units
              while it grows, so the dashes do not compress as the line lengthens. */}
          <line
            {...referenceRuleLayer.attrs}
            style={referenceRuleLayer.vars}
            x1={0}
            x2={frame.width}
            y1={referenceY}
            y2={referenceY}
            stroke={muted}
            strokeWidth={1}
            strokeDasharray="5 4"
            vectorEffect="non-scaling-stroke"
          />

          {/* THE REVEAL. The curve is uncovered left to right by a clip whose rect grows from x=0
              — the same picture, frame for frame, as the video's `drawnSoFar` partial path, since
              the years ascend so the head advances monotonically in x. A CLIP and not a
              `stroke-dashoffset`: a probe drove the dash form under this format's own
              `vector-effect="non-scaling-stroke"` and `preserveAspectRatio="none"` and it was 99 %
              drawn at t=0 — the two coordinate spaces disagree. See `render-web.mjs`'s
              `entranceCss`.
              ONLY THE VISIBLE STROKE IS CLIPPED. The `.pt` targets and the `.hit-area` below sit
              outside it, so hover, tap and keyboard answer for every reading from the first
              millisecond: the entrance is an addition to a page that already works, never a gate
              in front of it. */}
          <defs>
            <clipPath id={revealClipId}>
              <rect
                {...revealLayer.attrs}
                style={revealLayer.vars}
                x={0}
                y={0}
                width={frame.width}
                height={frame.height}
              />
            </clipPath>
          </defs>
          <g clipPath={`url(#${revealClipId})`}>
            {segs.map((seg) => (
              <path
                key={`${seg.a.year}-${seg.b.year}`}
                className="seg"
                // A segment belongs to the reading it ARRIVES at, so hiding a reading hides the line
                // that reaches it and the reader is never left a stroke pointing at nothing. Both
                // halves get the vocabulary from the same call, which is the point: there is no
                // second place to remember.
                {...attrsFor(filterIndex, String(seg.b.year))}
                d={`M ${seg.a.x} ${seg.a.y} L ${seg.b.x} ${seg.b.y}`}
                fill="none"
                stroke={accent}
                strokeWidth={2.5}
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </g>

          {/* THE ANNOTATIONS CARRY THE VOCABULARY, and that is a correction the first render of
              this rework earned by being looked at. An annotation on a LEVEL (the reference rule
              and its label, below) is transversal furniture and stays drawn in every state — it is
              a horizontal line at 912 mm, not a reading. An annotation on a READING is not: the
              notable-year marker belongs to 2020 and the end label prints 2025's own value, so
              under "2015–2019" they hung over an empty plot, pointing at a line that had stopped
              six years earlier, and the end label printed a number the narrowed view does not
              contain. That is the reader-facing contradiction this rework exists to prevent, one
              layer up from the marks. Under the DIMMING this format used to do it read as merely
              faint; hiding makes it visible, which is the argument for hiding. */}
          {/* The peak MARK is outside the reveal's clip and fades in at the instant the head
              passes its own x — the video's mechanism exactly (its peak marker is an opacity gated
              on a computed fraction of the reveal, not a clipped shape). A circle uncovered by a
              vertical wipe would arrive as two half-moons, which is the head's look on a stroke and
              nothing's look on a dot. */}
          {peakPoint && peakMarkLayer && (
            <circle
              {...peakMarkLayer.attrs}
              style={peakMarkLayer.vars}
              {...attrsFor(filterIndex, String(PEAK_YEAR))}
              cx={peakPoint.x}
              cy={peakPoint.y}
              r={3}
              fill={muted}
            />
          )}
          {/* THE SUBJECT, landing as its own event once the curve has reached it. Drawn at (0, 0)
              inside a `<g>` carrying the translate, so `transform: scale()` grows it about its own
              centre with no `transform-origin` percentage and no `transform-box` question — the
              two things that resolve differently across engine versions. */}
          <g transform={`translate(${end.x} ${end.y})`}>
            <circle
              {...subjectLayer.attrs}
              style={subjectLayer.vars}
              {...attrsFor(filterIndex, String(end.year))}
              cx={0}
              cy={0}
              r={4}
              fill={accent}
            />
          </g>

          {/* Interaction layer — items 2 and 3 of this file's own doc-comment, plus the filter's
              own `data-period`. Every reading is `tabIndex={0}` with its own `aria-label`/
              `data-detail` baked in at build time, invisible at rest (`fill="transparent"`; only
              CSS toggles it to `muted` on hover/focus). Filter opacity applies here too (harmless —
              the fill is already transparent at rest), never to `tabIndex`/`pointerEvents`, so
              every reading stays reachable regardless of which filter is selected. */}
          {points.map((p) => (
            <circle
              key={p.year}
              className="pt"
              {...attrsFor(filterIndex, String(p.year))}
              cx={p.x}
              cy={p.y}
              r={5}
              fill="transparent"
              stroke="none"
              tabIndex={0}
              role="img"
              aria-label={`${p.year}: ${p.value} ${UNIT}`}
              data-year={p.year}
              data-detail={`${p.year} · ${p.value} ${UNIT}`}
            />
          ))}
          <rect
            className="hit-area"
            x={0}
            y={0}
            width={frame.width}
            height={frame.height}
            fill="transparent"
            pointerEvents="all"
          />
        </svg>

        {/* HTML overlay — same grid cell as the `<svg>` above, so a `%` position lands on the exact
            point/line it annotates at any width. Never toggled by the filter or the script: the
            reference rule's label, the peak's own label and the subject's end label are the
            argument, already stated (`references/web-discipline.md`, "What must not become
            interactive"). Each gets a small `--ground`-coloured chip (CSS) so it stays legible over
            whatever the line/gridlines put behind it, without reserving a permanent gutter for it —
            the one box this format allows, same reasoning as the `#tooltip` it already carries. */}
        <div className="overlay" aria-hidden="true">
          <span
            {...referenceLabelLayer.attrs}
            className="note reference-label"
            style={{
              ...referenceLabelLayer.vars,
              left: "0%",
              top: `${pct(referenceY, frame.height)}%`,
              color: muted,
            }}
          >
            {REFERENCE_LABEL}
          </span>
          {peakPoint && peakLabelLayer && (
            <span
              {...peakLabelLayer.attrs}
              {...attrsFor(filterIndex, String(PEAK_YEAR))}
              className="note peak-label above"
              style={{
                ...peakLabelLayer.vars,
                left: `${pct(peakPoint.x, frame.width)}%`,
                top: `${pct(peakPoint.y, frame.height)}%`,
                color: muted,
              }}
            >
              {PEAK_LABEL}
            </span>
          )}
          <span
            {...conclusionLayer.attrs}
            {...attrsFor(filterIndex, String(end.year))}
            className="end-label"
            style={{
              ...conclusionLayer.vars,
              left: `${pct(end.x, frame.width)}%`,
              top: `${pct(end.y, frame.height)}%`,
              color: accent,
            }}
          >
            {endLabel}
          </span>
        </div>

        <div
          className="x-axis"
          {...furnitureLayer().attrs}
          style={furnitureLayer().vars}
        >
          {xTicks.map((year) => (
            <span
              key={year}
              className="axis-label x"
              style={{ left: `${pct(x(year), frame.width)}%`, color: muted }}
            >
              {year}
            </span>
          ))}
        </div>
      </div>

      <p
        className="chart-source"
        {...furnitureLayer().attrs}
        style={furnitureLayer().vars}
      >
        {source}
      </p>
    </figure>
  );
}

/** The format's own single, continuously-fluid frame — replaces the first build's `DESKTOP_LAYOUT`/
 *  `NARROW_LAYOUT` pair. One canonical geometry, stretched at render time; see this file's own
 *  doc-comment and `SKILL.md`'s "Tuning knobs" for what each number controls. */
export const FRAME: WebFrame = {
  width: 820,
  height: 380,
  xAxisRowPx: 28,
  title: { fontSize: 24, fontWeight: 700 },
  subtitle: { fontSize: 14, fontWeight: 400 },
  source: { fontSize: 13, fontWeight: 400 },
  axis: { fontSize: 12 },
  label: { fontSize: 14, fontWeight: 600 },
  note: { fontSize: 12 },
  filter: { fontSize: 13 },
  yTickHint: 5,
  xTickHint: 6,
  minGridlineGapPx: 20,
};

// ===== Documentation-preview renderer — NOT the shipped beat =====
// `scripts/render-preview.mjs` produces `assets/preview.png`/`output-proof/preview.png`, a static
// thumbnail a human browses the skill folder to look at. It rasterises through `@resvg/resvg-js`
// (`render-still.mjs`), which loads SVG only — it cannot lay out the HTML/CSS furniture
// `ChartWebSeed` now draws around its geometry, because that furniture's entire reason to exist is
// a live browser's own text layout. So this second, SVG-only component bakes the same words as SVG
// `<text>`, the way this format's first build drew everything — it is what makes a legible PNG
// possible at all — and it is explicitly NOT what `render-web.mjs` ships to a reader: the actual
// interactive beat never uses this component. One frame, one width, because a static image was
// never two rungs to begin with (`SEED_LAYOUT` in this seed's first build only ever rendered one of
// its two `WebLayout`s for exactly this reason).
type PreviewPad = { top: number; right: number; bottom: number; left: number };

const PREVIEW_WIDTH = 900;
/** The leading between two wrapped lines of the source block. */
const SOURCE_LEAD = 19;

export function ChartWebPreviewSvg({
  data,
  title,
  source,
  alt,
  ground,
  accent,
  subject,
  ink,
  muted,
  grid,
  measure,
}: {
  data: Reading[];
  title: string;
  source: string;
  alt: string;
  ground: string;
  accent: string;
  subject: string;
  ink: string;
  muted: string;
  grid: string;
  measure: Measure;
}) {
  if (data.length < 2)
    throw new Error(
      `a web beat needs at least two readings, got ${data.length}`,
    );

  const width = PREVIEW_WIDTH;
  const pad = 40;
  const titleFont = { fontSize: 26, fontWeight: 700 };
  const subtitleFont = { fontSize: 14, fontWeight: 400 };
  const sourceFont = { fontSize: 14, fontWeight: 400 };
  const axisFont = { fontSize: 13, fontWeight: 400 };
  const labelFont = { fontSize: 15, fontWeight: 600 };
  const noteFont = { fontSize: 13, fontWeight: 400 };

  const titleLines = wrap(title, width - pad * 2, titleFont, measure);
  const titleBaseline = pad + titleFont.fontSize;
  const caveatLines = wrap(CAVEAT, width - pad * 2, subtitleFont, measure);
  const caveatBaseline = titleBaseline + (titleLines.length - 1) * 34 + 30;
  const sourceLines = wrap(source, width - pad * 2, sourceFont, measure);

  const last = data[data.length - 1];
  const endLabel = `${subject} · ${last.value} ${UNIT}`;
  // The plot starts below the CAVEAT, the last header line — never below the source, which now
  // sits at the frame's own bottom margin the way the shipped HTML has always drawn it (the
  // `<p class="chart-source">` is the figure's last child). This preview drew the source in the
  // header while the format it documents shipped it at the bottom, and had contradicted its own
  // format since it was written.
  const plotTop = caveatBaseline + (caveatLines.length - 1) * 20 + 34;
  const plotBottom = plotTop + 340;
  // The frame is sized from its own contents here (this is a thumbnail, not an export size), so
  // the footer reserve is the x-axis label band plus the whole source block plus clear air.
  const X_TICK_DROP = 24;
  const height =
    plotBottom +
    X_TICK_DROP +
    10 +
    sourceLines.length * SOURCE_LEAD +
    pad -
    SOURCE_LEAD +
    sourceFont.fontSize;
  const sourceBaseline = height - pad - (sourceLines.length - 1) * SOURCE_LEAD;

  const referenceValue =
    data.find((d) => d.year === REFERENCE_YEAR)?.value ?? data[0].value;
  const gridScale = yScale(data).range([plotBottom, plotTop]);
  const referenceYProvisional = gridScale(referenceValue);
  const tickValues = [
    ...gridScale
      .ticks(5)
      .filter((v) => Math.abs(gridScale(v) - referenceYProvisional) >= 20),
    referenceValue,
  ].sort((a, b) => a - b);
  const topValue = Math.max(...tickValues);
  const tickLabels = tickValues.map((v) =>
    v === topValue ? `${v} ${UNIT}` : `${v}`,
  );

  const padding: PreviewPad = {
    top: plotTop,
    right: pad + 12 + measure(endLabel, labelFont),
    bottom: 64,
    left: pad + 10 + Math.max(...tickLabels.map((l) => measure(l, axisFont))),
  };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = plotBottom - plotTop;
  const { points } = chartGeometry(data, {
    width: plotWidth,
    height: plotHeight,
  });
  const shift = (p: { x: number; y: number }) => ({
    x: p.x + padding.left,
    y: p.y + padding.top,
  });
  const shifted = points.map((p) => ({ ...p, ...shift(p) }));
  // `gridScale` is already ranged to `[plotBottom, plotTop]` above — reused here rather than
  // re-deriving the value→y ratio a second time, which is exactly the "two implementations of
  // data-to-coordinates" this format's own doc-comment (`chartGeometry`) warns against.
  const referenceY = gridScale(referenceValue);
  const peakPoint = shifted.find((p) => p.year === PEAK_YEAR);
  const end = shifted[shifted.length - 1];
  const path = shifted
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fontFamily="Helvetica, Arial, sans-serif"
    >
      <desc>{alt}</desc>
      <rect x={0} y={0} width={width} height={height} fill={ground} />
      {titleLines.map((line, i) => (
        <text
          key={line}
          x={pad}
          y={titleBaseline + i * 34}
          fill={ink}
          fontSize={titleFont.fontSize}
          fontWeight={titleFont.fontWeight}
        >
          {line}
        </text>
      ))}
      {caveatLines.map((line, i) => (
        <text
          key={line}
          x={pad}
          y={caveatBaseline + i * 20}
          fill={muted}
          fontSize={subtitleFont.fontSize}
        >
          {line}
        </text>
      ))}
      {sourceLines.map((line, i) => (
        <text
          key={line}
          x={pad}
          y={sourceBaseline + i * SOURCE_LEAD}
          fill={muted}
          fontSize={sourceFont.fontSize}
        >
          {line}
        </text>
      ))}
      {tickValues.map((value, i) => {
        const ty = gridScale(value);
        return (
          <g key={value}>
            {value === referenceValue ? null : (
              <line
                x1={padding.left}
                x2={width - padding.right}
                y1={ty}
                y2={ty}
                stroke={grid}
                strokeWidth={1}
              />
            )}
            <text
              x={padding.left - 10}
              y={ty + 4}
              fill={muted}
              fontSize={axisFont.fontSize}
              textAnchor="end"
            >
              {tickLabels[i]}
            </text>
          </g>
        );
      })}
      {xTickValues(
        data.map((d) => d.year),
        6,
      ).map((year) => {
        const p = shifted.find((pt) => pt.year === year);
        if (!p) return null;
        return (
          <text
            key={year}
            x={p.x}
            y={plotBottom + X_TICK_DROP}
            fill={muted}
            fontSize={axisFont.fontSize}
            textAnchor="middle"
          >
            {year}
          </text>
        );
      })}
      <line
        x1={padding.left}
        x2={width - padding.right}
        y1={referenceY}
        y2={referenceY}
        stroke={muted}
        strokeWidth={1}
        strokeDasharray="5 4"
      />
      <text
        x={padding.left + 4}
        y={referenceY - 8}
        fill={muted}
        fontSize={noteFont.fontSize}
      >
        {REFERENCE_LABEL}
      </text>
      <path
        d={path}
        fill="none"
        stroke={accent}
        strokeWidth={2.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {peakPoint && (
        <>
          <circle cx={peakPoint.x} cy={peakPoint.y} r={3} fill={muted} />
          <text
            x={peakPoint.x}
            y={peakPoint.y - 10}
            fill={muted}
            fontSize={noteFont.fontSize}
            textAnchor="middle"
          >
            {PEAK_LABEL}
          </text>
        </>
      )}
      <circle cx={end.x} cy={end.y} r={4} fill={accent} />
      <text
        x={width - padding.right + 10}
        y={end.y + 5}
        fill={accent}
        fontSize={labelFont.fontSize}
        fontWeight={labelFont.fontWeight}
      >
        {endLabel}
      </text>
    </svg>
  );
}
