/**
 * REPLACE ME. Do not parameterise me.
 *
 * This is not a chart type and it is not a scrollytelling framework. It is the wiring of one
 * scroll-driven beat, written out once so the next one can be written from scratch in the same
 * shape. A scrolly is a VEHICLE, not a fourth genre of chart: this file carries the beat genre's
 * own pure geometry (`chartPoints`/`tracePath`, the same "data to coordinates, nothing else" split
 * `twin-chart-beat/assets/ChartSeed.tsx` and `twin-chart-web/assets/ChartWebSeed.tsx` already keep
 * — carried again here, as its own copy, rather than imported, because nothing under a skill may
 * import out of the skill), plus one thing neither of those genres has: a reveal that advances as
 * the reader scrolls, driven by which of several narrative STEPS currently has the reader's
 * attention.
 *
 * Three things this genre needs that neither the static nor the web genre does, and this file
 * demonstrates all three:
 *
 *   1. ONE component called once PER STEP (`STEPS` below), each call producing a complete,
 *      self-contained SVG frame of the SAME chart at a different point in its own reveal — never a
 *      single frame mutated live by the browser. All of them are SSR'd at build time by a runner
 *      shaped like `scripts/render-scrolly.mjs`'s `renderScrolly`, the same "N React elements,
 *      rendered once each in node" discipline `render-web.mjs` already set for its two layouts.
 *   2. Every step's own PROSE is plain server-rendered text, in ordinary document flow, gated by
 *      nothing — not a class, not a script, not scroll position. A reader with JavaScript off, or
 *      a screen reader user tabbing straight through the page, reaches every step's own words
 *      exactly the way a sighted reader who scrolls does. Only the GRAPHIC steps; the argument
 *      never does.
 *   3. Exactly one frame is marked `active` in the SSR'd markup itself (`STEPS[0]`, wired by the
 *      `active` prop below) — not assigned by the inline script after the page loads. That is what
 *      makes "JavaScript disabled" a real, provable state rather than a blank graphic waiting for a
 *      script that never runs: `scripts/render-scrolly.mjs`'s own CSS shows the `.active` frame and
 *      nothing else by default; `assets/interaction.mjs` only ever MOVES which frame carries that
 *      class as the reader scrolls, exactly the way `twin-chart-web`'s interaction script only ever
 *      moves a `.pt-active` class, never invents a state that has to exist before it runs.
 *
 * A seed is a real beat, not a mechanics demo (`references/scrolly-discipline.md` was written
 * against exactly this file's own first build). This one draws a real claim — flow through a
 * sample basin fell by more than a third — with the one editorial device a scroll reveal genuinely
 * earns: a rebound that reads as a genuine surprise only because the reader has already seen the
 * decline that came before it, not because the number is being withheld. The overall claim itself
 * is never withheld — see this file's own `SKILL.md`, "Architecture", on why the title and source
 * sit in the HTML `<header>` this genre's runner builds, unconditional and outside every step's own
 * reveal, the same "the argument is never gated behind interaction" rule
 * `twin-chart-web/references/web-discipline.md` states for hover.
 *
 * This component itself never imports the rasteriser (`deriveFurniture`/`measureText`), the same
 * invariant the other two genres' seeds keep: `ink`/`muted`/`grid`/`measure` below are props,
 * derived once in node by whatever runner calls this component (`scripts/render-preview.mjs` for
 * this skill's own preview, `scripts/render-scrolly.mjs`'s `renderScrolly` for a real beat) — never
 * derived inside the component, and never a second implementation of the colour or measurement
 * rule per beat.
 */

import { extent } from "d3-array";
import { scaleLinear } from "d3-scale";
import { line } from "d3-shape";

type Reading = { year: number; value: number };
type Padding = { top: number; right: number; bottom: number; left: number };
type Measure = (
  text: string,
  font: { fontSize: number; fontWeight?: number },
) => number;

export type ScrollyStep = {
  /** Also this step's `data-step` attribute on both its `<section>` and its `<svg>` frame — the
   *  one string `assets/interaction.mjs` uses to keep the two in sync as the reader scrolls. */
  id: string;
  /** The last year this step's traced line reaches. Reveal only ever moves forward: a later step
   *  never has a SMALLER `revealThrough` than an earlier one — see `scripts/render-scrolly.mjs`'s
   *  own runner, which asserts `STEPS` is sorted this way before rendering a single frame. */
  revealThrough: number;
  /** Whether the muted rebound-year marker is drawn. Only true from the step whose own
   *  `revealThrough` already reaches that year onward — a marker for a year not yet traced would
   *  float over nothing. */
  showPeak: boolean;
  /** Whether the accent end-dot and its value label are drawn — true only on the step that reaches
   *  the series' actual last reading, never earlier. */
  showEnd: boolean;
  /** This step's own words. One or more paragraphs, rendered as plain `<p>` text in ordinary
   *  document flow — never gated behind the graphic, a class, or the inline script. See this
   *  file's own doc-comment, item 2. */
  prose: string[];
};

