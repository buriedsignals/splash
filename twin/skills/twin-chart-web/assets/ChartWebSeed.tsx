/**
 * REPLACE ME. Do not parameterise me.
 *
 * This is not a chart type and it is not a component library. It is the wiring of one interactive
 * chart beat, written out once so the next one can be written from scratch in the same shape.
 *
 * SECOND BUILD OF THIS SEED (see `references/web-discipline.md`, "Responsive behaviour" — the
 * genre's first build shipped two pre-rendered widths, 900px and 360px, swapped by a media query;
 * the owner's own read of that output was that it did not fill its container, and asked for a
 * genuinely continuous fill instead). Five things this genre needs and this file demonstrates:
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
 *      reading, with the script absent entirely.
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
 *      use" for the test this genre applies before adding a filter to a real beat — most beats
 *      should not have one.
 *
 * A seed is a real beat, not a mechanics demo (`references/web-discipline.md` was written against
 * exactly this file's own first build, and updated against this one). This one draws a real claim —
 * rainfall over a sample town fell by a third — with the two editorial devices that claim genuinely
 * needs: a reference rule held at the level the claim is measured from, and a callout on the one
 * year the fall was not a straight line. The story that needs a second series, a crossing, or a
 * different device writes its own component; adding a `variant` prop to this file is the failure
 * this seed exists to prevent.
 *
 * `WebFrame` lives here, not beside a story, because it describes this GENRE's own mechanics (one
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
 * `ChartWebSeed` no longer calls it: `../../splash-twin/test/helper-parity.test.ts` cross-checks it,
 * byte-for-byte, against every other `wrap` copy in this repository (the "static family" — copies
 * that close over, or are handed, the resvg measurer) to prove the greedy word-wrap RULE has not
 * silently drifted between the ~10 duplicates this project carries. Removing the export, even though
 * nothing here calls it any more, would blind that guard rather than satisfy it. Title, caveat and
 * source no longer need server-side wrapping because they are plain flowing HTML now — the browser
 * wraps them the same way it wraps any paragraph, at whatever width its own container ends up.
 */

import { extent, tickStep } from "d3-array";
import { scaleLinear } from "d3-scale";

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
  /** How many y gridlines this frame asks for (d3 treats it as a hint, same as the static genre). */
  yTickHint: number;
  /** How many x ticks `tickStep` derives a round interval from. Picked once, for the whole
   *  continuous width range this genre now ships — see `references/web-discipline.md`,
   *  "Responsive behaviour", for why tick density is not re-derived live as the frame resizes. */
  xTickHint: number;
  /** A regular gridline this close (in canonical SVG units, at `height`) to the reference is
   *  dropped. */
  minGridlineGapPx: number;
};

