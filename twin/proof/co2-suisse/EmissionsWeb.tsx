/**
 * The web beat of "CO₂ suisse, retour au niveau de 1967" — the interactive genre.
 *
 * Not a second chart: the coordinates and the number formatting come from
 * `./crossing-geometry.ts`, the same pure core the static beat (`EmissionsLine.tsx`, this same
 * directory) and the video beat (`twin-chart-video/assets/EmissionsVideo.tsx`) already share. What
 * this file adds is the one thing neither of those genres has — a reader who can ask the chart a
 * question and get an answer back, without anything the static frame already states being gated
 * behind that ask. Read `twin-chart-web/references/web-discipline.md` for the rules this file is
 * written under before changing it.
 *
 * Two layouts, not a continuous reflow (`web-discipline.md`, "Responsive behaviour"): each is its
 * own call to this component, SSR'd once at build time by the `twin-chart-web` skill's
 * `scripts/render-web.mjs` — exactly the way the static beat SSRs its one frame. The HTML wrapper
 * switches between the two pre-rendered SVGs with a CSS media query; there is no client-side layout
 * math, because both frames were already computed server-side, from the same geometry, the same
 * way the static beat's frame is.
 *
 * `deriveFurniture` and `measureText` are not called here. They live in
 * `twin-chart-beat/scripts/render-still.mjs`, beside a native rasteriser
 * (`EmissionsVideo.tsx`'s own doc-comment explains why that module cannot be imported from a file
 * meant to run anywhere but node) — `render-web.mjs` derives the furniture and measures every
 * gutter in node, exactly like the still and video render scripts do, and passes the results in as
 * props. `measure` below is that function, threaded in rather than imported. This file supplies
 * its own two `WebLayout` instances (`DESKTOP_LAYOUT`, `NARROW_LAYOUT`) and hands them to
 * `render-web.mjs`'s generic `renderWeb` — the skill's renderer does not import a story's layouts,
 * it only knows how to SSR whatever layouts it is given.
 */

import { line } from "d3-shape";
import { scaleLinear } from "d3-scale";
import { tickStep } from "d3-array";
import {
  crossingGeometry,
  fr,
  yTickValues,
  type Reading,
} from "./crossing-geometry";

const UNIT = "Mt";

// `WebLayout` describes the web genre's own mechanics and is also defined, verbatim in shape, in
// the skill's own seed (`twin-chart-web/assets/ChartWebSeed.tsx`) — this file DECLARES ITS OWN copy
// rather than importing that one. A relative import reaching from a story, across the skill
// boundary, into a specific skill's `assets/` path hard-codes this dev repository's own layout
// (a story sitting exactly two directories below the same root as `skills/`), which a real Splash
// root does not guarantee, and unlike `render-still.mjs`/`interaction.mjs` there is no `#shared/*`
// vendoring path for a compile-time-only type to travel by. Duplicate, do not link — the same
// ruling this project already applies to Tom's own two geo-prep scripts, which share zero
// functions between them.
export type WebLayout = {
  name: "desktop" | "narrow";
  /** The frame's own intrinsic width — the SVG's `viewBox`, not necessarily its rendered CSS
   *  size. `render-web.mjs`'s HTML wrapper scales it fluidly down to this breakpoint's floor. */
  width: number;
  pad: number;
  title: { fontSize: number; fontWeight: number; lead: number };
  subtitle: { fontSize: number; fontWeight: number; lead: number };
  /** Wrapped the same way the title and the limits subtitle are — the source line is a full
   *  sentence, not a short label, and the narrow layout's first render clipped it clean off the
   *  right edge of the frame (`web-discipline.md`'s own "Verification" section: this was caught by
   *  driving a real browser at 360px, not by reading the markup). */
  source: { fontSize: number; fontWeight: number; lead: number };
  axis: { fontSize: number };
  label: { fontSize: number; fontWeight: number };
  note: { fontSize: number };
  /** How many y gridlines this layout asks for (d3 treats it as a hint, same as the static genre). */
  yTickHint: number;
  /** How many x ticks `tickStep` derives a round interval from, at this layout's own width. */
  xTickHint: number;
  /** A regular gridline within one label's line height of the reference is dropped, same rule as
   *  the static genre, at a gap tuned to this layout's own type size. */
  minGridlineGapPx: number;
  /** The plot's own floor for usable height, independent of how many lines the header wraps to.
   *  The frame's total height is DERIVED from this plus the header block's real height — never a
   *  fixed constant guessed to be tall enough, because a fixed guess is exactly the kind of number
   *  that clips a title once a layout is narrow enough to wrap it to three lines instead of one. */
  plotMinHeight: number;
  bottomPad: number;
};

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

