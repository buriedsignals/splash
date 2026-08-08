/**
 * REPLACE ME. Do not parameterise me.
 *
 * This is not a chart type and it is not a component library. It is the wiring of one interactive
 * chart beat, written out once so the next one can be written from scratch in the same shape. Four
 * things this genre needs that the static genre does not, and this file demonstrates all four:
 *
 *   1. ONE component called twice, once per `WebLayout` (`LAYOUTS` below) — both SSR'd at build
 *      time by a runner shaped like `scripts/render-web.mjs`'s `renderWeb`. No client-side layout
 *      math: a real beat's runner hands both pre-rendered SVGs to the browser and a CSS media
 *      query alone picks between them.
 *   2. `tabIndex={0}` and a per-reading `aria-label`, written on every point at build time — not
 *      assembled by the inline script — so the no-JS frame is still keyboard-reachable, reading by
 *      reading, with the script absent entirely.
 *   3. One invisible `.hit-area` rectangle, shared by mouse and touch: `assets/interaction.mjs`
 *      resolves a pointer or a tap anywhere over the plot to the nearest reading by x, so a phone
 *      reader is never asked to land a tap on a 5px circle.
 *   4. Nothing argument-bearing gated behind interaction. The title, the caveat, the source, the
 *      reference rule and its label, the notable-year marker and its label, and the subject's own
 *      end label are all drawn unconditionally below — hover and focus only ever add the *per-year*
 *      detail the static frame had no room to print, never something a reader needs the argument.
 *
 * A seed is a real beat, not a mechanics demo (`references/web-discipline.md` was written against
 * exactly this file's own first build). This one draws a real claim — rainfall over a sample town
 * fell by a third — with the two editorial devices that claim genuinely needs: a reference rule
 * held at the level the claim is measured from, and a callout on the one year the fall was not a
 * straight line. The story that needs a second series, a crossing, or a different device writes its
 * own component; adding a `variant` prop to this file is the failure this seed exists to prevent.
 *
 * `WebLayout` lives here, not beside a story, because it describes this GENRE's own mechanics (two
 * pre-rendered frame widths, their own tick hints, their own derived height) rather than any one
 * story's numbers. A story's own composition does NOT import it from here, though: unlike
 * `render-still.mjs`/`interaction.mjs`, which a real installed root vendors to `#shared/*`,
 * `WebLayout` is a compile-time-only type with no vendoring path a story could reach — there is
 * nothing to import it FROM outside this dev repository. So a story declares its own matching copy
 * inline (`proof/co2-suisse/EmissionsWeb.tsx` does exactly this), the same "duplicate, do not link"
 * ruling this project already applies elsewhere (Tom's own two geo-prep scripts share zero
 * functions; a type definition is the cheapest thing there is to duplicate).
 *
 * This component itself never imports the rasteriser (`deriveFurniture`/`measureText`), the same
 * invariant `proof/co2-suisse/EmissionsWeb.tsx` keeps: `ink`/`muted`/`grid`/`measure` below are
 * props, derived once in node by whatever runner calls this component
 * (`scripts/render-preview.mjs` for this skill's own preview, a real beat's own runner the same
 * shape `scripts/render-web.mjs`'s `renderWeb` already uses) — never derived inside the component,
 * and never a second implementation of the colour or measurement rule per beat.
 */

import { extent, tickStep } from "d3-array";
import { scaleLinear } from "d3-scale";
import { line } from "d3-shape";

type Reading = { year: number; value: number };
type Padding = { top: number; right: number; bottom: number; left: number };
type Measure = (
  text: string,
  font: { fontSize: number; fontWeight?: number },
) => number;

