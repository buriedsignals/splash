/**
 * The web beat of "Life expectancy in Switzerland rose 15 years since 1950" — the interactive
 * genre.
 *
 * SECOND BUILD, migrated to the FLUID FRAME this genre now teaches
 * (`twin-chart-web/assets/ChartWebSeed.tsx`, `references/web-discipline.md` "Responsive
 * behaviour"). Its first build SSR'd two pre-rendered rungs (900px and 360px) swapped by a media
 * query; the owner overturned that in favour of one continuously-adaptive frame, and the genre's
 * `renderWeb` no longer accepts a `layouts` array at all. The split that makes a continuous fill
 * safe: the `<svg>` below draws GEOMETRY ONLY — not one `<text>` element — and every word (title,
 * caveat, source, axis labels, the reference/crossing/end labels) is plain HTML positioned by `%`
 * over the same grid cell, at a FIXED pixel `font-size`. Geometry stretches with the container;
 * type never does.
 *
 * Not imported from the static sibling `proof/more-line-swiss-life-expectancy/LifeExpectancyLine.tsx`
 * either: that file bakes its words into SVG `<text>` and reaches for
 * `#shared/twin-chart-beat/render-still.mjs` directly, neither of which fits this genre's
 * geometry-only / props-supplied-furniture shape.
 *
 * What hover/tap/keyboard-focus adds here: the frame prints exactly three numbers — the 1950
 * reference (68.9), the year life expectancy first reached 80 (a muted marker, silent about its own
 * value), and the 2023 end label (84.0). Every one of the OTHER 71 annual readings between 1950 and
 * 2023 — including both COVID-era dips in 2020 and 2022 — has no printed value at all; hover, tap
 * or keyboard focus on any of the 74 points answers exactly that question, on demand, never printed
 * by default (`web-discipline.md`, "What hover reveals").
 *
 * `WebFrame` is declared here rather than imported from the skill's seed: it is a compile-time-only
 * type with no `#shared/*` vendoring path a story could reach, so this project's "duplicate, do not
 * link" ruling applies (the seed's own doc-comment gives the reasoning in full).
 */

import {
  chartGeometry,
  xTickValues,
  formatNumber,
  type Reading,
} from "./life-geometry";

type Measure = (
  text: string,
  font: { fontSize: number; fontWeight?: number },
) => number;

export type WebFrame = {
  /** The plot rectangle's own canonical proportions, in SVG user units — NOT a rendered pixel size
   *  and NOT a cap. The `<svg>` is stretched (`preserveAspectRatio="none"`) to fill whatever box
   *  `.chart-plot`'s grid gives it; this pair only fixes the shape that box grows and shrinks
   *  along, and the tick densities below, decided once at this canonical size. */
  width: number;
  height: number;
  /** Fixed CSS pixel row below the plot for the x-axis year labels — a grid track, not part of the
   *  `viewBox`, so its type never scales with it. */
  xAxisRowPx: number;
  title: { fontSize: number; fontWeight: number };
  subtitle: { fontSize: number; fontWeight: number };
  source: { fontSize: number; fontWeight: number };
  axis: { fontSize: number };
  label: { fontSize: number; fontWeight: number };
  note: { fontSize: number };
  yTickHint: number;
  xTickHint: number;
  /** A regular gridline whose own label would sit closer than this FRACTION of the plot's height to
   *  the reference rule's label is dropped. A fraction, not a canonical-unit constant, because the
   *  plot's rendered height changes continuously with its width: the seed's own 20-unit rule was
   *  written against one fixed rung and is wrong everywhere else. Measured: at 375px the plot is
   *  171px tall and a 12px label occupies ~14px of it, so two labels need at least 8.8% of the
   *  height between them or they collide — which they did, "68.9" printed straight through "70",
   *  caught by driving the rendered file at 375 and invisible at every wider width. */
  minGridlineGapFraction: number;
};

/** This beat's own frame. Squarer than the seed's 820x380 on purpose: the plot's height follows its
 *  width through `aspect-ratio`, so a flatter canonical box buys a taller chart at 1600px and a
 *  strip at 375px. Measured at 375px — a 293px-wide plot — this ratio draws 165px of plot where the
 *  seed's own would draw 133px. */