// ===== CONFIG — edit for your story =====
// Everything between here and the closing marker is this beat's own words and its own editorial
// calls — the next beat replaces every value below. `FRAME` aside (this genre's own tuned frame
// size, not a story's number), nothing beneath the marker is specific to the sample basin.
const UNIT = "mm";
/** The level every step's reference rule holds the reader's eye against — this beat's own
 *  editorial choice, the same kind of judgment call `web-discipline.md`'s own `REFERENCE_YEAR`
 *  documents: the title's claim ("fell by more than a third") is measured against exactly this
 *  year, not a multi-year average a script could have picked instead. */
const REFERENCE_YEAR = 2016;
const REFERENCE_LABEL = "2016 level";
/** The one year worth naming even though the reveal and the end label already carry the argument.
 *  The series has exactly one rebound (2020 → 2021, +118) inside a run that otherwise falls every
 *  year — picked because it is the single year that breaks the pattern, not merely a wobble. */
const PEAK_YEAR = 2021;
const PEAK_LABEL = "the year's biggest rebound";

/** The four narrative steps this beat carries, sorted by `revealThrough` — a scrolly's entire
 *  narrative arc lives in this one array. A different beat writes its own steps, of any count
 *  greater than one; nothing about `ScrollyChartSeed` or `renderScrolly` assumes exactly four. */
export const STEPS: ScrollyStep[] = [
  {
    id: "start",
    revealThrough: 2016,
    showPeak: false,
    showEnd: false,
    prose: [
      "In 2016, the gauge at the sample basin recorded 940 mm of flow for the year — the level every later year in this story is measured against.",
    ],
  },
  {
    id: "fall",
    revealThrough: 2020,
    showPeak: false,
    showEnd: false,
    prose: [
      "Flow fell every year after that, four years in a row, down to 705 mm by 2020.",
    ],
  },
  {
    id: "rebound",
    revealThrough: 2022,
    showPeak: true,
    showEnd: false,
    prose: [
      "2021 broke the run: flow jumped back up to 823 mm, the single biggest year-over-year rise in the whole series — then fell again the very next year.",
    ],
  },
  {
    id: "end",
    revealThrough: 2024,
    showPeak: true,
    showEnd: true,
    prose: [
      "By 2024, flow had fallen to 615 mm — down 34.6% from the 2016 level, rebound included.",
    ],
  },
];
// =========================================

/** This genre's own frame size — tuned for the sticky column `scripts/render-scrolly.mjs`'s CSS
 *  builds around it, not a story's number. A story that needs a different aspect ratio changes
 *  this constant and the runner's own `max-width`/`aspect-ratio` CSS together; the two are meant
 *  to move as a pair, the same way `WebLayout`'s `width` and `render-web.mjs`'s breakpoint do. */
export const FRAME = { width: 640, height: 380 };
const PAD = 24;
/** Room above the plot for the rebound marker's own label, which sits ABOVE its point. */
const TOP_PAD = 36;
/** Room below the plot for the first/last-year axis labels. */
const BOTTOM_PAD = 56;
const AXIS_FONT = { fontSize: 13 };
const LABEL_FONT = { fontSize: 15, fontWeight: 600 };
const NOTE_FONT = { fontSize: 13 };
/** A domain-end tick within one label's line height of the reference row is dropped rather than
 *  drawn — see the "provisional scale" comment below for the collision this prevents. */
const MIN_TICK_GAP_PX = 16;

/**
 * The fitted vertical scale — fitted to the readings, not anchored at zero, for the same reason
 * `twin-chart-beat/assets/ChartSeed.tsx` and `twin-chart-web/assets/ChartWebSeed.tsx` both give: a
 * line carries its value by slope, and anchoring a 615–940 mm series at a 0–1000 axis would
 * flatten the very fall this beat is about.
 */
function yScale(data: Reading[]) {
  return scaleLinear()
    .domain(extent(data.map((d) => d.value)) as [number, number])
    .nice();
}

