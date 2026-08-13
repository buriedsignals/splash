/**
 * The web beat of "CO₂ suisse, retour au niveau de 1967" — the interactive format.
 *
 * Not a second chart: the coordinates and the number formatting come from
 * `./crossing-geometry.ts`, the same pure core the static beat (`EmissionsLine.tsx`, this same
 * directory) and the video beat (`chart-video/assets/EmissionsVideo.tsx`) already share. What
 * this file adds is the one thing neither of those formats has — a reader who can ask the chart a
 * question and get an answer back, without anything the static frame already states being gated
 * behind that ask. Read `chart-web/references/web-discipline.md` for the rules this file is
 * written under before changing it.
 *
 * MIGRATED TO THE FLUID FRAME. This file used to ship TWO pre-rendered widths (900px and 360px)
 * swapped by a CSS media query, and handed the skill's generic `renderWeb` a `LAYOUTS` array. The
 * owner overturned that design: a web beat fills its container continuously, and it fits the
 * visible window. Both are now true here, by the separation `chart-web/assets/ChartWebSeed.tsx`
 * teaches and this file follows:
 *
 *   1. The `<svg>` carries GEOMETRY ONLY — no `<text>` element at all. It is stretched by ordinary
 *      responsive SVG (`viewBox` + `preserveAspectRatio="none"`), so the browser's own layout
 *      engine does the proportional maths on every resize, continuously, for free.
 *   2. Every WORD — title, caveat, source, the y and x axis labels, the reference/peak/end labels —
 *      is plain HTML positioned by `%` over the same CSS grid cell the `<svg>` occupies, at a FIXED
 *      pixel `font-size` that never tracks the `viewBox`. Geometry stretches; type does not.
 *   3. `.chart-figure` clamps to `100dvh` with the plot as the only shrinkable item, so the beat is
 *      one thing a reader looks at rather than a document they scroll through.
 *
 * `%` positions work because `pct()` below expresses each SVG coordinate as a fraction of the SAME
 * box the geometry was drawn in — the overlay `<div>` and the `<svg>` share one grid cell, so a
 * label tracks the mark it names at any container width.
 *
 * `deriveFurniture` and `measureText` are not called here. They live in
 * `chart-beat/scripts/render-still.mjs`, beside a native rasteriser
 * (`EmissionsVideo.tsx`'s own doc-comment explains why that module cannot be imported from a file
 * meant to run anywhere but node) — `render-web.mjs` derives the furniture and measures the one
 * gutter this format still measures (the y-axis label column) in node, and passes the results in as
 * props. `measure` below is that function, threaded in rather than imported.
 *
 * `wrap` is kept and still exported although this component no longer calls it (its furniture is
 * plain flowing HTML, which the browser wraps itself): `splash/test/helper-parity.test.ts`
 * cross-checks this copy against every other `wrap` in the repository, and deleting it would blind
 * that guard rather than satisfy it.
 */

import { tickStep } from "d3-array";
import {
  crossingGeometry,
  fr,
  yTickValues,
  type Reading,
} from "./crossing-geometry";

const UNIT = "Mt";

/** `WebFrame` describes the FORMAT's own mechanics — one continuously-fluid frame, its own tick
 *  hints, its own fixed type scale — rather than this story's numbers. It is declared here rather
 *  than imported from `chart-web/assets/ChartWebSeed.tsx`: a compile-time-only type has no
 *  `#shared/*` vendoring path to travel by, and a relative import reaching from a story across the
 *  skill boundary hard-codes this dev repository's own directory layout, which a real Splash root
 *  does not guarantee. Duplicate, do not link — the same ruling this file's own first build already
 *  documented for its `WebLayout`. */
export type WebFrame = {
  /** The plot rectangle's own canonical width/height, in SVG user units. NOT a rendered pixel size
   *  and NOT a cap: the `<svg>` is stretched to fill whatever box `.chart-plot`'s CSS grid gives
   *  it. This pair only fixes the geometry's internal proportions (which become one
   *  `aspect-ratio`) and the tick-density decision below, made once at this canonical size. */
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
  /** How many x ticks `tickStep` derives a round interval from. Picked ONCE, for the whole
   *  continuous width range this format now ships — tick density is not re-derived live as the frame
   *  resizes (`references/web-discipline.md`, "Responsive behaviour"). Four, not the seed's six:
   *  this beat spans 75 years, and a step of ten put eight year labels in the ~250px of plot a
   *  375px phone actually has, which overlapped. A step of twenty (1960/1980/2000/2020) is legible
   *  at every width this format verifies at — measured in a browser at 375px, not assumed. */
  xTickHint: number;
};

/** The format's own single, continuously-fluid frame — replaces this file's first build's
 *  `DESKTOP_LAYOUT`/`NARROW_LAYOUT` pair. One canonical geometry, stretched at render time. */