export const FRAME: WebFrame = {
  width: 760,
  height: 400,
  xAxisRowPx: 26,
  title: { fontSize: 24, fontWeight: 700 },
  subtitle: { fontSize: 14, fontWeight: 400 },
  source: { fontSize: 13, fontWeight: 400 },
  axis: { fontSize: 12 },
  label: { fontSize: 14, fontWeight: 600 },
  note: { fontSize: 12 },
  yTickHint: 5,
  xTickHint: 6,
  minGridlineGapFraction: 0.09,
};

/** Enough canonical units to clear the largest circle this frame draws (`.pt`'s r=5) so the first
 *  and last readings' own marks are never half-clipped against the `viewBox` edge — an SVG clips to
 *  its `viewBox`, and at any container width that clip is invisible to a unit test and obvious only
 *  in a screenshot. */
const POINT_INSET = 6;

/** `value / total` as a percentage to one decimal — the arithmetic that lets an HTML label land on
 *  the exact spot in the `<svg>` it annotates, expressed as a fraction of the SAME grid cell, so it
 *  tracks the geometry's continuous stretch for free. */
function pct(value: number, total: number): number {
  return total === 0 ? 0 : Math.round((value / total) * 1000) / 10;
}

/** Which way a label positioned at fraction `f` of the frame's width must hang so it stays inside
 *  the frame. Fluid-safe by construction: a clamp computed in canonical units would be right at one
 *  container width and wrong at every other, which is exactly the class of defect the two-rung
 *  design used to hide. */
function anchorAt(f: number): string {
  if (f < 0.15) return "translateX(0)";
  if (f > 0.85) return "translateX(-100%)";
  return "translateX(-50%)";
}