/** The fitted scale's own two ends — this genre draws only the top and bottom gridline plus the
 *  reference rule, never a dense tick ladder: four short steps do not need one. */
export function yTickValues(data: Reading[]): number[] {
  const domain = yScale(data).domain();
  return [domain[0], domain[1]];
}

/**
 * Data to pixel coordinates, computed once over the FULL series and a FIXED domain — every step
 * calls this with the same `data`, so the axis never rescales as the reveal advances. Only
 * `tracePath` below decides how much of the result a given step actually draws. That split is the
 * one property this genre cannot lose: a rescaling axis would make each step's line look like a
 * DIFFERENT chart rather than the same chart at an earlier moment.
 */
export function chartPoints(
  data: Reading[],
  {
    width,
    height,
    padding,
  }: { width: number; height: number; padding: Padding },
) {
  const plot = {
    left: padding.left,
    top: padding.top,
    right: width - padding.right,
    bottom: height - padding.bottom,
  };
  const years = data.map((d) => d.year);
  const x = scaleLinear()
    .domain([Math.min(...years), Math.max(...years)])
    .range([plot.left, plot.right]);
  const y = yScale(data).range([plot.bottom, plot.top]);
  const points = data.map((d) => ({
    year: d.year,
    value: d.value,
    x: x(d.year),
    y: y(d.value),
  }));
  return { plot, points, y };
}

/**
 * The traced path for ONE step: every point up to and including `throughYear`, drawn from the same
 * fixed-domain points `chartPoints` computed — never a second, step-local scale. Returns `""` when
 * nothing is revealed yet, which the component below treats as "no `<path>` element", not a path
 * with an empty `d`.
 */
export function tracePath(
  points: { year: number; x: number; y: number }[],
  throughYear: number,
): string {
  const visible = points.filter((p) => p.year <= throughYear);
  if (visible.length === 0) return "";
  return (
    line<(typeof visible)[number]>()
      .x((p) => p.x)
      .y((p) => p.y)
      .digits(1)(visible) ?? ""
  );
}