export const FRAME: WebFrame = {
  width: 900,
  height: 460,
  xAxisRowPx: 26,
  title: { fontSize: 24, fontWeight: 700 },
  subtitle: { fontSize: 14, fontWeight: 400 },
  source: { fontSize: 13, fontWeight: 400 },
  axis: { fontSize: 12 },
  label: { fontSize: 14, fontWeight: 600 },
  note: { fontSize: 12 },
  xTickHint: 4,
};

type Measure = (
  text: string,
  font: { fontSize: number; fontWeight?: number },
) => number;

/** Wrap on the measured width of the real string, never on a character count. Not called by
 *  `EmissionsWeb` any more — see this file's own doc-comment for why it is still exported. */
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
  for (const word of breakLongTokens(text.split(/\s+/), maxWidth, font, measure)) {
    const joiner = line.endsWith("-") ? "" : " ";
    const trial = line ? `${line}${joiner}${word}` : word;
    if (line && measure(trial, font) > maxWidth) {
      lines.push(line);
      line = word;
    } else line = trial;
  }
  return line ? [...lines, line] : lines;
}

/** The x-range is inset by this many SVG user units on each side, enough to clear the largest
 *  circle radius this beat draws, so the first/last reading's own mark is never clipped in half
 *  against the `viewBox` edge — an SVG clips to its `viewBox` by default, and at a stretched width
 *  that clip is invisible to everything except a screenshot. */
const POINT_INSET = 6;

/** A coordinate expressed as a percentage of the box it was drawn in, to one decimal — the one
 *  arithmetic step that lets an HTML label land on the exact spot the SVG geometry it annotates
 *  was drawn at, and keep landing there as the browser stretches that box. */