export function LifeExpectancyWeb({
  data,
  title,
  caveat,
  source,
  alt,
  ground,
  accent,
  subject,
  referenceYear,
  crossingYear,
  ink,
  muted,
  grid,
  measure,
  frame,
}: {
  data: Reading[];
  title: string;
  caveat: string;
  source: string;
  alt: string;
  ground: string;
  accent: string;
  subject: string;
  /** The level the reference rule holds the reader's eye against — this beat's own claim is
   *  measured from 1950, so the reference is 1950, not a generic "first reading" default. */
  referenceYear: number;
  /** The year life expectancy first reached 80, found by the story's own runner from the data
   *  (never hand-typed) — a muted marker, silent about its own value. */
  crossingYear: number;
  /** Derived from `ground` by `deriveFurniture` in the node runner that calls this component.
   *  Never derived in here, so there is one implementation of the colour rule per render. */
  ink: string;
  muted: string;
  grid: string;
  measure: Measure;
  frame: WebFrame;
}) {
  if (data.length < 2)
    throw new Error(
      `a line beat needs at least two readings, got ${data.length}`,
    );

  const last = data[data.length - 1];
  const endLabel = `${subject} ${formatNumber(last.value)} (${last.year})`;

  const referenceReading = data.find((d) => d.year === referenceYear);
  if (!referenceReading)
    throw new Error(`referenceYear ${referenceYear} is not in the data`);
  const referenceValue = referenceReading.value;

  const geometry = chartGeometry(data, {
    width: frame.width,
    height: frame.height,
    padding: {
      top: POINT_INSET,
      right: POINT_INSET,
      bottom: POINT_INSET,
      left: POINT_INSET,
    },
  });
  const { points, path, y } = geometry;

  // The reference's own y is known before the tick set is finalised — the only way to drop a
  // regular gridline that would otherwise sit a few pixels from the dashed reference rule and read
  // as noise.
  const referenceY = y(referenceValue);
  const minGridlineGap = frame.height * frame.minGridlineGapFraction;
  const regularTicks = y
    .ticks(frame.yTickHint)
    .filter((v) => Math.abs(y(v) - referenceY) >= minGridlineGap);
  const tickValues = [...regularTicks, referenceValue].sort((a, b) => a - b);
  const topValue = Math.max(...tickValues);
  // Round ticks (from d3's own `.ticks()`) print as whole numbers; the reference tick is the raw
  // 1950 reading itself (68.9133...), rounded to one decimal for display the same way every other
  // printed value in this beat is — an unrounded float here was a real defect caught by driving the
  // rendered file: "68.9133" printed next to the round "70"/"75"/"80" ticks.
  const tickLabels = tickValues.map((v) => {
    const label = Number.isInteger(v) ? `${v}` : formatNumber(v);
    return v === topValue ? `${label} years` : label;
  });

  // The one measurement left in this component: the y-axis label column is a real CSS grid track,
  // sized to the widest label that will actually sit in it, at the axis font's own fixed size.
  const yGutterPx =
    10 + Math.max(...tickLabels.map((l) => measure(l, frame.axis)));

  const crossingPoint = points.find((p) => p.year === crossingYear);
  const end = points[points.length - 1];
  const xTicks = xTickValues(
    data.map((d) => d.year),
    frame.xTickHint,
  );

  return (
    <figure
      className="chart-figure"
      style={{
        ["--ground" as string]: ground,
        ["--accent" as string]: accent,
        ["--ink" as string]: ink,
        ["--muted" as string]: muted,
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
      <div className="chart-header">
        <h2 className="chart-title">{title}</h2>
        <p className="chart-caveat">{caveat}</p>
      </div>

      <div
        className="chart-plot"
        style={{
          ["--y-gutter" as string]: `${yGutterPx}px`,
          ["--x-axis-h" as string]: `${frame.xAxisRowPx}px`,
          aspectRatio: `${yGutterPx + frame.width} / ${frame.height + frame.xAxisRowPx}`,
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

        {/* GEOMETRY ONLY below — no `<text>` at all. `preserveAspectRatio="none"` lets this stretch
            to exactly whatever box the grid gives it at any container width. */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="chart"
          viewBox={`0 0 ${frame.width} ${frame.height}`}
          preserveAspectRatio="none"
          fontFamily="Helvetica, Arial, sans-serif"
        >
          {/* No root role="img" — this genre's departure from the static genre's a11y pattern
              (`web-discipline.md`): every one of the 74 points below needs its own name. */}
          <desc>{alt}</desc>
          <rect
            x={0}
            y={0}
            width={frame.width}
            height={frame.height}
            fill={ground}
          />

          {tickValues.map((value) =>
            // The reference's own row gets no regular gridline — the dashed rule below already
            // marks that height.
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

          <path
            d={path}
            fill="none"
            stroke={accent}
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />

          {crossingPoint && (
            <circle
              cx={crossingPoint.x}
              cy={crossingPoint.y}
              r={3}
              fill={muted}
            />
          )}
          <circle cx={end.x} cy={end.y} r={4} fill={accent} />

          {/* Interaction layer: every one of the 74 readings is `tabIndex={0}` with its own
              `aria-label`/`data-detail` baked in at build time — reachable with the script absent
              entirely. `assets/interaction.mjs` (the skill's own, unmodified) wires hover/tap/
              keyboard via nearest-x resolution over the shared `.hit-area`. */}
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
              aria-label={`${p.year}: ${formatNumber(p.value)} years`}
              data-year={p.year}
              data-detail={`${p.year} · ${formatNumber(p.value)} years`}
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

        {/* HTML overlay — the same grid cell as the `<svg>`, so a `%` position lands on the exact
            point it annotates at any width. Never toggled by the script: the reference rule's
            label, the crossing marker's label and the subject's end label are the argument, already
            stated (`web-discipline.md`, "What must not become interactive"). */}
        <div className="overlay" aria-hidden="true">
          {/* Anchored at the RIGHT end of the dashed rule, not the left: 1950 IS this series' first
              reading, so the curve starts exactly at the reference height at the plot's left edge,
              and a label there collided with both the curve's own start and the y-axis tick label
              beneath it (caught by driving the rendered file, not hypothetical). The curve is well
              clear of the reference line by the right edge, for every year in this series. */}
          <span
            className="note"
            style={{
              left: "100%",
              top: `${pct(referenceY, frame.height)}%`,
              transform: "translate(-100%, -100%) translateY(-4px)",
              color: muted,
            }}
          >
            {referenceYear} level
          </span>
          {crossingPoint && (
            <span
              className="note"
              style={{
                left: `${pct(crossingPoint.x, frame.width)}%`,
                top: `${pct(crossingPoint.y, frame.height)}%`,
                transform: `${anchorAt(crossingPoint.x / frame.width)} translateY(-100%) translateY(-8px)`,
                color: muted,
              }}
            >
              first year past 80
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
          {xTicks.map((year) => {
            const p = points.find((pt) => pt.year === year);
            if (!p) return null;
            return (
              <span
                key={year}
                className="axis-label x"
                style={{
                  left: `${pct(p.x, frame.width)}%`,
                  color: muted,
                }}
              >
                {year}
              </span>
            );
          })}
        </div>
      </div>

      <p className="chart-source">{source}</p>
    </figure>
  );
}