export function ScrollyChartSeed({
  data,
  step,
  active,
  subject,
  ground,
  accent,
  ink,
  muted,
  grid,
  measure,
}: {
  data: Reading[];
  step: ScrollyStep;
  /** True for exactly one step per render — see this file's own doc-comment, item 3. Baked into
   *  the `active` class at SSR time; `assets/interaction.mjs` only ever MOVES this class after the
   *  page loads, it never sets it for the first time. */
  active: boolean;
  subject: string;
  ground: string;
  accent: string;
  /** Derived from `ground` by `deriveFurniture` in whatever node runner calls this component — see
   *  this file's own doc-comment. Never derived in here. */
  ink: string;
  muted: string;
  grid: string;
  measure: Measure;
}) {
  if (data.length < 2)
    throw new Error(
      `a scrolly beat needs at least two readings, got ${data.length}`,
    );

  const { width, height } = FRAME;
  const referenceValue =
    data.find((d) => d.year === REFERENCE_YEAR)?.value ?? data[0].value;
  const last = data[data.length - 1];
  const endLabel = `${subject} · ${last.value} ${UNIT}`;

  // A provisional scale, built at the same domain/range the final one will use (`plot.top`/
  // `plot.bottom` are fixed by TOP_PAD/BOTTOM_PAD alone, never by the measured gutters below), so
  // a domain-end tick's own pixel row is known BEFORE the tick set is finalised — the only way to
  // drop a domain tick that would otherwise sit a few pixels from the reference row and read as
  // two overlapping labels. First caught on this seed's own sample data: the fitted domain's own
  // top end (950) niced to within 10 units of the 2016 reference (940) — under 9px apart at this
  // frame's height — and the two axis labels visibly collided in the rendered preview until this
  // filter existed. The same rule `twin-chart-web/assets/ChartWebSeed.tsx` applies to its own
  // regular gridlines near its reference rule.
  const gridScale = yScale(data).range([height - BOTTOM_PAD, TOP_PAD]);
  const referenceYProvisional = gridScale(referenceValue);
  const domainTicks = yTickValues(data).filter(
    (v) =>
      v === referenceValue ||
      Math.abs(gridScale(v) - referenceYProvisional) >= MIN_TICK_GAP_PX,
  );
  const yTicks = [...new Set([...domainTicks, referenceValue])].sort(
    (a, b) => a - b,
  );
  const tickLabels = yTicks.map((v) => `${v} ${UNIT}`);

  // Both gutters are measured from the widest string that will actually be drawn in them — the
  // right gutter only widens for the step that actually draws the end label.
  const padding: Padding = {
    top: TOP_PAD,
    right: step.showEnd ? PAD + 12 + measure(endLabel, LABEL_FONT) : PAD,
    bottom: BOTTOM_PAD,
    left: PAD + 10 + Math.max(...tickLabels.map((l) => measure(l, AXIS_FONT))),
  };

  const { plot, points, y } = chartPoints(data, { width, height, padding });
  const path = tracePath(points, step.revealThrough);
  const referenceY = y(referenceValue);
  const peakPoint = points.find((p) => p.year === PEAK_YEAR);
  // The leading edge of what THIS step has revealed — always accent, always the subject's own
  // current reading, whether or not it is also the series' final one.
  const leadingPoint = [...points]
    .reverse()
    .find((p) => p.year <= step.revealThrough);

  const firstYear = Math.min(...data.map((d) => d.year));
  const lastYear = Math.max(...data.map((d) => d.year));
  const finalPoint = points.find((p) => p.year === lastYear);

  const revealedValue =
    points.find((p) => p.year === step.revealThrough)?.value ?? last.value;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={active ? "step-frame active" : "step-frame"}
      data-step={step.id}
      // Decorative, on purpose: the argument this beat makes is carried in full by the HTML
      // `<header>` (unconditional title + source, built by `scripts/render-scrolly.mjs`) and by
      // every step's own prose, both plain accessible text regardless of which frame is on
      // screen. A screen reader exposing only the CURRENTLY VISIBLE frame's own `<desc>` — the
      // other frames sit at `display` unaffected but `opacity:0`, still technically present — one
      // moment and a different one the next, tied to a scroll position no navigation command
      // reaches, would be a worse reading than no reading at all. See `references/
      // scrolly-discipline.md`, "What the graphic is allowed to be silent about."
      aria-hidden="true"
    >
      <desc>{`${subject}: through ${step.revealThrough}, ${revealedValue} ${UNIT}.`}</desc>
      <rect x={0} y={0} width={width} height={height} fill={ground} />

      {yTicks.map((value) => (
        <g key={value}>
          {value === referenceValue ? null : (
            <line
              x1={plot.left}
              x2={plot.right}
              y1={y(value)}
              y2={y(value)}
              stroke={grid}
              strokeWidth={1}
            />
          )}
          <text
            x={plot.left - 10}
            y={y(value) + 4}
            fill={muted}
            fontSize={AXIS_FONT.fontSize}
            textAnchor="end"
          >
            {value} {UNIT}
          </text>
        </g>
      ))}

      <text
        x={plot.left}
        y={plot.bottom + 24}
        fill={muted}
        fontSize={AXIS_FONT.fontSize}
      >
        {firstYear}
      </text>
      <text
        x={plot.right}
        y={plot.bottom + 24}
        fill={muted}
        fontSize={AXIS_FONT.fontSize}
        textAnchor="end"
      >
        {lastYear}
      </text>

      {/* The reference: a dashed rule at the level this beat measures the claim against —
          unconditional, every step, the same "what must not become interactive" rule
          `web-discipline.md` states for its own reference rule. */}
      <line
        x1={plot.left}
        x2={plot.right}
        y1={referenceY}
        y2={referenceY}
        stroke={muted}
        strokeWidth={1}
        strokeDasharray="5 4"
      />
      <text
        x={plot.left + 4}
        y={referenceY - 8}
        fill={muted}
        fontSize={NOTE_FONT.fontSize}
      >
        {REFERENCE_LABEL}
      </text>

      {path && (
        <path
          d={path}
          fill="none"
          stroke={accent}
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      )}

      {step.showPeak && peakPoint && (
        <>
          <circle cx={peakPoint.x} cy={peakPoint.y} r={3} fill={muted} />
          <text
            x={peakPoint.x}
            y={peakPoint.y - 10}
            fill={muted}
            fontSize={NOTE_FONT.fontSize}
            textAnchor="middle"
          >
            {PEAK_LABEL}
          </text>
        </>
      )}

      {leadingPoint && (
        <circle cx={leadingPoint.x} cy={leadingPoint.y} r={4} fill={accent} />
      )}

      {step.showEnd && finalPoint && (
        <text
          x={plot.right + 10}
          y={finalPoint.y + 5}
          fill={accent}
          fontSize={LABEL_FONT.fontSize}
          fontWeight={LABEL_FONT.fontWeight}
        >
          {endLabel}
        </text>
      )}
    </svg>
  );
}