/** The two rungs, in render order — what this beat hands to the skill's generic `renderWeb`, which
 *  never imports `DESKTOP_LAYOUT`/`NARROW_LAYOUT` by name (that would be the skill reaching back
 *  into a story's own numbers). A second beat supplies its own array of the same shape. */
export const LAYOUTS: WebLayout[] = [DESKTOP_LAYOUT, NARROW_LAYOUT];

type Measure = (
  text: string,
  font: { fontSize: number; fontWeight?: number },
) => number;

function wrap(
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

export function EmissionsWeb({
  data,
  title,
  source,
  alt,
  limits,
  ground,
  accent,
  ink,
  muted,
  grid,
  reference,
  referenceLabel,
  peakLabel,
  layout,
  measure,
}: {
  data: Reading[];
  title: string;
  source: string;
  alt: string;
  /** The one caveat this data needs stated before its claim is read — territorial scope, not
   *  incidental. See `information-architecture.md`'s "Subtitle" zone. */
  limits: string;
  ground: string;
  accent: string;
  ink: string;
  muted: string;
  grid: string;
  reference: number;
  referenceLabel: string;
  peakLabel: string;
  layout: WebLayout;
  measure: Measure;
}) {
  if (data.length < 2)
    throw new Error(
      "a crossing beat needs at least two readings, got " + data.length,
    );

  const { width, pad } = layout;

  const titleLines = wrap(title, width - pad * 2, layout.title, measure);
  const titleBaseline = pad + layout.title.fontSize;
  const limitsLines = wrap(limits, width - pad * 2, layout.subtitle, measure);
  const limitsBaseline =
    titleBaseline +
    (titleLines.length - 1) * layout.title.lead +
    Math.round(layout.title.lead * 0.9);
  const sourceBaseline =
    limitsBaseline +
    (limitsLines.length - 1) * layout.subtitle.lead +
    Math.round(layout.subtitle.lead * 1.1);
  // Wrapped the same as the title and the limits subtitle — a full sentence, not a short label, and
  // the narrow layout has no room for it on one line. See the layout type's own doc-comment on
  // `source` for how this was caught.
  const sourceLines = wrap(source, width - pad * 2, layout.source, measure);

  const last = data[data.length - 1];
  const endLabel = `${last.year} · ${fr(last.mt)} ${UNIT}`;

  const [floor, , ceiling] = yTickValues(data, reference);
  const plotTop =
    sourceBaseline +
    (sourceLines.length - 1) * layout.source.lead +
    Math.round(layout.title.lead);
  // The frame's total height is derived, not guessed: header block (already fixed above) + a
  // floor for the plot's own usable height + the bottom margin. A hand-picked total height is
  // exactly the number that clips a wrapped title once a layout is narrow — see the type's doc.
  const plotBottom = plotTop + layout.plotMinHeight;
  const height = plotBottom + layout.bottomPad;

  const gridScale = scaleLinear()
    .domain([floor, ceiling])
    .range([plotBottom, plotTop]);
  const referenceYProvisional = gridScale(reference);
  const regularTicks = gridScale
    .ticks(layout.yTickHint)
    .filter(
      (v) =>
        Math.abs(gridScale(v) - referenceYProvisional) >=
        layout.minGridlineGapPx,
    );
  const yTicks = [...regularTicks, reference].sort((a, b) => a - b);
  const topValue = Math.max(...yTicks);
  const tickLabels = yTicks.map((v) =>
    v === topValue ? `${fr(v, 0)} ${UNIT}` : fr(v, v === reference ? 1 : 0),
  );

  const padding = {
    top: plotTop,
    right: pad + 12 + measure(endLabel, layout.label),
    bottom: layout.bottomPad,
    left:
      pad + 10 + Math.max(...tickLabels.map((l) => measure(l, layout.axis))),
  };

  const g = crossingGeometry(data, { width, height, padding, reference });
  const path = line<(typeof g.points)[number]>()
    .x((p) => p.x)
    .y((p) => p.y)
    .digits(1)(g.points)!;

  const years = data.map((d) => d.year);
  const firstYear = Math.min(...years);
  const lastYear = Math.max(...years);
  const xStep = tickStep(firstYear, lastYear, layout.xTickHint);
  const xTicks: number[] = [];
  for (
    let year = Math.ceil(firstYear / xStep) * xStep;
    year <= lastYear;
    year += xStep
  ) {
    xTicks.push(year);
  }
  const ticksX = xTicks
    .map((year) => ({ year, point: g.points.find((p) => p.year === year) }))
    .filter(
      (t): t is { year: number; point: (typeof g.points)[number] } =>
        t.point !== undefined,
    )
    .map(({ year, point }) => ({ year, x: point.x }));

  const referenceBaseline = g.referenceY - 8;

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
      {/* Deliberately no `role="img"` on the root here (unlike the static genre): that role
          flattens every descendant into one opaque image for assistive tech, which is correct for
          a static beat and wrong for this one — the per-point circles below need to stay
          individually reachable and individually named. `<desc>` still carries the alt text; it is
          picked up as the SVG's accessible description without `role="img"` swallowing the
          children (`web-discipline.md`, "Keyboard and touch"). */}
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
      {limitsLines.map((line, i) => (
        <text
          key={line}
          x={pad}
          y={limitsBaseline + i * layout.subtitle.lead}
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

      {yTicks.map((value, i) => (
        <g key={value}>
          {value === reference ? null : (
            <line
              x1={g.plot.left}
              x2={g.plot.right}
              y1={gridScale(value)}
              y2={gridScale(value)}
              stroke={grid}
              strokeWidth={1}
            />
          )}
          <text
            x={g.plot.left - 10}
            y={gridScale(value) + 4}
            fill={muted}
            fontSize={layout.axis.fontSize}
            textAnchor="end"
          >
            {tickLabels[i]}
          </text>
        </g>
      ))}
      {ticksX.map((tick) => (
        <text
          key={tick.year}
          x={tick.x}
          y={g.plot.bottom + 24}
          fill={muted}
          fontSize={layout.axis.fontSize}
          textAnchor="middle"
        >
          {tick.year}
        </text>
      ))}

      {/* The reference: a dashed rule, because it is a level somebody chose, not a measurement.
          Never gated behind interaction — see `web-discipline.md`, "What must not become
          interactive". */}
      <line
        x1={g.plot.left}
        x2={g.plot.right}
        y1={g.referenceY}
        y2={g.referenceY}
        stroke={muted}
        strokeWidth={1}
        strokeDasharray="5 4"
      />
      <text
        x={g.plot.left + 4}
        y={referenceBaseline}
        fill={muted}
        fontSize={layout.note.fontSize}
      >
        {referenceLabel}
      </text>

      <path
        d={path}
        fill="none"
        stroke={accent}
        strokeWidth={2.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* The peak is context, not the subject: muted, marked, and silent about its own value —
          identical to the static beat. Hover/focus on this year's own point below still answers
          the exact figure if asked (`web-discipline.md` explains why that is not the same failure
          as printing it unconditionally). */}
      <circle cx={g.peak.x} cy={g.peak.y} r={3} fill={muted} />
      <text
        x={g.peak.x}
        y={g.peak.y - 10}
        fill={muted}
        fontSize={layout.note.fontSize}
        textAnchor="middle"
      >
        {peakLabel}
      </text>

      <circle cx={g.end.x} cy={g.end.y} r={4} fill={accent} />
      <text
        x={g.plot.right + 10}
        y={g.end.y + 5}
        fill={accent}
        fontSize={layout.label.fontSize}
        fontWeight={layout.label.fontWeight}
      >
        {endLabel}
      </text>

      {/* Interaction layer: every reading, not just the ones the static frame had room to label.
          Invisible at rest (`fill="transparent"`) — `.pt` only becomes visible in `:hover`/
          `:focus`/`.pt-active`, and only in `muted`, never the accent
          (`web-discipline.md`, "What must not become interactive"). `tabIndex={0}` on every point,
          not a roving `-1`/`0` pair: a screen reader or keyboard user gets to every one of these
          75 readings with Tab alone, with no dependency on the inline script running at all — see
          "Keyboard and touch". */}
      {g.points.map((p) => (
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
          aria-label={`${p.year} : ${fr(p.mt)} ${UNIT}`}
          data-year={p.year}
          data-detail={`${p.year} · ${fr(p.mt)} ${UNIT}`}
        />
      ))}
      <rect
        className="hit-area"
        x={g.plot.left}
        y={g.plot.top}
        width={g.plot.right - g.plot.left}
        height={g.plot.bottom - g.plot.top}
        fill="transparent"
        pointerEvents="all"
      />
    </svg>
  );
}