// ===== CONFIG — edit for your story =====
// Everything between here and the closing marker is this beat's own words and its own editorial
// calls — the next beat replaces every value below. Nothing beneath the marker (the `WebFrame`
// instance aside, which is this genre's own tuned default) is specific to rainfall.
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
// =========================================

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
 * `twin-chart-beat/assets/ChartSeed.tsx` gives: a line carries its value by slope, and anchoring a
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
 *  circle radius this genre draws (`.pt`'s own hit circle, r=5) — so the first/last point's own
 *  circle never sits flush against the `viewBox` edge. An SVG clips to its `viewBox` by default
 *  (no `overflow: visible` is set — adding one would let a point bleed into the neighbouring grid
 *  column instead), so without this inset the end point's own accent dot is silently clipped in
 *  half at any container width, caught only by a screenshot, never by the markup or a unit test —
 *  exactly the class of defect this genre's own gotcha section warns is invisible to anything but
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
 *  single path this genre used to draw into N-1 two-point segments costs nothing visually (round
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
export function wrap(
  text: string,
  maxWidth: number,
  font: { fontSize: number; fontWeight: number },
  measure: Measure,
): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    const trial = line ? `${line} ${word}` : word;
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
        // the same invariant this genre has kept since its first build) while a story can still
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
      <div className="chart-header">
        <h2 className="chart-title">{title}</h2>
        <p className="chart-caveat">{CAVEAT}</p>
      </div>

      {/* The filter — see this file's own doc-comment, item 5. Pure CSS: `render-web.mjs`'s
          `buildCss` dims `.seg`/`.pt` by `data-period` only when a non-"all" radio is `:checked`,
          via `:has()` on the enclosing `.chart-figure`, so this works identically with the inline
          script absent and regardless of how deep inside the `<fieldset>` a given `<input>` sits
          (a plain sibling combinator could not reach past the `<label>` wrapping each one). */}
      <fieldset className="chart-filter">
        <legend>Show</legend>
        {/* One wrapper around the three options — the element the shared stylesheet draws the
            segmented control's own outer track on (`.chart-filter .options`), so the three pills
            read as one control rather than three loose chips, and so the `<legend>` is not inside
            that track. It is a grouping box and nothing else: the control is still three plain
            `<input type="radio" name="period">` in a `<fieldset>` with a `<legend>`, which is what
            makes it a radio group to a screen reader and to the keyboard. */}
        <div className="options">
          <label>
            <input
              id="period-all"
              type="radio"
              name="period"
              value="all"
              defaultChecked
            />
            All years
          </label>
          <label>
            <input id="period-early" type="radio" name="period" value="early" />
            {periodRangeLabel("early", years, FILTER_SPLIT_YEAR)}
          </label>
          <label>
            <input id="period-late" type="radio" name="period" value="late" />
            {periodRangeLabel("late", years, FILTER_SPLIT_YEAR)}
          </label>
        </div>
      </fieldset>

      <div
        className="chart-plot"
        style={{
          ["--y-gutter" as string]: `${yGutterPx}px`,
          ["--x-axis-h" as string]: `${frame.xAxisRowPx}px`,
          aspectRatio: `${totalWidth} / ${totalHeight}`,
        }}
      >
        <div className="y-axis">
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
          // because `img` is the role the ARIA spec makes children-presentational and this genre's
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

          <line
            x1={0}
            x2={frame.width}
            y1={referenceY}
            y2={referenceY}
            stroke={muted}
            strokeWidth={1}
            strokeDasharray="5 4"
            vectorEffect="non-scaling-stroke"
          />

          {segs.map((seg) => (
            <path
              key={`${seg.a.year}-${seg.b.year}`}
              className="seg"
              data-period={seg.period}
              d={`M ${seg.a.x} ${seg.a.y} L ${seg.b.x} ${seg.b.y}`}
              fill="none"
              stroke={accent}
              strokeWidth={2.5}
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {peakPoint && (
            <circle cx={peakPoint.x} cy={peakPoint.y} r={3} fill={muted} />
          )}
          <circle cx={end.x} cy={end.y} r={4} fill={accent} />

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
              data-period={periodOf(p.year, FILTER_SPLIT_YEAR)}
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
            the one box this genre allows, same reasoning as the `#tooltip` it already carries. */}
        <div className="overlay" aria-hidden="true">
          <span
            className="note reference-label"
            style={{
              left: "0%",
              top: `${pct(referenceY, frame.height)}%`,
              color: muted,
            }}
          >
            {REFERENCE_LABEL}
          </span>
          {peakPoint && (
            <span
              className="note peak-label above"
              style={{
                left: `${pct(peakPoint.x, frame.width)}%`,
                top: `${pct(peakPoint.y, frame.height)}%`,
                color: muted,
              }}
            >
              {PEAK_LABEL}
            </span>
          )}
          <span
            className="end-label"
            style={{
              left: `${pct(end.x, frame.width)}%`,
              top: `${pct(end.y, frame.height)}%`,
              color: accent,
            }}
          >
            {endLabel}
          </span>
        </div>

        <div className="x-axis">
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

      <p className="chart-source">{source}</p>
    </figure>
  );
}

/** The genre's own single, continuously-fluid frame — replaces the first build's `DESKTOP_LAYOUT`/
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
// `<text>`, the way this genre's first build drew everything — it is what makes a legible PNG
// possible at all — and it is explicitly NOT what `render-web.mjs` ships to a reader: the actual
// interactive beat never uses this component. One frame, one width, because a static image was
// never two rungs to begin with (`SEED_LAYOUT` in this seed's first build only ever rendered one of
// its two `WebLayout`s for exactly this reason).
type PreviewPad = { top: number; right: number; bottom: number; left: number };

const PREVIEW_WIDTH = 900;

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
  const sourceBaseline = caveatBaseline + (caveatLines.length - 1) * 20 + 22;

  const last = data[data.length - 1];
  const endLabel = `${subject} · ${last.value} ${UNIT}`;
  const plotTop = sourceBaseline + (sourceLines.length - 1) * 19 + 34;
  const plotBottom = plotTop + 340;
  const height = plotBottom + 64;

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
  // data-to-coordinates" this genre's own doc-comment (`chartGeometry`) warns against.
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
          y={sourceBaseline + i * 19}
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
            y={plotBottom + 24}
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