export type WebLayout = {
  name: "desktop" | "narrow";
  /** The frame's own intrinsic width — the SVG's `viewBox`, not necessarily its rendered CSS
   *  size. A real beat's HTML wrapper scales it fluidly down to this breakpoint's floor. */
  width: number;
  pad: number;
  title: { fontSize: number; fontWeight: number; lead: number };
  /** The caveat line under the title — a full sentence, not a short label, so it is wrapped the
   *  same way the title is, never assumed to fit on one line at the narrow width. */
  subtitle: { fontSize: number; fontWeight: number; lead: number };
  source: { fontSize: number; fontWeight: number; lead: number };
  axis: { fontSize: number };
  label: { fontSize: number; fontWeight: number };
  note: { fontSize: number };
  /** How many y gridlines this layout asks for (d3 treats it as a hint, same as the static genre). */
  yTickHint: number;
  /** How many x ticks `tickStep` derives a round interval from, at this layout's own width. */
  xTickHint: number;
  /** A regular gridline within one label's line height of the reference is dropped, at a gap
   *  tuned to this layout's own type size. */
  minGridlineGapPx: number;
  /** The plot's own floor for usable height, independent of how many lines the header wraps to.
   *  The frame's total height is DERIVED from this plus the header block's real height — never a
   *  fixed constant guessed to be tall enough. */
  plotMinHeight: number;
  bottomPad: number;
};

// ===== CONFIG — edit for your story =====
// Everything between here and the closing marker is this beat's own words and its own two
// editorial calls — the next beat replaces every value below. Nothing beneath the marker (the
// `WebLayout` instances aside, which are this genre's own tuned defaults) is specific to rainfall.
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
 *  merely *a* rebound among several. Muted, not shouted — the same restraint the static genre's own
 *  peak marker keeps (`web-discipline.md`, "What hover reveals"). */
const PEAK_YEAR = 2020;
// Short on purpose: at desktop width, a longer label centred over 2020 (two years from the 2018
// local peak) reached far enough left to overlap the line's own incoming stroke — see this genre's
// own gotcha about looking at the rendered pixels, not just the markup.
const PEAK_LABEL = "the year's biggest rebound";
// =========================================

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

/** Conventional density for this frame: d3 picks the round values inside the fitted range, at a
 *  hint high enough that a reader who scrutinises the frame can put a number on more than the
 *  handful of points a sparser axis would name. */
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

/**
 * Data to coordinates, and nothing else — no colour, no font, no label. That boundary is what
 * keeps this testable, and it is the part worth keeping even after the rest of this file is thrown
 * away for the next beat. Returns the fitted `y` scale itself (not just points on the curve) so the
 * caller can place the reference rule at any value, not only one that happens to be a reading.
 */
export function chartGeometry(
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
  const path =
    line<(typeof points)[number]>()
      .x((p) => p.x)
      .y((p) => p.y)
      .digits(1)(points) ?? "";
  return { plot, points, path, y };
}

