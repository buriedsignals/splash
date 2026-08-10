/**
 * The web beat of "Life expectancy in Switzerland rose 15 years since 1950" — the interactive
 * genre.
 *
 * SECOND BUILD, migrated to the FLUID FRAME this genre now teaches
 * (`chart-web/assets/ChartWebSeed.tsx`, `references/web-discipline.md` "Responsive
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
 * `#shared/chart-beat/render-still.mjs` directly, neither of which fits this genre's
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
  ENTRANCE_EASING,
  LABEL_FADE_MS,
  WEB_ENTRANCE,
  atProgress,
  endOf,
  entranceClipId,
  entranceLayer,
} from "../../skills/chart-web/assets/entrance.ts";
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

  // ── THE ENTRANCE. The five events of `chart-web/assets/entrance.ts`, in the video's own order.
  //
  // WHAT THIS BEAT DECIDED, which is the half no script can do for it. The claim is *"life
  // expectancy rose 15 years since 1950"*, and a rise of fifteen years is a statement about two
  // heights, so:
  //
  //   - THE REFERENCE is the dashed 1950 rule. It is not a generic first-reading default here — the
  //     claim is measured from it, so it has to be on screen, alone, before any evidence arrives.
  //   - THE SUBJECT is the 2023 reading, the far end of that rise. It lands as its own event, and
  //     the conclusion is its own value in words (`Suisse 84.0 (2023)`), stated once it has landed.
  //   - THE CROSSING MARKER — "first year past 80" — is a note on a READING, so it is gated on the
  //     wipe's head reaching that reading's own x, plus the video's own 0.06-of-the-reveal lag. That
  //     delay is DERIVED from this beat's geometry and moves if the data does; nothing about it is
  //     typed. It is the label rule (`doctrine/references/motion-grammar.md`: a label's reveal gates
  //     on its own mark, never on a master clock).
  //
  // The reveal is linear because the x axis IS time — 74 annual readings, evenly spaced — so easing
  // it would give some years more screen time than others, which is a lie about the pace of the
  // data. The head advances in x across the whole `viewBox`, and `POINT_INSET` means the curve
  // itself starts 6 units in; that only means the first fraction of the wipe crosses empty ground,
  // which is the same margin the eye reads as the plot's own edge.
  const revealHeadAt = (atX: number) =>
    atProgress(WEB_ENTRANCE.reveal, atX / frame.width);
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
  const revealLayer = entranceLayer("reveal", "wipe", {
    delay: WEB_ENTRANCE.reveal.start,
    duration: WEB_ENTRANCE.reveal.duration,
    ease: ENTRANCE_EASING.LINEAR,
  });
  const crossingMarkLayer = crossingPoint
    ? entranceLayer("reveal", "fade", {
        delay: revealHeadAt(crossingPoint.x),
        duration: LABEL_FADE_MS,
        ease: ENTRANCE_EASING.ARRIVE,
      })
    : null;
  const crossingLabelLayer = crossingPoint
    ? entranceLayer("reveal", "fade", {
        delay:
          revealHeadAt(crossingPoint.x) + 0.06 * WEB_ENTRANCE.reveal.duration,
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
  // Unique per beat: two of these files can land in one article and `url(#id)` takes the FIRST
  // match in document order, so a shared id would make one figure's entrance drive the other's clip.
  const revealClipId = entranceClipId(title);
  // Asserted rather than left to a reader: a DERIVED delay can overrun the contract even when the
  // contract itself is legal, because half of them come from the data. The crossing label is the
  // latest thing this beat derives.
  const lastDerivedEnd = crossingLabelLayer
    ? revealHeadAt(crossingPoint!.x) +
      0.06 * WEB_ENTRANCE.reveal.duration +
      LABEL_FADE_MS
    : 0;
  if (lastDerivedEnd > endOf(WEB_ENTRANCE.conclusion))
    throw new Error(
      `the crossing label's derived arrival ends at ${Math.round(lastDerivedEnd)}ms, after the ` +
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
      <div
        className="chart-header"
        {...furnitureLayer().attrs}
        style={furnitureLayer().vars}
      >
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

        {/* GEOMETRY ONLY below — no `<text>` at all. `preserveAspectRatio="none"` lets this stretch
            to exactly whatever box the grid gives it at any container width. */}
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
          {/* `role="group"`, not `role="img"` — see `SlopeWeb.tsx`'s note: the reason recorded here
              was measured and is not what Chrome does, and `group` names the graphic without
              raising the question. `<desc>` still carries the alt text. */}
          <desc>{alt}</desc>
          <rect
            x={0}
            y={0}
            width={frame.width}
            height={frame.height}
            fill={ground}
          />

          {/* The gridlines are FURNITURE and arrive with the axis labels beside them, on ONE clock —
              a single `<g>` rather than a fade per line, which is the video's own rule: title,
              source, axis, ticks, gridlines come up together and then never move again. */}
          <g {...furnitureLayer().attrs} style={furnitureLayer().vars}>
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
          </g>

          {/* THE REFERENCE, laid down left to right before any evidence — `scaleX` from this line's
              own `x1` of 0. `non-scaling-stroke` keeps the dash pattern in screen units while it
              grows, so the dashes do not compress as the rule lengthens. */}
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

          {/* THE REVEAL — the curve uncovered left to right by a clip whose rect grows from x=0, the
              same picture frame for frame as the video's `drawnSoFar` since the years ascend and the
              head advances monotonically in x. A CLIP and not a `stroke-dashoffset`: that form was
              measured under this genre's own `non-scaling-stroke` + `preserveAspectRatio="none"`
              and came back 99 % drawn at t=0 (`chart-web/scripts/render-web.mjs`, `entranceCss`).
              ONLY THE VISIBLE STROKE IS CLIPPED — the `.pt` targets and the `.hit-area` below stay
              outside it, so hover, tap and keyboard answer for all 74 readings from the first
              millisecond. The entrance is an addition to a page that already works. */}
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
            <path
              d={path}
              fill="none"
              stroke={accent}
              strokeWidth={2.5}
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          </g>

          {/* The crossing MARK sits OUTSIDE the reveal's clip and fades in at the instant the head
              passes its own x — the video's mechanism exactly. A circle uncovered by a vertical wipe
              would arrive as two half-moons, which is a head's look on a stroke and nothing's look
              on a dot. */}
          {crossingPoint && crossingMarkLayer && (
            <circle
              {...crossingMarkLayer.attrs}
              style={crossingMarkLayer.vars}
              cx={crossingPoint.x}
              cy={crossingPoint.y}
              r={3}
              fill={muted}
            />
          )}
          {/* THE SUBJECT, landing as its own event once the curve has reached it. Drawn at (0, 0)
              inside a `<g>` carrying the translate, so `transform: scale()` grows it about its own
              centre — no `transform-origin` percentage and no `transform-box` question, the two
              things that resolve differently across engine versions. */}
          <g transform={`translate(${end.x} ${end.y})`}>
            <circle
              {...subjectLayer.attrs}
              style={subjectLayer.vars}
              cx={0}
              cy={0}
              r={4}
              fill={accent}
            />
          </g>

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
            {...referenceLabelLayer.attrs}
            className="note"
            style={{
              ...referenceLabelLayer.vars,
              left: "100%",
              top: `${pct(referenceY, frame.height)}%`,
              transform: "translate(-100%, -100%) translateY(-4px)",
              color: muted,
            }}
          >
            {referenceYear} level
          </span>
          {crossingPoint && crossingLabelLayer && (
            <span
              {...crossingLabelLayer.attrs}
              className="note"
              style={{
                ...crossingLabelLayer.vars,
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
            {...conclusionLayer.attrs}
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
