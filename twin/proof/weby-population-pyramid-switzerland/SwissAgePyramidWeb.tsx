/**
 * The web beat of "Switzerland's population bulges at ages 55-59, not among the youngest" — a
 * population pyramid, not a line or a scatter. Coordinates and formatting come from
 * `./pyramid-geometry.ts`; this file adds the one thing neither the static frame
 * (`proof/static-swiss-age-pyramid/SwissAgePyramid.tsx`) nor a video build has — a reader who can
 * ask any of the 21 age bands what its EXACT figures are, for both sexes at once, and get an answer
 * back, without anything the static frame already states being gated behind that ask.
 *
 * Read `twin-chart-web/references/web-discipline.md` and
 * `twin-chart-beat/references/types/population-pyramid.md` before changing this file.
 *
 * The structural difference from every other web beat built so far (a line, a scatter): the
 * interactive unit here is neither a point nor a circle, it is a whole ROW — one hit-rect per age
 * band, spanning the FULL plot width (both sides of the mirror plus the central gutter), sized to
 * that band's own row slot (`pyramidGeometry`'s `hitY`/`hitHeight`, edge-to-edge with its
 * neighbours, no dead zones between bars). A pointer or a tap anywhere in a row — over either bar,
 * over the gutter, over the gap between bars — resolves to that row's own reading, both sexes at
 * once, because the pyramid's own claim (which AGE is widest) is a per-row question, not a per-side
 * one. This is why `pyramid-interaction.mjs` needs neither the line genre's x-nearest resolution nor
 * the scatter's 2D-nearest resolution: the rows already tile the plot exactly, so each row's own
 * native pointer events are enough.
 *
 * `WebLayout` lives here, not imported from `twin-chart-web/assets/ChartWebSeed.tsx` — the "duplicate,
 * do not link" ruling that file's own doc-comment states applies here exactly as it does to
 * `proof/web-income-life-expectancy/IncomeLifeExpectancyWeb.tsx`'s own `ScatterLayout`.
 *
 * Two layouts, not a continuous reflow (`web-discipline.md`, "Responsive behaviour"): each is its
 * own call to this component, SSR'd once at build time. The frame's total height is DERIVED, not a
 * fixed guess — see `rowHeight` below and its own doc-comment.
 *
 * This component never imports the rasteriser: `ink`/`muted`/`grid`/`measure` below are props,
 * derived once in node by `twin-chart-web/scripts/render-web.mjs`'s `renderWeb`, called from this
 * beat's own `render-web.mjs`.
 */

import {
  exactCount,
  pyramidGeometry,
  thousands,
  type Band,
} from "./pyramid-geometry";

type Measure = (
  text: string,
  font: { fontSize: number; fontWeight?: number },
) => number;

export type WebLayout = {
  name: "desktop" | "narrow";
  width: number;
  pad: number;
  title: { fontSize: number; fontWeight: number; lead: number };
  /** The caveat line under the title — "age bands run in their natural sequence" — wrapped the same
   *  way the title is. */
  subtitle: { fontSize: number; fontWeight: number; lead: number };
  source: { fontSize: number; fontWeight: number; lead: number };
  legend: { fontSize: number; fontWeight: number };
  axis: { fontSize: number };
  bandLabel: { fontSize: number };
  /** The peak annotation's own label. */
  note: { fontSize: number; fontWeight: number };
  /** How many round ticks `magnitude.ticks` is hinted to produce on each mirrored half-axis. */
  xTickHint: number;
  /** Horizontal padding either side of the widest age-band label, inside the reserved central
   *  gutter — the gutter's own width is MEASURED from the real label strings plus this padding
   *  (`bandGutter` below), never a fixed guess, because a fixed number is exactly what clipped a
   *  label the first time this genre's own line beat was driven (`web-discipline.md`'s own header
   *  note). */
  bandLabelPad: number;
  /** Pixel height of one age band's own row. Together with the data's own band count, this is what
   *  DERIVES the frame's plot height — never a fixed `plotMinHeight` guessed to be tall enough, the
   *  same invariant `ChartWebSeed.tsx` keeps for its header block: the plot's own extent is computed
   *  from real inputs (here, `bands.length * rowHeight`), so a beat with more or fewer age bands
   *  than this one's 21 never silently clips or leaves dead space. */
  rowHeight: number;
  bottomPad: number;
};

export const DESKTOP_LAYOUT: WebLayout = {
  name: "desktop",
  width: 900,
  pad: 40,
  title: { fontSize: 24, fontWeight: 700, lead: 30 },
  subtitle: { fontSize: 14, fontWeight: 400, lead: 20 },
  source: { fontSize: 14, fontWeight: 400, lead: 19 },
  legend: { fontSize: 13, fontWeight: 600 },
  axis: { fontSize: 12 },
  bandLabel: { fontSize: 11 },
  note: { fontSize: 12, fontWeight: 700 },
  xTickHint: 4,
  bandLabelPad: 14,
  rowHeight: 30,
  bottomPad: 40,
};