function pct(value: number, total: number): number {
  return total === 0 ? 0 : Math.round((value / total) * 1000) / 10;
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
  frame,
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
  frame: WebFrame;
  measure: Measure;
}) {
  if (data.length < 2)
    throw new Error(
      "a crossing beat needs at least two readings, got " + data.length,
    );

  // The plot rectangle IS the box: `[0, width] x [0, height]`, inset on x only so an end point's
  // own circle never clips. Gutters are CSS grid tracks around this box, never baked into the
  // viewBox — that is what lets the geometry stretch while the type beside it does not.
  const g = crossingGeometry(data, {
    width: frame.width,
    height: frame.height,
    padding: {
      top: 0,
      right: POINT_INSET,
      bottom: 0,
      left: POINT_INSET,
    },
    reference,
  });

  const path = g.points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");

  const last = data[data.length - 1];
  const endLabel = `${last.year} · ${fr(last.mt)} ${UNIT}`;

  const yTicks = yTickValues(data, reference);
  const topValue = Math.max(...yTicks);
  const tickLabels = yTicks.map((v) =>
    v === topValue ? `${fr(v, 0)} ${UNIT}` : fr(v, v === reference ? 1 : 0),
  );

  // The one place this component still measures anything: the y-axis label column is a real CSS
  // grid track (`--y-gutter`), sized to the widest label that will actually sit in it, at the axis
  // font's own FIXED size — measured, never a guessed constant, and never resized on the fly.
  const yGutterPx =
    10 + Math.max(...tickLabels.map((l) => measure(l, frame.axis)));

  const years = data.map((d) => d.year);
  const firstYear = Math.min(...years);
  const lastYear = Math.max(...years);
  const xStep = tickStep(firstYear, lastYear, frame.xTickHint);
  const xTicks: Array<{ year: number; x: number }> = [];
  for (
    let year = Math.ceil(firstYear / xStep) * xStep;
    year <= lastYear;
    year += xStep
  ) {
    const point = g.points.find((p) => p.year === year);
    if (point) xTicks.push({ year, x: point.x });
  }

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
        // Fixed CSS pixel type sizes, threaded as custom properties so the skill's own `buildCss`
        // stays generic — none of them ever changes with the viewBox's width.
        ["--title-size" as string]: `${frame.title.fontSize}px`,
        ["--title-weight" as string]: frame.title.fontWeight,
        ["--subtitle-size" as string]: `${frame.subtitle.fontSize}px`,
        ["--source-size" as string]: `${frame.source.fontSize}px`,
        ["--axis-size" as string]: `${frame.axis.fontSize}px`,
        ["--label-size" as string]: `${frame.label.fontSize}px`,
        ["--label-weight" as string]: frame.label.fontWeight,
        ["--note-size" as string]: `${frame.note.fontSize}px`,
      }}
    >
      {/* A fixed 22px of air under the header block. The seed gets this gap for free from its own
          filter control sitting between the two; this beat has no filter, and without the gap the
          top y-tick label (half a line above the plot box, by `.axis-label.y`'s own
          `translateY(-50%)`) and the peak's own label (which sits ABOVE its point, and its point
          sits near the top of the frame) both land on the caveat at a narrow width — measured in a
          browser at 375px, where "pic de 1973" printed straight through "aviation internationale".
          A fixed pixel value, not a fraction of the width: it is furniture, and furniture in this
          format does not stretch. */}
      <div className="chart-header" style={{ marginBottom: 22 }}>
        <h2 className="chart-title">{title}</h2>
        <p className="chart-caveat">{limits}</p>
      </div>

      <div
        className="chart-plot"
        style={{
          ["--y-gutter" as string]: `${yGutterPx}px`,
          ["--x-axis-h" as string]: `${frame.xAxisRowPx}px`,
          aspectRatio: `${totalWidth} / ${totalHeight}`,
        }}
      >
        <div className="y-axis">
          {g.ticksY.map((tick, i) => (
            <span
              key={tick.value}
              className="axis-label y"
              style={{ top: `${pct(tick.y, frame.height)}%`, color: muted }}
            >
              {tickLabels[i]}
            </span>
          ))}
        </div>

        {/* GEOMETRY ONLY below — no `<text>`. `preserveAspectRatio="none"` lets this stretch to
            fill exactly whatever box the grid gives it at any container width. */}
        <svg
          // Named `group`, not `img` — see the note in `SlopeWeb.tsx`: the root used to come back
          // from Chrome's AX tree as `SvgRoot` with `name: ""`, and `group` names it without
          // raising the ARIA children-presentational question `img` raises.
          role="group"
          aria-label={title}
          xmlns="http://www.w3.org/2000/svg"
          className="chart"
          viewBox={`0 0 ${frame.width} ${frame.height}`}
          preserveAspectRatio="none"
          fontFamily="Helvetica, Arial, sans-serif"
        >
          {/* Deliberately no `role="img"` on the root (unlike the static format): that role flattens
              every descendant into one opaque image for assistive tech, which is correct for a
              static beat and wrong for this one — the per-point circles below need to stay
              individually reachable and individually named. */}
          <desc>{alt}</desc>
          <rect
            x={0}
            y={0}
            width={frame.width}
            height={frame.height}
            fill={ground}
          />

          {g.ticksY.map((tick) =>
            // The reference's own row gets no regular gridline — the dashed reference rule below
            // already marks this height, and a second plain line there would read as clutter.
            tick.value === reference ? null : (
              <line
                key={tick.value}
                x1={0}
                x2={frame.width}
                y1={tick.y}
                y2={tick.y}
                stroke={grid}
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
            ),
          )}

          {/* The reference: a dashed rule, because it is a level somebody chose, not a
              measurement. Never gated behind interaction — see `web-discipline.md`, "What must not
              become interactive". */}
          <line
            x1={0}
            x2={frame.width}
            y1={g.referenceY}
            y2={g.referenceY}
            stroke={muted}
            strokeWidth={1}
            strokeDasharray="5 4"
            vectorEffect="non-scaling-stroke"
          />

          <path
            d={path}
            fill="none"
            stroke={accent}
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />

          {/* The peak is context, not the subject: muted, marked, and silent about its own value —
              identical to the static beat. Hover/focus on that year's own point still answers the
              exact figure if asked. */}
          <circle cx={g.peak.x} cy={g.peak.y} r={3} fill={muted} />
          <circle cx={g.end.x} cy={g.end.y} r={4} fill={accent} />

          {/* Interaction layer: every reading, not just the ones the frame has room to label.
              Invisible at rest (`fill="transparent"`) — `.pt` only becomes visible in `:hover`/
              `:focus`/`.pt-active`, and only in `muted`, never the accent. `tabIndex={0}` on every
              point, with its own `aria-label`/`data-detail` baked in at build time, so all 75
              readings are reachable with the inline script absent entirely. */}
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
            x={0}
            y={0}
            width={frame.width}
            height={frame.height}
            fill="transparent"
            pointerEvents="all"
          />
        </svg>

        {/* HTML overlay — the same grid cell as the `<svg>` above, so a `%` position lands on the
            exact point/line it annotates at any width. Never toggled by the script: the reference
            rule's label, the peak's own label and the end label are the argument, already stated
            (`web-discipline.md`, "What must not become interactive"). Each gets a small
            `--ground`-coloured chip (CSS) so it stays legible over whatever the line and the
            gridlines put behind it. */}
        <div className="overlay" aria-hidden="true">
          <span
            className="note reference-label"
            style={{
              left: "0%",
              top: `${pct(g.referenceY, frame.height)}%`,
              color: muted,
            }}
          >
            {referenceLabel}
          </span>
          <span
            className="note peak-label above"
            style={{
              left: `${pct(g.peak.x, frame.width)}%`,
              top: `${pct(g.peak.y, frame.height)}%`,
              color: muted,
            }}
          >
            {peakLabel}
          </span>
          <span
            className="end-label"
            style={{
              left: `${pct(g.end.x, frame.width)}%`,
              top: `${pct(g.end.y, frame.height)}%`,
              color: accent,
            }}
          >
            {endLabel}
          </span>
        </div>

        <div className="x-axis">
          {xTicks.map((tick) => (
            <span
              key={tick.year}
              className="axis-label x"
              style={{ left: `${pct(tick.x, frame.width)}%`, color: muted }}
            >
              {tick.year}
            </span>
          ))}
        </div>
      </div>

      <p className="chart-source">{source}</p>
    </figure>
  );
}