/** Wrap on the measured width of the real string, never on a character count — the exact bug
 *  `web-discipline.md` names in its own header note: a sentence-length source line clipped clean
 *  off the narrow layout's right edge the first time this genre's first beat was actually driven. */
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
  layout,
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
  layout: WebLayout;
}) {
  if (data.length < 2)
    throw new Error(
      `a web beat needs at least two readings, got ${data.length}`,
    );

  const { width, pad } = layout;

  // The header is laid out first — title, then the caveat, then the source — because the plot
  // starts where the header stops.
  const titleLines = wrap(title, width - pad * 2, layout.title, measure);
  const titleBaseline = pad + layout.title.fontSize;
  const caveatLines = wrap(CAVEAT, width - pad * 2, layout.subtitle, measure);
  const caveatBaseline =
    titleBaseline +
    (titleLines.length - 1) * layout.title.lead +
    Math.round(layout.title.lead * 0.9);
  const sourceLines = wrap(source, width - pad * 2, layout.source, measure);
  const sourceBaseline =
    caveatBaseline +
    (caveatLines.length - 1) * layout.subtitle.lead +
    Math.round(layout.subtitle.lead * 1.1);

  const last = data[data.length - 1];
  const endLabel = `${subject} · ${last.value} ${UNIT}`;

  // The frame's total height is derived, not guessed: header block (already fixed above) + a floor
  // for the plot's own usable height + the bottom margin — the exact rule that keeps a wrapped
  // title from silently clipping the plot below it once the frame is narrow.
  const plotTop =
    sourceBaseline +
    (sourceLines.length - 1) * layout.source.lead +
    Math.round(layout.title.lead);
  const plotBottom = plotTop + layout.plotMinHeight;
  const height = plotBottom + layout.bottomPad;

  const referenceValue =
    data.find((d) => d.year === REFERENCE_YEAR)?.value ?? data[0].value;

  // A provisional scale, built at the same domain/range the final one will use (the header block
  // above already fixed `plotTop`/`plotBottom`), so the reference's own y position is known BEFORE
  // the tick set is finalised — the only way to drop a regular gridline that would otherwise sit a
  // few pixels from the dashed reference rule and read as visual noise, the same rule
  // `proof/co2-suisse/EmissionsWeb.tsx` applies to its own reference line.
  const gridScale = yScale(data).range([plotBottom, plotTop]);
  const referenceYProvisional = gridScale(referenceValue);
  const regularTicks = gridScale
    .ticks(layout.yTickHint)
    .filter(
      (v) =>
        Math.abs(gridScale(v) - referenceYProvisional) >=
        layout.minGridlineGapPx,
    );
  const tickValues = [...regularTicks, referenceValue].sort((a, b) => a - b);
  const topValue = Math.max(...tickValues);
  const tickLabels = tickValues.map((v) =>
    v === topValue ? `${v} ${UNIT}` : `${v}`,
  );

  // Both gutters are measured from the widest string that will actually be drawn in them.
  const padding: Padding = {
    top: plotTop,
    right: pad + 12 + measure(endLabel, layout.label),
    bottom: layout.bottomPad,
    left:
      pad + 10 + Math.max(...tickLabels.map((l) => measure(l, layout.axis))),
  };

  const { plot, points, path, y } = chartGeometry(data, {
    width,
    height,
    padding,
  });

  const referenceY = y(referenceValue);
  const peakPoint = points.find((p) => p.year === PEAK_YEAR);
  const end = points[points.length - 1];

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="chart"
      data-layout={layout.name}
      fontFamily="Helvetica, Arial, sans-serif"
    >
      {/* No root role="img" — this genre's one deliberate departure from the static genre's
          accessibility pattern (`web-discipline.md`): that role would flatten every child into one
          opaque image, silencing the per-point circles below. `<desc>` still carries the alt text. */}
      <desc>{alt}</desc>
      <rect x={0} y={0} width={width} height={height} fill={ground} />

      {titleLines.map((line, i) => (
        <text
          key={line}
          x={pad}
          y={titleBaseline + i * layout.title.lead}
          fill={ink}
          fontSize={layout.title.fontSize}
          fontWeight={layout.title.fontWeight}
        >
          {line}
        </text>
      ))}
      {caveatLines.map((line, i) => (
        <text
          key={line}
          x={pad}
          y={caveatBaseline + i * layout.subtitle.lead}
          fill={muted}
          fontSize={layout.subtitle.fontSize}
        >
          {line}
        </text>
      ))}
      {sourceLines.map((line, i) => (
        <text
          key={line}
          x={pad}
          y={sourceBaseline + i * layout.source.lead}
          fill={muted}
          fontSize={layout.source.fontSize}
        >
          {line}
        </text>
      ))}

      {tickValues.map((value, i) => (
        <g key={value}>
          {/* The reference's own row gets no regular gridline — the dashed reference rule below
              already marks this height, and a second, plain line here (or one sitting a few
              pixels off it, before the `minGridlineGapPx` filter above dropped it) would read as
              clutter next to the rule it duplicates. The row still gets its own axis label. */}
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
            fontSize={layout.axis.fontSize}
            textAnchor="end"
          >
            {tickLabels[i]}
          </text>
        </g>
      ))}
      {xTickValues(
        data.map((d) => d.year),
        layout.xTickHint,
      ).map((year) => {
        const p = points.find((pt) => pt.year === year);
        if (!p) return null;
        return (
          <text
            key={year}
            x={p.x}
            y={plot.bottom + 24}
            fill={muted}
            fontSize={layout.axis.fontSize}
            textAnchor="middle"
          >
            {year}
          </text>
        );
      })}

      {/* The reference: a dashed rule, because it is a level this beat chose to measure the claim
          against, not a measurement itself. Unconditional — see this file's own doc-comment, item 4. */}
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
        fontSize={layout.note.fontSize}
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

      {/* The notable year is context, not the subject: muted, marked, and silent about its own
          exact value in the printed label — hover or focus on this year's own point below still
          answers the exact figure if asked, same rule `web-discipline.md` gives the static genre's
          peak marker. */}
      {peakPoint && (
        <>
          <circle cx={peakPoint.x} cy={peakPoint.y} r={3} fill={muted} />
          <text
            x={peakPoint.x}
            y={peakPoint.y - 10}
            fill={muted}
            fontSize={layout.note.fontSize}
            textAnchor="middle"
          >
            {PEAK_LABEL}
          </text>
        </>
      )}

      <circle cx={end.x} cy={end.y} r={4} fill={accent} />
      <text
        x={plot.right + 10}
        y={end.y + 5}
        fill={accent}
        fontSize={layout.label.fontSize}
        fontWeight={layout.label.fontWeight}
      >
        {endLabel}
      </text>

      {/* Interaction layer — items 2 and 3 of this file's own doc-comment. Every reading is
          `tabIndex={0}` with its own `aria-label`/`data-detail` baked in at build time, invisible at
          rest (`fill="transparent"`; only CSS toggles it to `muted` on hover/focus, never inlined
          per-point). One shared `.hit-area` rectangle resolves a pointer or a tap anywhere over the
          plot to the nearest reading by x. `assets/interaction.mjs` (this skill's own, unchanged by
          a new beat) is what wires `.pt`/`.hit-area` to hover, tap and keyboard once
          `scripts/render-web.mjs`'s `renderWeb` inlines this markup into one self-contained HTML
          file — this component never reaches for that script itself. */}
      {points.map((p) => (
        <circle
          key={p.year}
          className="pt"
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
        x={plot.left}
        y={plot.top}
        width={plot.right - plot.left}
        height={plot.bottom - plot.top}
        fill="transparent"
        pointerEvents="all"
      />
    </svg>
  );
}

/** The two rungs, in render order — what a real beat's own runner hands to
 *  `scripts/render-web.mjs`'s generic `renderWeb`, which never imports these by name (that would be
 *  the skill reaching back into a story's own numbers). This seed exports them so item 1 of its own
 *  doc-comment is not just asserted but demonstrated — a second beat supplies its own array of the
 *  same shape. */
export const DESKTOP_LAYOUT: WebLayout = {
  name: "desktop",
  width: 900,
  pad: 40,
  title: { fontSize: 26, fontWeight: 700, lead: 34 },
  subtitle: { fontSize: 14, fontWeight: 400, lead: 20 },
  source: { fontSize: 14, fontWeight: 400, lead: 19 },
  axis: { fontSize: 13 },
  label: { fontSize: 15, fontWeight: 600 },
  note: { fontSize: 13 },
  yTickHint: 5,
  xTickHint: 6,
  minGridlineGapPx: 20,
  plotMinHeight: 340,
  bottomPad: 64,
};

export const NARROW_LAYOUT: WebLayout = {
  name: "narrow",
  width: 360,
  pad: 20,
  title: { fontSize: 18, fontWeight: 700, lead: 24 },
  subtitle: { fontSize: 12, fontWeight: 400, lead: 17 },
  source: { fontSize: 12, fontWeight: 400, lead: 16 },
  axis: { fontSize: 11 },
  label: { fontSize: 13, fontWeight: 600 },
  note: { fontSize: 11 },
  yTickHint: 4,
  xTickHint: 3,
  minGridlineGapPx: 16,
  plotMinHeight: 220,
  bottomPad: 44,
};

export const LAYOUTS: WebLayout[] = [DESKTOP_LAYOUT, NARROW_LAYOUT];

/** The single layout `scripts/render-preview.mjs` renders — this skill's own static PNG preview is
 *  not a second, continuously-responsive frame, the same way a real beat's runner only ever needs
 *  ONE of `LAYOUTS` to produce a still. The two responsive rungs a real beat SHIPS are the beat's
 *  own numbers, not this seed's — see the skill's `SKILL.md`, "Why `render-web.mjs` does not import
 *  a story's layouts." */
export const SEED_LAYOUT: WebLayout = DESKTOP_LAYOUT;