export const NARROW_LAYOUT: WebLayout = {
  name: "narrow",
  width: 360,
  pad: 18,
  title: { fontSize: 17, fontWeight: 700, lead: 22 },
  subtitle: { fontSize: 11, fontWeight: 400, lead: 15 },
  source: { fontSize: 10, fontWeight: 400, lead: 14 },
  legend: { fontSize: 11, fontWeight: 600 },
  axis: { fontSize: 9 },
  bandLabel: { fontSize: 8.5 },
  note: { fontSize: 9.5, fontWeight: 700 },
  xTickHint: 3,
  bandLabelPad: 8,
  rowHeight: 17,
  bottomPad: 30,
};

export const LAYOUTS: WebLayout[] = [DESKTOP_LAYOUT, NARROW_LAYOUT];

/** Two hues a colour-vision-deficient reader can tell apart, checked as a pair
 *  (`population-pyramid.md`) — the same fixed pair the static beat uses. Not derived from `ground`:
 *  a sex/group encoding is a categorical distinction, not a magnitude, so it stays put regardless of
 *  the newsroom's own ground colour, the same way the static beat's own `COLOURS` do. */
const COLOURS = { male: "#0072B2", female: "#D55E00" };

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

export function SwissAgePyramidWeb({
  bands,
  title,
  limits,
  source,
  alt,
  ground,
  accent,
  peakBand,
  peakLabel,
  ink,
  muted,
  grid,
  measure,
  layout,
}: {
  bands: Band[];
  title: string;
  limits: string;
  source: string;
  alt: string;
  ground: string;
  /** Nominal only — this beat carries no single semantic accent (the two sexes' own fixed hues
   *  carry the highlight), but `renderWeb`'s shared CSS shell always emits a `--accent` custom
   *  property, so a real, defined colour is supplied rather than leaving it `undefined`. Unused by
   *  any rule this beat's own CSS or markup writes. */
  accent: string;
  peakBand: string;
  peakLabel: string;
  ink: string;
  muted: string;
  grid: string;
  measure: Measure;
  layout: WebLayout;
}) {
  if (bands.length < 3)
    throw new Error(
      `a population pyramid beat needs at least three age bands, got ${bands.length}`,
    );

  const { width, pad } = layout;

  const titleLines = wrap(title, width - pad * 2, layout.title, measure);
  const titleBaseline = pad + layout.title.fontSize;
  const limitsLines = wrap(limits, width - pad * 2, layout.subtitle, measure);
  const limitsBaseline =
    titleBaseline +
    (titleLines.length - 1) * layout.title.lead +
    Math.round(layout.title.lead * 0.9);
  const sourceLines = wrap(source, width - pad * 2, layout.source, measure);
  const sourceBaseline =
    limitsBaseline +
    (limitsLines.length - 1) * layout.subtitle.lead +
    Math.round(layout.subtitle.lead * 1.1);
  const legendBaseline =
    sourceBaseline +
    (sourceLines.length - 1) * layout.source.lead +
    Math.round(layout.source.lead * 1.3);

  // The frame's total height is derived from the header block above (already fixed) plus the
  // data's own band count times this layout's own row height, plus the bottom margin — never a
  // fixed constant. A beat with more or fewer than 21 bands changes the frame's height, not its
  // legibility.
  const plotTop = legendBaseline + Math.round(layout.title.lead * 0.7);
  const plotBottom = plotTop + bands.length * layout.rowHeight;
  const height = plotBottom + layout.bottomPad;

  // The central gutter is MEASURED from the widest age-band label that will actually be drawn in
  // it, plus this layout's own padding either side — never a fixed guess (see `WebLayout.bandGutter`
  // — sorry, `bandLabelPad`'s own doc-comment for why a fixed number is exactly the defect class
  // this genre's own header note warns about).
  const bandGutter =
    Math.max(...bands.map((b) => measure(b.ageBand, layout.bandLabel))) +
    layout.bandLabelPad * 2;

  const padding = {
    top: plotTop,
    right: pad + 8,
    bottom: layout.bottomPad,
    left: pad + 8,
  };

  const { plot, centerX, bars, ticksLeft, ticksRight } = pyramidGeometry(
    bands,
    { width, height, padding, bandGutter, xTickHint: layout.xTickHint },
  );

  const peak = bars.find((b) => b.ageBand === peakBand);

  // Visual top-to-bottom order (oldest band at the top, per `pyramidGeometry`'s own reversed
  // domain) — DOM/tab order for the hit-rects below follows this same order, so `ArrowUp`/
  // `ArrowDown` in `pyramid-interaction.mjs` moves focus in the direction a sighted reader would
  // expect: up the frame to older bands, down to younger ones.
  const rowsTopToBottom = [...bars].sort((a, b) => a.y - b.y);

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
          accessibility pattern (`web-discipline.md`): the per-row rects below need to stay
          individually reachable and named. */}
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

      <rect
        x={centerX - 180}
        y={legendBaseline - 10}
        width={11}
        height={11}
        fill={COLOURS.male}
      />
      <text
        x={centerX - 164}
        y={legendBaseline}
        fill={ink}
        fontSize={layout.legend.fontSize}
        fontWeight={layout.legend.fontWeight}
      >
        Men
      </text>
      <rect
        x={centerX + 30}
        y={legendBaseline - 10}
        width={11}
        height={11}
        fill={COLOURS.female}
      />
      <text
        x={centerX + 46}
        y={legendBaseline}
        fill={ink}
        fontSize={layout.legend.fontSize}
        fontWeight={layout.legend.fontWeight}
      >
        Women
      </text>

      {/* Tick labels on BOTH magnitude axes read as positive numbers — the left side is a group,
          not a negative quantity (`references/types/population-pyramid.md`). Both are the rounded
          thousands the static frame prints unconditionally; the exact figure lives only in each
          row's own `data-detail`, on demand. */}
      {ticksLeft.map((t) => (
        <g key={`l-${t.value}`}>
          <line
            x1={t.x}
            x2={t.x}
            y1={plot.top}
            y2={plot.bottom}
            stroke={grid}
            strokeWidth={1}
          />
          <text
            x={t.x}
            y={plot.bottom + 16}
            fill={muted}
            fontSize={layout.axis.fontSize}
            textAnchor="middle"
          >
            {thousands(t.value)}
          </text>
        </g>
      ))}
      {ticksRight.map((t) => (
        <g key={`r-${t.value}`}>
          <line
            x1={t.x}
            x2={t.x}
            y1={plot.top}
            y2={plot.bottom}
            stroke={grid}
            strokeWidth={1}
          />
          <text
            x={t.x}
            y={plot.bottom + 16}
            fill={muted}
            fontSize={layout.axis.fontSize}
            textAnchor="middle"
          >
            {thousands(t.value)}
          </text>
        </g>
      ))}
      <line
        x1={centerX}
        x2={centerX}
        y1={plot.top}
        y2={plot.bottom}
        stroke={muted}
        strokeWidth={1}
      />

      {bars.map((b) => (
        <g key={b.ageBand}>
          <rect
            x={b.male_.x}
            y={b.y}
            width={b.male_.width}
            height={b.height}
            fill={COLOURS.male}
          />
          <rect
            x={b.female_.x}
            y={b.y}
            width={b.female_.width}
            height={b.height}
            fill={COLOURS.female}
          />
          {/* The age-band label sits in the reserved central gutter, never printed over a bar. */}
          <text
            x={centerX}
            y={b.centerLabelY + 4}
            fill={muted}
            fontSize={layout.bandLabel.fontSize}
            textAnchor="middle"
          >
            {b.ageBand}
          </text>
        </g>
      ))}

      {/* The peak annotation: unconditional, drawn regardless of interaction — the argument, not a
          reveal (`web-discipline.md`, "What must not become interactive"). It names the band but
          stays silent on its own exact figure, the same restraint the static frame keeps; the exact
          figure is still reachable on that row's own hover/tap/keyboard focus below, because "do not
          restate on the frame" and "do not answer on request" are not the same rule
          (`web-discipline.md`, "What hover reveals"). */}
      {peak && (
        <g>
          <line
            x1={plot.left}
            x2={peak.male_.x}
            y1={peak.centerLabelY}
            y2={peak.centerLabelY}
            stroke={ink}
            strokeWidth={1}
            strokeDasharray="3 3"
          />
          <text
            x={plot.left}
            y={peak.centerLabelY - 8}
            fill={ink}
            fontSize={layout.note.fontSize}
            fontWeight={layout.note.fontWeight}
          >
            {peakLabel}
          </text>
        </g>
      )}

      {/* Interaction layer — one hit-rect per AGE BAND (not per side), spanning the full plot width
          (both sides of the mirror plus the central gutter) and that band's own full row slot
          (`hitY`/`hitHeight`, edge-to-edge with its neighbours, see `pyramid-geometry.ts`'s own
          doc-comment). Every row is `tabIndex={0}` with its own `aria-label`/`data-detail` baked in
          at build time — reachable by plain Tab with `pyramid-interaction.mjs` absent entirely.
          `data-detail` states BOTH sexes' EXACT figures for that band, the reading the static frame
          had no room to print for any of its 42 numbers. `fill="transparent"` at rest;
          `pyramid-interaction.mjs` and its own CSS only ever toggle these rects' own class and the
          shared `#tooltip` — never anything drawn above. */}
      {rowsTopToBottom.map((b) => {
        const isPeak = b.ageBand === peakBand;
        const men = exactCount(b.male);
        const women = exactCount(b.female);
        const detail = `${b.ageBand}${isPeak ? " (widest band)" : ""}: men ${men} · women ${women}`;
        const ariaLabel = `Age ${b.ageBand}${isPeak ? ", the widest band" : ""}: ${men} men, ${women} women`;
        return (
          <rect
            key={b.ageBand}
            className="row-hit"
            x={plot.left}
            y={b.hitY}
            width={plot.right - plot.left}
            height={b.hitHeight}
            fill="transparent"
            pointerEvents="all"
            tabIndex={0}
            role="img"
            aria-label={ariaLabel}
            data-band={b.ageBand}
            data-detail={detail}
          />
        );
      })}
    </svg>
  );
}
